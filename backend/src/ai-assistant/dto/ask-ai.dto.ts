import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HISTORY_MAX_MESSAGES } from '../ai-assistant.constants.js';

/** Un turno del historial enviado por el cliente. */
export class AiHistoryTurnDto {
  @IsIn(['user', 'model'])
  role!: 'user' | 'model';

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text!: string;
}

/**
 * Payload de POST /ai-assistant/chat.
 *
 * `message` con tope de 2000 chars (protección de costos + abuso). El
 * `history` lo recorta el servicio igual (regla 6), pero limitamos el
 * array de entrada para no aceptar payloads enormes.
 */
export class AskAiDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(2000, {
    message: 'El mensaje supera el máximo de 2000 caracteres',
  })
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(HISTORY_MAX_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => AiHistoryTurnDto)
  history?: AiHistoryTurnDto[];

  /** Perfil de proveedor activo opcional para contextualizar respuestas. */
  @IsOptional()
  @IsIn(['OFICIO', 'NEGOCIO'])
  providerType?: 'OFICIO' | 'NEGOCIO';

  /**
   * Contexto/pantalla activa de la app cliente. Fuerza la Estrategia de
   * Contexto correspondiente (p.ej. `PROVIDER` desde el panel del proveedor),
   * por encima del rol genérico del JWT. `ADMIN` NO es forzable desde aquí
   * (escalada): solo se habilita vía el header `X-App-Origin: admin` + rol
   * verificado ADMIN.
   */
  @IsOptional()
  @IsIn(['GUEST', 'CLIENT', 'PROVIDER', 'ADMIN'])
  context?: 'GUEST' | 'CLIENT' | 'PROVIDER' | 'ADMIN';
}
