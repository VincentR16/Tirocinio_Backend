// user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/jwtPayload';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: JwtPayload = ctx.switchToHttp().getRequest();
    return request.userId;
  },
);
