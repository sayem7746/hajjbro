import type { UserRole as PrismaUserRole } from '@prisma/client';

export type UserRole = PrismaUserRole;

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const ROLES = ['pilgrim', 'admin'] as const;
export type RoleSlug = (typeof ROLES)[number];
