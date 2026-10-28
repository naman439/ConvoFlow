import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { UpdateMessageDto } from './dto/update-message.dto.js';
import { QueryMessagesDto } from './dto/query-messages.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.messagesService.getMessages(conversationId, userId, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  async createMessage(
    @Param('id') conversationId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(conversationId, userId, dto);
  }

  @Patch('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message updated' })
  async updateMessage(
    @Param('id') messageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.updateMessage(messageId, userId, dto);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  async deleteMessage(
    @Param('id') messageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagesService.deleteMessage(messageId, userId);
  }
}
