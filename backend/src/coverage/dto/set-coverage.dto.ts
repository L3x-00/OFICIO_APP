import { IsArray, IsInt, ArrayMaxSize } from 'class-validator';

export class SetCoverageDto {
  /** Distritos ADICIONALES al registrado (ids de localities). */
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(9) // tope duro: PREMIUM = 10 total − 1 registrado
  localityIds!: number[];
}
