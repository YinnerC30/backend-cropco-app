import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'jsonwebtoken';

export const getPropertyFromTokenFactory = (
  property: string,
  ctx: ExecutionContext,
): string | null => {
  const request = ctx.switchToHttp().getRequest();
  const authorizationHeader = request.headers['authorization'];

  if (!authorizationHeader) {
    return null;
  }

  const token = authorizationHeader.split(' ')[1];
  if (!token) {
    return null;
  }

  try {
    const decodedToken = <JwtPayload>(
      JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    );

    return property ? decodedToken?.[property] || null : null;
  } catch (error) {
    return null;
  }
};

export const GetPropertyFromToken = createParamDecorator(
  getPropertyFromTokenFactory,
);
