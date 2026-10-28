import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KafkaService, TOPICS } from '../../kafka/kafka.service.js';
import { RabbitMQService } from '../../rabbitmq/rabbitmq.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { QueryMessagesDto } from './dto/query-messages.dto.js';
import { MessageStatus } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafka: KafkaService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  async getMessages(conversationId: string, userId: string, query: QueryMessagesDto) {
    // Verify membership
    const membership = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    const limit = query.limit ?? 50;

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor },
          }
        : {}),
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
    });

    // Mark user's lastReadAt
    await this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: { lastReadAt: new Date() },
    });

    return {
      messages,
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
    };
  }

  async createMessage(conversationId: string, senderId: string, dto: CreateMessageDto) {
    // Verify membership & get members
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isMember = conversation.members.some((m) => m.userId === senderId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    // Persist message to PostgreSQL
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: dto.content,
        type: dto.type ?? 'TEXT',
        status: MessageStatus.SENT,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        attachments: true,
      },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Publish to Kafka (event-driven messaging)
    const sender = conversation.members.find((m) => m.userId === senderId)?.user;
    await this.kafka.publish(TOPICS.MESSAGE_CREATED, {
      id: message.id,
      conversationId,
      senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    });

    // Enqueue RabbitMQ background notification job for recipients
    const recipientIds = conversation.members
      .filter((m) => m.userId !== senderId)
      .map((m) => m.userId);

    if (recipientIds.length > 0) {
      await this.rabbitmq.sendNotificationJob({
        messageId: message.id,
        conversationId,
        senderId,
        senderName: sender?.displayName || 'User',
        recipientIds,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      });
    }

    return message;
  }

  async updateMessage(messageId: string, userId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Message deleted successfully' };
  }
}
