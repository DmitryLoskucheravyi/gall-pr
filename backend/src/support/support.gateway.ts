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
import { UserRole } from '../users/entities/user.entity';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { TelegramService } from '../telegram/telegram.service';
import type { Identity } from '../common/identity.util';

// userId is null for a guest — the chat itself is the handle we route by, and
// a guest's messages simply have no account behind them.
//
// `ready` resolves once the socket has been identified and put in its rooms.
// Socket.IO hands the client a `connect` event as soon as the transport is up,
// which is well before this gateway has finished its database round-trip — so
// anything sent in that window must wait for this rather than be dropped for
// having no chat yet.
type SocketData = {
  userId: number | null;
  role: UserRole;
  chatId?: number;
  // Who this socket is, kept so a customer's first message can create the
  // thread that connecting deliberately didn't.
  identity?: Identity;
  ready?: Promise<void>;
};

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/support' })
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly supportService: SupportService,
    private readonly presence: SupportPresenceService,
    private readonly telegramService: TelegramService,
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
      const guestToken = client.handshake.auth?.guestToken as string | undefined;
      const data = client.data as SocketData;

      if (token) {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: 'SUPER_SECRET_KEY',
        });

        data.userId = payload.sub;
        data.role = payload.role;

        if (payload.role === UserRole.ADMIN) {
          await client.join('admins');
          return;
        }

        await this.joinOwnChat(client, { userId: payload.sub });
        return;
      }

      if (guestToken?.trim()) {
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
    this.server
      .to('admins')
      .emit('support:presence', { chatId, online: true });
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;

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

    const content = body?.content?.trim();
    if (!content) return;

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
      .emit('support:chatUpdate', this.supportService.toChatSummary(chat, message));

    if (data.role === UserRole.USER) {
      const senderName = chat.user
        ? `${chat.user.firstName} ${chat.user.lastName}`.trim() || chat.user.email
        : `Гість #${chat.id}`;
      this.telegramService
        .notifyAdmin(`💬 ${senderName} у підтримці:\n${content}`)
        .catch(() => {});
    }
  }
}
