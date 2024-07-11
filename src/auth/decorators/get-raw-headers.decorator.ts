import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetRawHeader = createParamDecorator(
  (data, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return req.rawHeaders;
  },
);
