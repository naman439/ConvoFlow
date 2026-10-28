import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service.js';
import { CreateDirectConversationDto } from './dto/create-direct-conversation.dto.js';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('direct')
  @ApiOperation({ summary: 'Create or get a direct conversation with another user' })
  async createDirect(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDirectConversationDto,
  ) {
    return this.conversationsService.createDirect(userId, dto);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group conversation' })
  async createGroup(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.conversationsService.createGroup(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getMyConversations(@CurrentUser('id') userId: string) {
    return this.conversationsService.getMyConversations(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiResponse({ status: 403, description: 'Not a member of this conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conversationsService.getById(id, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.conversationsService.markAsRead(id, userId);
  }
}
