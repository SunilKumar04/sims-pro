import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => context.switchToHttp().getRequest().tenant,
);
