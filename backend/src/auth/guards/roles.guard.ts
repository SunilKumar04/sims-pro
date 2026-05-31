import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required) return true;
    const { user } = context.switchToHttp().getRequest();
    const normalize = (role?: string) => {
      const upper = String(role || '').toUpperCase();
      if (upper === 'SCHOOL_ADMIN') return 'ADMIN';
      return upper;
    };

    const userRole = normalize(user?.role);
    const normalizedRequired = required.map((role) => normalize(role));

    return normalizedRequired.includes(userRole);
  }
}
