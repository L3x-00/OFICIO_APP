import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ChatService } from './chat.service.js';
import { CreateChatRoomDto } from './dto/create-chat-room.dto.js';
import { CreateChatMessageDto } from './dto/create-chat-message.dto.js';

/// Endpoints de admin para auditar conversaciones. Filtros soportados:
///   - providerType: OFICIO | NEGOCIO
///   - department / province / district (de la localidad del proveedor)
///   - activeWithin: 1 | 3 | 7 (días con actividad reciente)
@Controller('admin/chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminChatsController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  list(
    @Query('providerType') providerType?: string,
    @Query('department')   department?: string,
    @Query('province')     province?: string,
    @Query('district')     district?: string,
    @Query('activeWithin') activeWithin?: string,
    @Query('page')         page?: string,
    @Query('limit')        limit?: string,
  ) {
    return this.chat.adminList({
      providerType,
      department,
      province,
      district,
      activeWithin: activeWithin ? parseInt(activeWithin, 10) : undefined,
      page:  page  ? parseInt(page, 10)  : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // POST /chat/rooms — crea o recupera la sala (idempotente)
  @Post('rooms')
  createRoom(@Body() dto: CreateChatRoomDto) {
    return this.chat.getOrCreateRoom(dto.clientId, dto.providerId);
  }

  // POST /chat/messages — envía mensaje + push + WS
  @Post('messages')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendMessage(@Request() req: any, @Body() dto: CreateChatMessageDto) {
    return this.chat.sendMessage(req.user.userId, dto);
  }

  // GET /chat/rooms/mine — bandeja de entrada con último mensaje
  @Get('rooms/mine')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  myRooms(@Request() req: any) {
    return this.chat.getRoomsForUser(req.user.userId);
  }

  // GET /chat/rooms/:roomId/messages?page=1&limit=30 — historial paginado
  @Get('rooms/:roomId/messages')
  getRoomMessages(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() req: any,
  ) {
    return this.chat.getRoomMessages(roomId, req.user.userId, { page, limit });
  }

  // PATCH /chat/rooms/:roomId/read — marca como leídos los mensajes recibidos
  @Patch('rooms/:roomId/read')
  markRead(
    @Param('roomId', ParseIntPipe) roomId: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Request() req: any,
  ) {
    return this.chat.markRoomAsRead(roomId, req.user.userId);
  }
}
