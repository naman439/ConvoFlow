import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto.js';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto.js';
import { PresenceService } from '../../common/presence/presence.service.js';

const MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  joinedAt: true,
  lastReadAt: true,
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      lastSeenAt: true,
    },
  },
};

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
  ) {}

  async createDirect(userId: string, dto: CreateDirectConversationDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    // Check target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if direct conversation already exists
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: dto.targetUserId } } },
        ],
      },
      include: { members: { select: MEMBER_SELECT } },
    });

    if (existing) {
      return this.enrichConversation(existing, userId);
    }

    // Create new direct conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: dto.targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: { select: MEMBER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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
        },
      },
    });

    return this.enrichConversation(conversation, userId);
  }

  async createGroup(userId: string, dto: CreateGroupConversationDto) {
    const memberIds = [...new Set([userId, ...dto.memberIds])];

    if (memberIds.length < 2) {
      throw new BadRequestException('Group must have at least 2 members');
    }

    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });

    if (users.length !== memberIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        name: dto.name,
        members: {
          create: memberIds.map((mid) => ({
            userId: mid,
            role: mid === userId ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
      include: {
        members: { select: MEMBER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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
        },
      },
    });

    return this.enrichConversation(conversation, userId);
  }

  async getMyConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: { select: MEMBER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { deletedAt: null },
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
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const enriched = await Promise.all(
      conversations.map((c) => this.enrichConversation(c, userId)),
    );

    return enriched;
  }

  async getById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { select: MEMBER_SELECT },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          where: { deletedAt: null },
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
        },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const isMember = conversation.members.some((m) => m.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a member of this conversation');

    return this.enrichConversation(conversation, userId);
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.ensureMember(conversationId, userId);

    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }

  async ensureMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    return member;
  }

  private async enrichConversation(conversation: any, currentUserId: string) {
    // For DIRECT conversations, find the "other" user
    let displayName = conversation.name;
    let displayAvatar = null;
    let otherUserId = null;

    if (conversation.type === 'DIRECT') {
      const otherMember = conversation.members.find(
        (m) => m.userId !== currentUserId,
      );
      if (otherMember) {
        displayName = otherMember.user.displayName;
        displayAvatar = otherMember.user.avatarUrl;
        otherUserId = otherMember.userId;
      }
    }

    // Enrich online status for members
    const membersWithPresence = await Promise.all(
      conversation.members.map(async (m) => ({
        ...m,
        user: {
          ...m.user,
          isOnline: await this.presence.isOnline(m.userId),
        },
      })),
    );

    const isOnline = otherUserId ? await this.presence.isOnline(otherUserId) : false;
    const lastMessage = conversation.messages?.[0] ?? null;

    return {
      id: conversation.id,
      type: conversation.type,
      name: displayName,
      avatarUrl: displayAvatar,
      isOnline,
      members: membersWithPresence,
      lastMessage,
      updatedAt: conversation.updatedAt,
      createdAt: conversation.createdAt,
    };
  }
}
