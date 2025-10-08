import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Factory function que extrae el subdominio del header 'origin' del request
 * @param _ Parámetro no utilizado (data del decorador)
 * @param ctx Contexto de ejecución de NestJS
 * @returns El subdominio extraído o null si no se puede obtener
 */
export const getSubdomainFactory = (
  _: unknown,
  ctx: ExecutionContext,
): string | null => {
  const request = ctx.switchToHttp().getRequest();
  const origin = request.headers['origin'] || request.headers['Origin'];

  if (!origin) {
    return null;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const subdomain = hostname.split('.')[0];
    
    // Verificar que no sea solo el dominio principal (ej: localhost, example.com)
    // Si el hostname tiene solo una parte o es una IP, retornar null
    if (hostname.split('.').length <= 2 && !hostname.includes('localhost')) {
      return null;
    }
    
    return subdomain;
  } catch (error) {
    // Si hay error al parsear la URL, retornar null
    return null;
  }
};

/**
 * Decorador de parámetro que extrae el subdominio del header 'origin' del request
 * 
 * @example
 * ```typescript
 * @Get()
 * someMethod(@GetSubdomain() subdomain: string) {
 *   console.log('Subdomain:', subdomain);
 * }
 * ```
 */
export const GetSubdomain = createParamDecorator(getSubdomainFactory); 