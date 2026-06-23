import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

/** Un par {id, order} para reordenar en lote. */
export class ReorderItem {
  @IsInt()
  id: number;

  @IsInt()
  @Min(0)
  order: number;
}

/** Body de reordenamiento en lote (drag & drop en el panel del proveedor). */
export class ReorderDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[];
}
