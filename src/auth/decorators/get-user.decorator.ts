import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export const GetUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  const { user } = req;
  if (!user) {
    throw new InternalServerErrorException('User not found (request)');
  }

  if (!data) {
    return user;
  }

  return user.email;
});
