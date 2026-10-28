import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { PresenceService } from '../../common/presence/presence.service.js';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, PresenceService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
