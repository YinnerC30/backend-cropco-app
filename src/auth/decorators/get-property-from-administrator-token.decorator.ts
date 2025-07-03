import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'jsonwebtoken';

export const getPropertyFromTokenFactoryAdministrator = (
  property: string,
  ctx: ExecutionContext,
): string | null => {
  const request = ctx.switchToHttp().getRequest();
  const token = request.cookies['administrator-token'];

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

export const GetPropertyFromTokenAdministrator = createParamDecorator(
  getPropertyFromTokenFactoryAdministrator,
);
