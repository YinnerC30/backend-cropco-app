import { ThrottlerOptions } from '@nestjs/throttler';

/**
 * Configuración de rate limiting para diferentes contextos
 */
export const rateLimitConfig: Record<string, ThrottlerOptions> = {
  // Configuración global por defecto
  default: {
    ttl: 60000, // 1 minuto
    limit: 100, // 100 requests por minuto
  },

  // Endpoints de autenticación (más estrictos)
  auth: {
    ttl: 60000, // 1 minuto
    limit: 5, // 5 intentos por minuto
  },

  // Endpoints de administración
  admin: {
    ttl: 60000, // 1 minuto
    limit: 50, // 50 requests por minuto
  },

  // Endpoints de seed (solo desarrollo)
  seed: {
    ttl: 300000, // 5 minutos
    limit: 3, // 3 requests por 5 minutos
  },

  // Endpoints públicos (más permisivos)
  public: {
    ttl: 60000, // 1 minuto
    limit: 200, // 200 requests por minuto
  },

  // Endpoints críticos (muy estrictos)
  critical: {
    ttl: 60000, // 1 minuto
    limit: 10, // 10 requests por minuto
  },
};

/**
 * Configuración específica por endpoint
 */
export const endpointRateLimits: Record<string, ThrottlerOptions> = {
  // Auth endpoints
  '/auth/login': rateLimitConfig.auth,
  '/auth/management/login': rateLimitConfig.auth,
  '/auth/renew-token': rateLimitConfig.auth,

  // Admin endpoints
  '/administrators': rateLimitConfig.admin,
  '/tenants': rateLimitConfig.admin,

  // Seed endpoints (solo desarrollo)
  '/seed': rateLimitConfig.seed,

  // Endpoints críticos
  '/auth/check-status': rateLimitConfig.critical,
  '/auth/management/check-status': rateLimitConfig.critical,
};

/**
 * Obtener configuración de rate limit para un endpoint específico
 */
export function getRateLimitForEndpoint(path: string): ThrottlerOptions {
  // Buscar coincidencia exacta
  if (endpointRateLimits[path]) {
    return endpointRateLimits[path];
  }

  // Buscar coincidencia por prefijo
  for (const [endpointPath, config] of Object.entries(endpointRateLimits)) {
    if (path.startsWith(endpointPath)) {
      return config;
    }
  }

  // Retornar configuración por defecto
  return rateLimitConfig.default;
}
