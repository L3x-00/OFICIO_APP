import { Module } from '@nestjs/common';
import { ChatController, AdminChatsController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { EventsModule } from '../events/events.module.js';
import { FirebaseModule } from '../firebase/firebase.module.js';

@Module({
  imports: [EventsModule, FirebaseModule],
  controllers: [ChatController, AdminChatsController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
