import { Injectable, Logger } from '@nestjs/common';
import * as math from 'mathjs';

// Unidades de masa
export type MassUnit =
  | 'GRAMOS'
  | 'KILOGRAMOS'
  | 'LIBRAS'
  | 'ONZAS'
  | 'TONELADAS';
// Unidades de volumen
export type VolumeUnit = 'MILILITROS' | 'LITROS' | 'GALONES';
// | 'ONZAS_FLUIDAS'
// | 'CUCHARADAS'
// | 'CUCHARADAS_SOPERAS';
// Unidades de longitud
export type LengthUnit = 'MILIMETROS' | 'CENTIMETROS' | 'METROS';
// Unión de todas las unidades
export type UnitType = MassUnit | VolumeUnit | LengthUnit;

@Injectable()
export class UnitConversionService {
  private readonly logger = new Logger('UnitConversionService');

  // Factores de conversión a unidades base (gramos, mililitros y milímetros)
  private readonly conversionFactors = {
    // Masa (base: gramos)
    KILOGRAMOS: 1000, // 1 kg = 1000 g
    LIBRAS: 453.592, // 1 lb = 453.592 g
    ONZAS: 28.3495, // 1 oz = 28.3495 g
    TONELADAS: 1000000, // 1 t = 1,000,000 g

    // Volumen (base: mililitros)
    LITROS: 1000, // 1 L = 1000 ml
    GALONES: 3785.41, // 1 gal = 3785.41 ml
    ONZAS_FLUIDAS: 29.5735, // 1 fl oz = 29.5735 ml
    CUCHARADAS: 5, // 1 cucharada = 5 ml
    CUCHARADAS_SOPERAS: 15, // 1 cucharada sopera = 15 ml

    // Longitud (base: milímetros)
    CENTIMETROS: 10, // 1 cm = 10 mm
    METROS: 1000, // 1 m = 1000 mm
  };

  // Mapeo de unidades a su tipo (masa, volumen o longitud)
  private readonly unitTypeMap: Record<UnitType, 'mass' | 'volume' | 'length'> =
    {
      // Masa
      GRAMOS: 'mass',
      KILOGRAMOS: 'mass',
      LIBRAS: 'mass',
      ONZAS: 'mass',
      TONELADAS: 'mass',
      // Volumen
      MILILITROS: 'volume',
      LITROS: 'volume',
      GALONES: 'volume',
      // ONZAS_FLUIDAS: 'volume',
      // CUCHARADAS: 'volume',
      // CUCHARADAS_SOPERAS: 'volume',
      // Longitud
      MILIMETROS: 'length',
      CENTIMETROS: 'length',
      METROS: 'length',
    };

  /**
   * Convierte una cantidad de una unidad a otra
   * @param amount Cantidad a convertir
   * @param fromUnit Unidad de origen
   * @param toUnit Unidad de destino
   * @returns Cantidad convertida
   */
  convert(amount: number, fromUnit: UnitType, toUnit: UnitType): number {
    try {
      // Si las unidades son iguales, retornar el mismo valor
      if (fromUnit === toUnit) {
        return amount;
      }

      // Verificar que las unidades sean del mismo tipo (masa, volumen o longitud)
      if (this.unitTypeMap[fromUnit] !== this.unitTypeMap[toUnit]) {
        throw new Error(
          `No se puede convertir entre unidades de ${this.unitTypeMap[fromUnit]} y ${this.unitTypeMap[toUnit]}`,
        );
      }

      // Convertir a la unidad base
      let baseAmount: number;
      if (
        fromUnit === 'GRAMOS' ||
        fromUnit === 'MILILITROS' ||
        fromUnit === 'MILIMETROS'
      ) {
        baseAmount = amount;
      } else {
        baseAmount = amount * this.conversionFactors[fromUnit];
      }

      // Convertir de la unidad base a la unidad destino
      let finalAmount: number;
      if (
        toUnit === 'GRAMOS' ||
        toUnit === 'MILILITROS' ||
        toUnit === 'MILIMETROS'
      ) {
        finalAmount = baseAmount;
      } else {
        finalAmount = baseAmount / this.conversionFactors[toUnit];
      }

      return math.round(finalAmount, 3);
    } catch (error) {
      this.logger.error(`Error converting units: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica si una unidad es válida para el sistema
   * @param unit Unidad a verificar
   * @returns true si la unidad es válida
   */
  isValidUnit(unit: string): unit is UnitType {
    return Object.keys(this.unitTypeMap).includes(unit);
  }

  /**
   * Obtiene el tipo de unidad (masa, volumen o longitud)
   * @param unit Unidad a verificar
   * @returns 'mass', 'volume' o 'length'
   */
  getUnitType(unit: UnitType): 'mass' | 'volume' | 'length' {
    return this.unitTypeMap[unit];
  }

  /**
   * Obtiene todas las unidades disponibles
   * @returns Objeto con las unidades disponibles agrupadas por tipo
   */
  getAvailableUnits() {
    return {
      mass: Object.keys(this.unitTypeMap).filter(
        (unit) => this.unitTypeMap[unit as UnitType] === 'mass',
      ),
      volume: Object.keys(this.unitTypeMap).filter(
        (unit) => this.unitTypeMap[unit as UnitType] === 'volume',
      ),
      length: Object.keys(this.unitTypeMap).filter(
        (unit) => this.unitTypeMap[unit as UnitType] === 'length',
      ),
    };
  }

  getUnitBase(unit: UnitType) {
    const grupUnit = this.unitTypeMap[unit];

    switch (grupUnit) {
      case 'mass':
        return 'GRAMOS';

      case 'volume':
        return 'MILILITROS';

      case 'length':
        return 'MILIMETROS';

      default:
        return null;
    }
  }
}
