import { UnitType } from '@/common/unit-conversion/unit-conversion.service';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsBooleanString,
  IsOptional,
  IsInt,
  Min,
  IsString,
  IsEnum,
  ValidateNested,
  IsArray,
  IsUUID,
  IsNumber,
  IsPositive,
  IsDateString,
} from 'class-validator';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { MethodOfPayment } from 'src/payments/entities/payment.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { DeepPartial } from 'typeorm';

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

export class HarvestOptionsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
  /**
   * Número de cosechas a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de cosechas.
   */
  @IsOptional()
  @IsEnum(['normal', 'advanced'])
  variant?: 'normal' | 'advanced';

  @IsOptional()
  @IsString()
  unitOfMeasure?: UnitType;

  // Parámetros para variant 'normal'
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityEmployees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valuePay?: number;

  // Parámetros para variant 'advanced'
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  cropId?: string;
}

export class WorkOptionsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
  /**
   * Número de trabajos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de trabajos.
   */
  @IsOptional()
  @IsEnum(['normal', 'forEmployee'])
  variant?: 'normal' | 'forEmployee';

  // Parámetros para variant 'normal'
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityEmployees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valuePay?: number;

  // Parámetros para variant 'forEmployee'
  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class SaleOptionsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
  /**
   * Número de ventas a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de ventas.
   */
  @IsOptional()
  @IsEnum(['normal', 'generic'])
  variant?: 'normal' | 'generic';

  // Parámetros para variant 'normal'
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  cropId?: string;

  @IsOptional()
  @IsBoolean()
  isReceivable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityPerSale?: number;

  // Parámetros para variant 'generic'
  @IsOptional()
  @IsBoolean()
  isReceivableGeneric?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityPerSaleGeneric?: number;
}

export class ShoppingOptionsDto {
  /**
   * Número de compras a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de compras.
   */
  @IsOptional()
  @IsEnum(['normal', 'extended'])
  variant?: 'normal' | 'extended';

  // Parámetros para variant 'normal'
  @IsOptional()
  @IsString()
  supplyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valuePay?: number;

  // Parámetros para variant 'extended'
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantitySupplies?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountForItem?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valuePayExtended?: number;
}

export class PaymentOptionsDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  /**
   * Número de pagos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de compras.
   */
  @IsOptional()
  @IsEnum(['normal', 'extended'])
  variant?: 'normal' | 'extended';

  // Parámetros para variant 'normal'
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  methodOfPayment?: MethodOfPayment;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  valuePay?: number;

  @IsOptional()
  @IsArray()
  // @IsUUID('4', { each: true })
  harvestsId?: string[];

  @IsOptional()
  @IsArray()
  // @IsUUID('4', { each: true })
  worksId?: string[];
}

export class ConsumptionOptionsDto {
  @IsOptional()
  @IsDateString()
  date?: string;
  /**
   * Número de consumos a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  /**
   * Variante del método de creación de consumos.
   */
  @IsOptional()
  @IsEnum(['normal', 'extended'])
  variant?: 'normal' | 'extended';

  // Parámetros para variant 'normal'
  @IsOptional()
  @IsString()
  supplyId?: string;

  @IsOptional()
  @IsString()
  cropId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount?: number;

  // Parámetros para variant 'extended'
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantitySupplies?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountForItem?: number;
}

export class HarvestProcessedOptionsDto {
  /**
   * Número de cosechas a crear.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsUUID(4)
  cropId?: string;

  @IsOptional()
  @IsUUID(4)
  harvestId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: UnitType;
}

export class CustomUserOptionsDto {
  @IsOptional()
  @IsArray()
  modules?: string[];

  @IsOptional()
  @IsArray()
  actions?: string[];
}

export class CustomSupplyOptionsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: UnitType;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomSupplyOptionsDto)
  customSupplies?: CustomSupplyOptionsDto;

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
   * Opciones para la creación de cosechas.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => HarvestOptionsDto)
  harvests?: HarvestOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => HarvestProcessedOptionsDto)
  harvestsProcessed?: HarvestProcessedOptionsDto;

  /**
   * Opciones para la creación de trabajos.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkOptionsDto)
  works?: WorkOptionsDto;

  /**
   * Opciones para la creación de ventas.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SaleOptionsDto)
  sales?: SaleOptionsDto;

  /**
   * Opciones para la creación de compras.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ShoppingOptionsDto)
  shoppings?: ShoppingOptionsDto;

  /**
   * Opciones para la creación de consumos.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsumptionOptionsDto)
  consumptions?: ConsumptionOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  payments?: PaymentOptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomUserOptionsDto)
  customUser?: CustomUserOptionsDto;
}
