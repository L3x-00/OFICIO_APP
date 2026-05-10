import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Crea (o recupera) la sala de chat entre un cliente y un proveedor.
 * El servicio es idempotente: si ya existe una sala vigente, la devuelve.
 */
export class CreateChatRoomDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  clientId: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  providerId: number;
}
