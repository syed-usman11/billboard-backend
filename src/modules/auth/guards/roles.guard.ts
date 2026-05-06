import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Higher index = more permissions
const ROLE_HIERARCHY: Record<string, number> = {
  USER: 0,
  CUSTOMER: 0, // legacy alias
  MANAGER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('User not found');

    const userLevel = ROLE_HIERARCHY[user.role] ?? -1;
    const minRequired = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r] ?? 999));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
