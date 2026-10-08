export type KafelaMemberRole = 'kafela_admin' | 'group_admin' | 'member';

export interface KafelaGroupSummary {
  id: string;
  name: string;
  color: string;
  adminMemberId: string | null;
  kafelaId?: string;
  createdAt?: string;
  _count?: { members: number };
  admin?: {
    id: string;
    displayName: string | null;
    user: { id: string; name: string | null };
  } | null;
}

export interface KafelaSummary {
  id: string;
  name: string;
  joinCode: string;
  maxMembers: number;
  startsOn: string | null;
  endsOn: string | null;
  createdById: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
  groups?: KafelaGroupSummary[];
}

export interface MemberLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  battery: number | null;
  updatedAt: string;
  ageMs?: number | null;
  stale?: boolean;
}

export interface KafelaMember {
  id: string;
  userId: string;
  kafelaId: string;
  role: KafelaMemberRole;
  groupId: string | null;
  status: string;
  sharingEnabled: boolean;
  displayName: string | null;
  phone: string | null;
  tentOrRoom: string | null;
  joinedAt: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  group: KafelaGroupSummary | null;
  location?: {
    latitude: number | string;
    longitude: number | string;
    accuracy: number | null;
    battery: number | null;
    updatedAt: string;
  } | null;
}

export interface VisibleLocation {
  memberId: string;
  displayName: string;
  phone: string | null;
  tentOrRoom: string | null;
  role: KafelaMemberRole;
  group: KafelaGroupSummary | null;
  sharingEnabled: boolean;
  isSelf: boolean;
  location: MemberLocation | null;
}

export interface Broadcast {
  id: string;
  kafelaId: string;
  groupId: string | null;
  authorId: string;
  title: string;
  body: string;
  priority: 'info' | 'urgent';
  rallyLat: number | string | null;
  rallyLng: number | string | null;
  createdAt: string;
  seenByMe?: boolean;
  _count?: { acks: number };
  group?: { id: string; name: string; color: string } | null;
  author?: {
    id: string;
    displayName: string | null;
    user: { name: string | null };
  };
}

export interface SosEvent {
  id: string;
  kafelaId: string;
  memberId: string;
  latitude: number | string | null;
  longitude: number | string | null;
  note: string | null;
  resolvedAt: string | null;
  createdAt: string;
  member: {
    id: string;
    displayName: string | null;
    phone: string | null;
    group: { id: string; name: string; color: string } | null;
    user: { name: string | null; phone: string | null };
  };
}

export interface RollCall {
  id: string;
  kafelaId: string;
  groupId: string | null;
  authorId: string;
  title: string;
  createdAt: string;
  closedAt: string | null;
  group?: { id: string; name: string; color: string } | null;
  author?: {
    id: string;
    displayName: string | null;
    user: { name: string | null };
  };
  _count?: { responses: number };
}

export interface MyKafelaResponse {
  kafela: KafelaSummary;
  me: KafelaMember;
}

export function isKafelaAdmin(role: KafelaMemberRole): boolean {
  return role === 'kafela_admin';
}

export function canBroadcast(role: KafelaMemberRole): boolean {
  return role === 'kafela_admin' || role === 'group_admin';
}

export function memberLabel(m: { displayName?: string | null; user?: { name?: string | null } }): string {
  return m.displayName || m.user?.name || 'Pilgrim';
}
