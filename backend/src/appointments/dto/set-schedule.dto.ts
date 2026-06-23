import { IsObject } from 'class-validator';

/**
 * Horario semanal de la agenda. Claves: lun, mar, mie, jue, vie, sab, dom.
 * Valor: rangos separados por coma "8:00-12:00,14:00-18:00". Un día ausente
 * o vacío = no disponible.
 */
export class SetScheduleDto {
  @IsObject()
  schedule: Record<string, string>;
}
