import type { KafelaMemberRole, KafelaMemberStatus } from '@prisma/client';

export type { KafelaMemberRole, KafelaMemberStatus };

export const GROUP_COLORS = [
  '#0d9488',
  '#0369a1',
  '#7c3aed',
  '#c2410c',
  '#be123c',
  '#15803d',
  '#a16207',
  '#4338ca',
] as const;

export function isKafelaAdmin(role: KafelaMemberRole): boolean {
  return role === 'kafela_admin';
}

export function isGroupAdminRole(role: KafelaMemberRole): boolean {
  return role === 'group_admin' || role === 'kafela_admin';
}
