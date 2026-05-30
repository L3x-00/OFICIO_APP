import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { AiUserRole } from '../ai-assistant.types.js';

/**
 * Payload del endpoint sandbox POST /ai-assistant/test (solo ADMIN).
 *
 * Permite a un admin probar el flujo COMPLETO simulando un rol arbitrario,
 * sin persistir en BD ni consumir cuota de límites (Fase 5).
 */
export class SandboxAiDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(2000, {
    message: 'El mensaje supera el máximo de 2000 caracteres',
  })
  message!: string;

  /** Rol a simular para el system prompt + filtrado de tools. */
  @IsOptional()
  @IsIn(['USUARIO', 'PROVEEDOR', 'ADMIN'])
  simulateRole?: AiUserRole;
}
