import { IsBoolean, IsBooleanString, IsOptional } from 'class-validator';

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
