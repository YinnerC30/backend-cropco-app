# Rate Limiting - Documentación

## 📋 Descripción General

Este documento describe la implementación de **Rate Limiting** en la API REST de CropCo, diseñada para proteger contra ataques DDoS, controlar el uso de recursos y proporcionar una experiencia justa para todos los usuarios.

## 🏗️ Arquitectura

### Componentes Principales

1. **ThrottlerModule** - Módulo principal de NestJS para rate limiting
2. **RateLimitGuard** - Guard personalizado con lógica específica
3. **Configuración Dinámica** - Diferentes límites según el contexto
4. **Decoradores Personalizados** - Fácil aplicación en controladores

### Estructura de Archivos

```
src/
├── common/
│   ├── config/
│   │   └── rate-limit.config.ts      # Configuración centralizada
│   ├── guards/
│   │   └── rate-limit.guard.ts       # Guard personalizado
│   └── decorators/
│       └── rate-limit.decorator.ts   # Decoradores personalizados
└── app.module.ts                     # Configuración global
```

## ⚙️ Configuración

### Límites por Contexto

| Contexto | TTL | Límite | Descripción |
|----------|-----|--------|-------------|
| **Default** | 60s | 100 | Límite general para todos los endpoints |
| **Auth** | 60s | 5 | Endpoints de autenticación (muy estrictos) |
| **Admin** | 60s | 50 | Endpoints de administración |
| **Seed** | 300s | 3 | Endpoints de seed (solo desarrollo) |
| **Public** | 60s | 200 | Endpoints públicos (más permisivos) |
| **Critical** | 60s | 10 | Endpoints críticos del sistema |

### Identificadores de Tracking

El sistema utiliza múltiples identificadores para tracking:

- **IP Address** - Identificador base
- **User ID** - Para usuarios autenticados
- **Tenant ID** - Para multi-tenancy
- **Combinación** - `IP:user:ID:tenant:ID`

## 🚀 Uso

### 1. Aplicación Global

El rate limiting se aplica automáticamente a todos los endpoints con la configuración por defecto.

### 2. Decoradores Personalizados

```typescript
import { AuthRateLimit, AdminRateLimit, SeedRateLimit } from 'src/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  @AuthRateLimit() // 5 requests por minuto
  async login() {
    // ...
  }
}

@Controller('administrators')
export class AdministratorsController {
  @Get('all')
  @AdminRateLimit() // 50 requests por minuto
  async findAll() {
    // ...
  }
}

@Controller('seed')
export class SeedController {
  @Get()
  @SeedRateLimit() // 3 requests por 5 minutos
  async executeSeed() {
    // ...
  }
}
```

### 3. Configuración Personalizada

```typescript
import { RateLimit } from 'src/common';

@Controller('custom')
export class CustomController {
  @Get('sensitive')
  @RateLimit(30000, 2) // 2 requests por 30 segundos
  async sensitiveOperation() {
    // ...
  }
}
```

## 📊 Headers de Respuesta

### Headers Informativos

- `X-RateLimit-Limit` - Límite máximo de requests
- `X-RateLimit-Remaining` - Requests restantes
- `X-RateLimit-Reset` - Timestamp de reset
- `Retry-After` - Segundos para reintentar (cuando se excede)

### Ejemplo de Respuesta

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Respuesta de Error

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Has excedido el límite de 5 solicitudes por 1 minuto(s)",
  "retryAfter": 60,
  "limit": 5,
  "remaining": 0
}
```

## 🔧 Configuración Avanzada

### Almacenamiento Distribuido

Para aplicaciones con múltiples instancias, se puede configurar Redis:

```typescript
// app.module.ts
import { ThrottlerStorageRedisService } from '@nestjs/throttler/dist/throttler-storage-redis.service';

ThrottlerModule.forRoot({
  storage: new ThrottlerStorageRedisService(redisClient),
  ttl: 60000,
  limit: 100,
})
```

### Configuración por Entorno

```typescript
// rate-limit.config.ts
const isDevelopment = process.env.STATUS_PROJECT === 'development';

export const rateLimitConfig = {
  default: {
    ttl: 60000,
    limit: isDevelopment ? 1000 : 100, // Más permisivo en desarrollo
  },
  // ...
};
```

## 🛡️ Seguridad

### Protección Contra Ataques

1. **DDoS Protection** - Limita requests por IP
2. **Brute Force Protection** - Límites estrictos en auth
3. **Resource Abuse** - Control de uso de endpoints costosos
4. **Tenant Isolation** - Rate limiting separado por tenant

### Mejores Prácticas

1. **Límites Graduales** - Diferentes límites según el contexto
2. **Mensajes Claros** - Información útil en respuestas de error
3. **Headers Informativos** - Ayudan al cliente a gestionar límites
4. **Configuración Flexible** - Fácil ajuste según necesidades

## 🧪 Testing

### Pruebas de Rate Limiting

```typescript
describe('Rate Limiting', () => {
  it('should limit requests to auth endpoints', async () => {
    // Hacer 6 requests rápidos
    for (let i = 0; i < 6; i++) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData);
      
      if (i < 5) {
        expect(response.status).not.toBe(429);
      } else {
        expect(response.status).toBe(429);
        expect(response.body.error).toBe('Rate limit exceeded');
      }
    }
  });
});
```

## 📈 Monitoreo

### Métricas Recomendadas

1. **Rate Limit Hits** - Cuántas veces se exceden los límites
2. **Endpoint Usage** - Uso por endpoint y por usuario
3. **Tenant Usage** - Uso por tenant
4. **Error Rates** - Tasa de errores 429

### Logs

Los eventos de rate limiting se registran automáticamente:

```
[RateLimitGuard] Rate limit exceeded for IP: 192.168.1.1, User: user123, Endpoint: /auth/login
```

## 🔄 Mantenimiento

### Ajustes de Configuración

1. **Monitorear métricas** de uso y errores
2. **Ajustar límites** según patrones de uso
3. **Revisar logs** para identificar abusos
4. **Actualizar configuración** según necesidades del negocio

### Escalabilidad

- **Redis Storage** para múltiples instancias
- **Configuración dinámica** por entorno
- **Límites personalizados** por tipo de usuario
- **Monitoreo en tiempo real** de uso 