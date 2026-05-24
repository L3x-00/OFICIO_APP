import {
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChatMessageDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  chatRoomId: number;

  /**
   * El cliente envía senderId explícitamente. El servicio lo coteja contra
   * el JWT (req.user.userId) para evitar suplantación.
   */
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  senderId: number;

  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  @MaxLength(2000, { message: 'El mensaje supera los 2000 caracteres' })
  content: string;
}
