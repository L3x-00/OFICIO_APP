/**
 * UNIT — SubmitProfessionalMigrationDto.categoryIds transform.
 *
 * categoryIds llega por multipart como campo repetido SIN sufijo `[]`
 * (asi lo mandan movil y web). Multer/append-field solo arma un array a
 * partir de la SEGUNDA aparicion del campo: con una sola especialidad
 * (el caso mas comun), `value` llega como string escalar ('12'), no array.
 * Bug real: JSON.parse('12') da el numero 12 (no array) y la rama vieja
 * devolvia `value` sin envolver -> @IsArray() rechazaba con 400.
 */
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitProfessionalMigrationDto } from '../../src/professional-migrations/dto/submit-professional-migration.dto.js';

describe('SubmitProfessionalMigrationDto.categoryIds', () => {
  const base = { specialty: 'Ingeniería civil' };

  it('un solo id como string escalar (multipart con 1 especialidad) → array de 1', () => {
    const dto = plainToInstance(SubmitProfessionalMigrationDto, {
      ...base,
      categoryIds: '12',
    });
    expect(dto.categoryIds).toEqual([12]);
  });

  it('varios ids como array de strings (multipart con 2+) → array de numbers', () => {
    const dto = plainToInstance(SubmitProfessionalMigrationDto, {
      ...base,
      categoryIds: ['12', '30'],
    });
    expect(dto.categoryIds).toEqual([12, 30]);
  });

  it('JSON string de array (cliente que serializa a mano) → array de numbers', () => {
    const dto = plainToInstance(SubmitProfessionalMigrationDto, {
      ...base,
      categoryIds: '[12,30]',
    });
    expect(dto.categoryIds).toEqual([12, 30]);
  });

  it('CSV sin corchetes → array de numbers', () => {
    const dto = plainToInstance(SubmitProfessionalMigrationDto, {
      ...base,
      categoryIds: '12,30',
    });
    expect(dto.categoryIds).toEqual([12, 30]);
  });

  it('un solo id escalar pasa la validación completa del DTO (regresión end-to-end)', async () => {
    const dto = plainToInstance(SubmitProfessionalMigrationDto, {
      ...base,
      categoryIds: '12',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
