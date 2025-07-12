import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Decorador personalizado para aplicar rate limiting específico
 * @param ttl - Tiempo de vida en milisegundos
 * @param limit - Número máximo de requests
 */
export function RateLimit(ttl: number, limit: number) {
  return applyDecorators(
    Throttle({ default: { ttl, limit } }),
  );
}

/**
 * Decorador para endpoints de autenticación (muy estrictos)
 */
export function AuthRateLimit() {
  return RateLimit(60000, 5); // 5 requests por minuto
}

/**
 * Decorador para endpoints de administración
 */
export function AdminRateLimit() {
  return RateLimit(60000, 50); // 50 requests por minuto
}

/**
 * Decorador para endpoints de seed (solo desarrollo)
 */
export function SeedRateLimit() {
  return RateLimit(300000, 3); // 3 requests por 5 minutos
}

/**
 * Decorador para endpoints críticos
 */
export function CriticalRateLimit() {
  return RateLimit(60000, 10); // 10 requests por minuto
}

/**
 * Decorador para endpoints públicos (más permisivos)
 */
export function PublicRateLimit() {
  return RateLimit(60000, 200); // 200 requests por minuto
} 