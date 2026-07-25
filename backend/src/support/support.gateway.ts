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

type SocketData = {
  userId: number;
  role: UserRole;
  chatId?: number;
};

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/support' })
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly supportService: SupportService,
    private readonly presence: SupportPresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('No token provided');

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: 'SUPER_SECRET_KEY',
      });

      const data = client.data as SocketData;
      data.userId = payload.sub;
      data.role = payload.role;

      if (payload.role === UserRole.ADMIN) {
        await client.join('admins');
      } else {
        const chat = await this.supportService.getOrCreateChatForUser(
          payload.sub,
        );
        data.chatId = chat.id;
        await client.join(`chat:${chat.id}`);

        this.presence.markOnline(payload.sub);
        this.server
          .to('admins')
          .emit('support:presence', { userId: payload.sub, online: true });
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;

    if (data?.role === UserRole.USER && data.userId) {
      this.presence.markOffline(data.userId);
      this.server
        .to('admins')
        .emit('support:presence', { userId: data.userId, online: false });
    }
  }

  @SubscribeMessage('support:joinChat')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { chatId: number },
  ) {
    const data = client.data as SocketData;
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
    const content = body?.content?.trim();
    if (!content) return;

    const chatId = data.role === UserRole.ADMIN ? body?.chatId : data.chatId;
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
  }
}
