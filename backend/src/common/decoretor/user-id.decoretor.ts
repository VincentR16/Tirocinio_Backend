// decorators/user-id.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from '../types/authRequest';

export const UserId = createParamDecorator((_, ctx: ExecutionContext) => {
  const req: AuthenticatedRequest = ctx.switchToHttp().getRequest();
  return req.user?.userId;
});
