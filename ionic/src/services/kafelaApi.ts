import api from './api';
import type {
  Broadcast,
  KafelaMember,
  KafelaMemberRole,
  KafelaGroupSummary,
  KafelaSummary,
  MyKafelaResponse,
  RollCall,
  SosEvent,
  VisibleLocation,
} from '../types/kafela';

function unwrap<T>(response: { data: { success?: boolean; data: T } }): T {
  return response.data.data;
}

export const kafelaApi = {
  getMine: () => api.get('/kafelas/mine').then((r) => unwrap<MyKafelaResponse | null>(r)),

  create: (body: {
    name: string;
    maxMembers?: number;
    displayName?: string;
    phone?: string;
    sharingEnabled?: boolean;
  }) => api.post('/kafelas', body).then((r) => unwrap<{ kafela: KafelaSummary; me: KafelaMember }>(r)),

  join: (body: {
    joinCode: string;
    sharingEnabled?: boolean;
    displayName?: string;
    phone?: string;
    tentOrRoom?: string;
  }) =>
    api.post('/kafelas/join', body).then((r) => unwrap<{ kafela: KafelaSummary; me: KafelaMember }>(r)),

  leave: (kafelaId: string) =>
    api.post(`/kafelas/${kafelaId}/leave`).then((r) => unwrap<{ left: boolean }>(r)),

  rotateCode: (kafelaId: string) =>
    api.post(`/kafelas/${kafelaId}/rotate-code`).then((r) => unwrap<KafelaSummary>(r)),

  listMembers: (kafelaId: string, q?: string) =>
    api
      .get(`/kafelas/${kafelaId}/members`, { params: q ? { q } : undefined })
      .then((r) => unwrap<KafelaMember[]>(r)),

  updateMemberRole: (kafelaId: string, memberId: string, role: KafelaMemberRole) =>
    api
      .patch(`/kafelas/${kafelaId}/members/${memberId}/role`, { role })
      .then((r) => unwrap<KafelaMember>(r)),

  removeMember: (kafelaId: string, memberId: string) =>
    api.delete(`/kafelas/${kafelaId}/members/${memberId}`).then((r) => unwrap<{ removed: boolean }>(r)),

  updateMe: (
    kafelaId: string,
    body: {
      displayName?: string | null;
      phone?: string | null;
      tentOrRoom?: string | null;
      sharingEnabled?: boolean;
    }
  ) => api.patch(`/kafelas/${kafelaId}/me`, body).then((r) => unwrap<KafelaMember>(r)),

  listGroups: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/groups`).then((r) => unwrap<KafelaGroupSummary[]>(r)),

  createGroup: (
    kafelaId: string,
    body: { name: string; color?: string; adminMemberId?: string | null }
  ) => api.post(`/kafelas/${kafelaId}/groups`, body).then((r) => unwrap<KafelaGroupSummary>(r)),

  updateGroup: (
    kafelaId: string,
    groupId: string,
    body: { name?: string; color?: string; adminMemberId?: string | null }
  ) =>
    api
      .patch(`/kafelas/${kafelaId}/groups/${groupId}`, body)
      .then((r) => unwrap<KafelaGroupSummary>(r)),

  deleteGroup: (kafelaId: string, groupId: string) =>
    api.delete(`/kafelas/${kafelaId}/groups/${groupId}`).then((r) => unwrap<{ deleted: boolean }>(r)),

  assignMembers: (kafelaId: string, memberIds: string[], groupId: string | null) =>
    api
      .post(`/kafelas/${kafelaId}/assign`, { memberIds, groupId })
      .then((r) => unwrap<KafelaMember[]>(r)),

  upsertLocation: (
    kafelaId: string,
    body: { latitude: number; longitude: number; accuracy?: number | null; battery?: number | null }
  ) => api.put(`/kafelas/${kafelaId}/me/location`, body).then((r) => unwrap(r)),

  listLocations: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/locations`).then((r) => unwrap<VisibleLocation[]>(r)),

  listBroadcasts: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/broadcasts`).then((r) => unwrap<Broadcast[]>(r)),

  createBroadcast: (
    kafelaId: string,
    body: {
      title: string;
      body: string;
      groupId?: string | null;
      priority?: 'info' | 'urgent';
      rallyLat?: number | null;
      rallyLng?: number | null;
    }
  ) => api.post(`/kafelas/${kafelaId}/broadcasts`, body).then((r) => unwrap<Broadcast>(r)),

  ackBroadcast: (kafelaId: string, broadcastId: string) =>
    api
      .post(`/kafelas/${kafelaId}/broadcasts/${broadcastId}/ack`)
      .then((r) => unwrap<{ acked: boolean }>(r)),

  broadcastAcks: (kafelaId: string, broadcastId: string) =>
    api.get(`/kafelas/${kafelaId}/broadcasts/${broadcastId}/acks`).then((r) =>
      unwrap<
        Array<{
          memberId: string;
          displayName: string;
          seen: boolean;
          seenAt: string | null;
        }>
      >(r)
    ),

  listSos: (kafelaId: string, openOnly = true) =>
    api
      .get(`/kafelas/${kafelaId}/sos`, { params: { open: openOnly ? undefined : 'false' } })
      .then((r) => unwrap<SosEvent[]>(r)),

  createSos: (
    kafelaId: string,
    body?: { latitude?: number | null; longitude?: number | null; note?: string | null }
  ) => api.post(`/kafelas/${kafelaId}/sos`, body ?? {}).then((r) => unwrap<SosEvent>(r)),

  resolveSos: (kafelaId: string, sosId: string) =>
    api.post(`/kafelas/${kafelaId}/sos/${sosId}/resolve`).then((r) => unwrap<SosEvent>(r)),

  listRollCalls: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/roll-calls`).then((r) => unwrap<RollCall[]>(r)),

  createRollCall: (kafelaId: string, body: { title: string; groupId?: string | null }) =>
    api.post(`/kafelas/${kafelaId}/roll-calls`, body).then((r) => unwrap<RollCall>(r)),

  getRollCall: (kafelaId: string, rollCallId: string) =>
    api.get(`/kafelas/${kafelaId}/roll-calls/${rollCallId}`).then((r) => unwrap(r)),

  respondRollCall: (kafelaId: string, rollCallId: string, present = true) =>
    api
      .post(`/kafelas/${kafelaId}/roll-calls/${rollCallId}/respond`, { present })
      .then((r) => unwrap<{ responded: boolean; present: boolean }>(r)),

  closeRollCall: (kafelaId: string, rollCallId: string) =>
    api
      .post(`/kafelas/${kafelaId}/roll-calls/${rollCallId}/close`)
      .then((r) => unwrap<RollCall>(r)),
};
