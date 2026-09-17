import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { SupportService } from './support.service';
import { SupportPresenceService } from './support-presence.service';
import { SupportRateLimitService } from './support-rate-limit.service';
import { UserRole } from '../users/entities/user.entity';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { TelegramService } from '../telegram/telegram.service';
import { isValidGuestToken, type Identity } from '../common/identity.util';
import { corsOriginDelegate } from '../config/cors';
import { clientAddressOf } from '../config/proxy';

// userId is null for a guest — the chat itself is the handle we route by, and
// a guest's messages simply have no account behind them.
//
// `ready` resolves once the socket has been identified and put in its rooms.
// Socket.IO hands the client a `connect` event as soon as the transport is up,
// which is well before this gateway has finished its database round-trip — so
// anything sent in that window must wait for this rather than be dropped for
// having no chat yet.
// Long enough for anyone actually describing a problem, short enough that the
// TEXT column isn't a place to store arbitrary payloads.
const MAX_MESSAGE_LENGTH = 2000;

// Goes through the same rule as the HTTP throttler: forwarded headers are only
// believed when a proxy has actually been declared, because otherwise anyone
// can write one and hand themselves a private rate-limit bucket. This used to
// read x-forwarded-for unconditionally, which was exactly that hole.
function addressOf(client: Socket): string {
  return clientAddressOf({
    headers: client.handshake.headers,
    ip: client.handshake.address,
  });
}

type SocketData = {
  userId: number | null;
  role: UserRole;
  chatId?: number;
  // Who this socket is, kept so a customer's first message can create the
  // thread that connecting deliberately didn't.
  identity?: Identity;
  ready?: Promise<void>;
};

// Same origin policy as the HTTP side — the handshake is a browser request too.
@WebSocketGateway({
  cors: { origin: corsOriginDelegate },
  namespace: '/support',
})
export class SupportGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly supportService: SupportService,
    private readonly presence: SupportPresenceService,
    private readonly telegramService: TelegramService,
    private readonly rateLimit: SupportRateLimitService,
  ) {}

  // Two ways in: a JWT, or a guest token. The guest token is not a credential
  // and isn't treated as one — it only says which anonymous thread this socket
  // belongs to, exactly as it does for a cart.
  async handleConnection(client: Socket) {
    const data = client.data as SocketData;

    data.ready = this.identify(client).catch(() => {
      client.disconnect();
    });

    await data.ready;
  }

  private async identify(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      const guestToken = client.handshake.auth?.guestToken as
        | string
        | undefined;
      const data = client.data as SocketData;

      if (token) {
        // No secret override: the module's JwtModule is already configured with
        // the access-token key, and naming it again here is how it drifted out
        // of sync with auth.module in the first place.
        const payload = this.jwtService.verify<JwtPayload>(token);

        data.userId = payload.sub;
        data.role = payload.role;

        if (payload.role === UserRole.ADMIN) {
          await client.join('admins');
          return;
        }

        await this.joinOwnChat(client, { userId: payload.sub });
        return;
      }

      // Same shape check the HTTP side applies — the handshake is just another
      // place the token arrives from, and a socket that gets in on a garbage
      // token would sit in a chat room keyed by it.
      if (isValidGuestToken(guestToken)) {
        data.userId = null;
        data.role = UserRole.USER;

        await this.joinOwnChat(client, { guestToken });
        return;
      }

      throw new Error('No token provided');
    } catch {
      client.disconnect();
    }
  }

  // Connecting only finds an existing thread — it never starts one, or every
  // visitor who loads the site would appear in the admin's inbox having said
  // nothing. Someone with no chat yet simply has no room to join until they
  // write, which handleMessage takes care of.
  private async joinOwnChat(client: Socket, identity: Identity) {
    const data = client.data as SocketData;
    data.identity = identity;

    const chat = await this.supportService.findChat(identity);
    if (!chat) return;

    await this.enterChat(client, chat.id);
  }

  private async enterChat(client: Socket, chatId: number) {
    const data = client.data as SocketData;

    data.chatId = chatId;
    await client.join(`chat:${chatId}`);

    this.presence.markOnline(chatId);
    this.server.to('admins').emit('support:presence', { chatId, online: true });
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;

    this.rateLimit.releaseSocket(client.id);

    if (data?.role === UserRole.USER && data.chatId) {
      this.presence.markOffline(data.chatId);
      this.server
        .to('admins')
        .emit('support:presence', { chatId: data.chatId, online: false });
    }
  }

  // The moment a customer actually says something: the thread comes into
  // existence here, and the socket joins it so replies land straight away.
  private async startChat(client: Socket): Promise<number | undefined> {
    const data = client.data as SocketData;
    if (!data.identity) return undefined;

    const chat = await this.supportService.getOrCreateChat(data.identity);
    await this.enterChat(client, chat.id);

    return chat.id;
  }

  @SubscribeMessage('support:joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: number },
  ) {
    const data = client.data as SocketData;
    await data.ready;
    if (data.role !== UserRole.ADMIN || !body?.chatId) return;

    await client.join(`chat:${body.chatId}`);
    await this.supportService.markReadByAdmin(body.chatId);

    this.server.to('admins').emit('support:chatRead', { chatId: body.chatId });
  }

  @SubscribeMessage('support:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId?: number; content?: string },
  ) {
    const data = client.data as SocketData;
    // A message can arrive before the socket has been placed in its chat —
    // see SocketData.ready. Waiting here is what keeps a fast first message
    // from disappearing.
    await data.ready;

    // Nothing validates this body: the global ValidationPipe only sees HTTP
    // requests, and an inline type is erased at runtime. So the checks are
    // here, by hand.
    if (typeof body?.content !== 'string') return;

    const content = body.content.trim();
    if (!content) return;

    // support_messages.content is TEXT, and until now the only bound on what
    // went into it was how much a client felt like sending.
    if (content.length > MAX_MESSAGE_LENGTH) {
      client.emit('support:error', {
        message: `Повідомлення задовге — максимум ${MAX_MESSAGE_LENGTH} символів`,
      });
      return;
    }

    // Every message writes a row, can create a chat, and forwards to Telegram,
    // so an unmetered socket is a way to fill a table and hammer a third-party
    // API at once. Admins are exempt: they're authenticated staff, and a
    // throttled support desk is its own kind of outage.
    if (
      data.role !== UserRole.ADMIN &&
      !this.rateLimit.allowMessage(client.id, addressOf(client))
    ) {
      client.emit('support:error', {
        message: 'Забагато повідомлень. Зачекайте трохи.',
      });
      return;
    }

    const chatId =
      data.role === UserRole.ADMIN
        ? body?.chatId
        : (data.chatId ?? (await this.startChat(client)));
    if (!chatId) return;

    const { message, chat } = await this.supportService.addMessage(
      chatId,
      data.userId,
      data.role,
      content,
    );

    this.server.to(`chat:${chatId}`).emit('support:message', message);
    this.server
      .to('admins')
      .emit(
        'support:chatUpdate',
        this.supportService.toChatSummary(chat, message),
      );

    if (data.role === UserRole.USER) {
      const senderName = chat.user
        ? `${chat.user.firstName} ${chat.user.lastName}`.trim() ||
          chat.user.email
        : `Гість #${chat.id}`;
      this.telegramService
        .notifyAdmin(`💬 ${senderName} у підтримці:\n${content}`)
        .catch(() => {});
    }
  }
}
