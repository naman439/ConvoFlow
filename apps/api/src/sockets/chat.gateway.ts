import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { PresenceService } from '../common/presence/presence.service.js';
import { MessagesService } from '../modules/messages/messages.service.js';
import { KafkaService, TOPICS } from '../kafka/kafka.service.js';
import { UserStatus, MessageStatus } from '@prisma/client';

interface SocketUser {
  id: string;
  email: string;
  username: string;
  displayName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  // Track active socket connections per user
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly presenceService: PresenceService,
    private readonly messagesService: MessagesService,
    private readonly kafka: KafkaService,
  ) {}

  afterInit() {
    this.logger.log('🚀 Socket.IO Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth object, header, or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('jwt.secret');
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Fetch user from DB
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, username: true, displayName: true },
      });

      if (!user) {
        client.disconnect(true);
        return;
      }

      // Attach user to socket data
      client.data.user = user;

      // Track socket ID
      const userSockets = this.userSockets.get(user.id) || new Set<string>();
      userSockets.add(client.id);
      this.userSockets.set(user.id, userSockets);

      // Join user-specific personal room
      client.join(`user:${user.id}`);

      // Set user online
      await this.presenceService.setOnline(user.id);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ONLINE, lastSeenAt: new Date() },
      });

      // Broadcast presence
      this.server.emit('presence:update', {
        userId: user.id,
        status: 'ONLINE',
        lastSeenAt: new Date().toISOString(),
      });

      // Kafka event
      await this.kafka.publish(TOPICS.USER_ONLINE, {
        userId: user.id,
        username: user.username,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`🟢 User connected: ${user.username} (${client.id})`);
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${error.message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user as SocketUser | undefined;
    if (!user) return;

    const sockets = this.userSockets.get(user.id);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(user.id);

        // Mark offline
        await this.presenceService.setOffline(user.id);
        const lastSeen = new Date();
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.OFFLINE, lastSeenAt: lastSeen },
        });

        // Broadcast presence
        this.server.emit('presence:update', {
          userId: user.id,
          status: 'OFFLINE',
          lastSeenAt: lastSeen.toISOString(),
        });

        // Kafka event
        await this.kafka.publish(TOPICS.USER_OFFLINE, {
          userId: user.id,
          username: user.username,
          timestamp: lastSeen.toISOString(),
        });

        this.logger.log(`🔴 User offline: ${user.username}`);
      }
    }
  }

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data?.conversationId) return;

    // Verify membership
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: data.conversationId,
          userId: user.id,
        },
      },
    });

    if (member) {
      const room = `conversation:${data.conversationId}`;
      client.join(room);
      this.logger.debug(`User ${user.username} joined room ${room}`);
      return { status: 'joined', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage('conversation:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      const room = `conversation:${data.conversationId}`;
      client.leave(room);
      return { status: 'left', conversationId: data.conversationId };
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content: string;
      type?: 'TEXT' | 'IMAGE' | 'FILE';
    },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data?.conversationId || !data?.content) return;

    try {
      // Persist message in PostgreSQL & publish to Kafka / RabbitMQ
      const message = await this.messagesService.createMessage(
        data.conversationId,
        user.id,
        {
          content: data.content,
          type: data.type ?? 'TEXT',
        },
      );

      // Broadcast message:new to all members in conversation room
      const room = `conversation:${data.conversationId}`;
      this.server.to(room).emit('message:new', message);

      // Also deliver to sender's other sockets if any
      return { status: 'sent', message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data?.conversationId) return;

    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('typing:start', {
      conversationId: data.conversationId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data?.conversationId) return;

    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: user.id,
    });
  }

  @SubscribeMessage('message:read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; messageId?: string },
  ) {
    const user = client.data.user as SocketUser;
    if (!user || !data?.conversationId) return;

    const now = new Date();

    // Update lastReadAt for user
    await this.prisma.conversationMember.updateMany({
      where: {
        conversationId: data.conversationId,
        userId: user.id,
      },
      data: { lastReadAt: now },
    });

    if (data.messageId) {
      await this.prisma.message.update({
        where: { id: data.messageId },
        data: { status: MessageStatus.READ },
      });
    }

    const room = `conversation:${data.conversationId}`;
    this.server.to(room).emit('message:read', {
      conversationId: data.conversationId,
      userId: user.id,
      messageId: data.messageId,
      readAt: now.toISOString(),
    });
  }
}
