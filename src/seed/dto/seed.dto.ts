import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsBooleanString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class SeedDto {
  @IsOptional()
  @IsBooleanString()
  clearDatabase?: boolean;

  @IsOptional()
  @IsBooleanString()
  users?: boolean;

  @IsOptional()
  @IsBooleanString()
  clients?: boolean;

  @IsOptional()
  @IsBooleanString()
  suppliers?: boolean;

  @IsOptional()
  @IsBooleanString()
  supplies?: boolean;

  @IsOptional()
  @IsBooleanString()
  employees?: boolean;

  @IsOptional()
  @IsBooleanString()
  crops?: boolean;

  @IsOptional()
  @IsBooleanString()
  harvests?: boolean;

  @IsOptional()
  @IsBooleanString()
  works?: boolean;

  @IsOptional()
  @IsBooleanString()
  sales?: boolean;

  @IsOptional()
  @IsBooleanString()
  shoppings?: boolean;

  @IsOptional()
  @IsBooleanString()
  consumptions?: boolean;

  @IsOptional()
  @IsBooleanString()
  modules?: boolean;

  @IsOptional()
  @IsBooleanString()
  adminUser?: boolean;
}

export class SeedControlledDto {
  /**
   * Número de usuarios a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  users?: number;

  /**
   * Número de clientes a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  clients?: number;

  /**
   * Número de proveedores a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  suppliers?: number;

  /**
   * Número de insumos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  supplies?: number;

  /**
   * Número de empleados a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  employees?: number;

  /**
   * Número de cultivos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  crops?: number;

  /**
   * Número de cosechas a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  harvests?: number;

  /**
   * Número de trabajos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  works?: number;

  /**
   * Número de ventas a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sales?: number;

  /**
   * Número de compras a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shoppings?: number;

  /**
   * Número de consumos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  consumptions?: number;
}
