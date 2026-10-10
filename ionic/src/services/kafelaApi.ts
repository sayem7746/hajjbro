import api from './api';
import { storageService } from './storage';
import type {
  Broadcast,
  KafelaCompanion,
  KafelaCompanionRelation,
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.hajjbro.com/api/v1';

export type KafelaSnapshot = {
  kafela: KafelaSummary;
  me: KafelaMember;
  members: KafelaMember[];
  groups: KafelaGroupSummary[];
  broadcasts: Broadcast[];
  sosEvents: SosEvent[];
  rollCalls: RollCall[];
};

export const kafelaApi = {
  getMine: () => api.get('/kafelas/mine').then((r) => unwrap<MyKafelaResponse | null>(r)),

  getSnapshot: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/snapshot`).then((r) => unwrap<KafelaSnapshot>(r)),

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

  listCompanions: (kafelaId: string, memberId: string) =>
    api
      .get(`/kafelas/${kafelaId}/members/${memberId}/companions`)
      .then((r) => unwrap<KafelaCompanion[]>(r)),

  createCompanion: (
    kafelaId: string,
    memberId: string,
    body: { name: string; relation?: KafelaCompanionRelation; note?: string | null }
  ) =>
    api
      .post(`/kafelas/${kafelaId}/members/${memberId}/companions`, body)
      .then((r) => unwrap<KafelaCompanion>(r)),

  updateCompanion: (
    kafelaId: string,
    companionId: string,
    body: { name?: string; relation?: KafelaCompanionRelation; note?: string | null }
  ) =>
    api
      .patch(`/kafelas/${kafelaId}/companions/${companionId}`, body)
      .then((r) => unwrap<KafelaCompanion>(r)),

  deleteCompanion: (kafelaId: string, companionId: string) =>
    api
      .delete(`/kafelas/${kafelaId}/companions/${companionId}`)
      .then((r) => unwrap<{ deleted: boolean }>(r)),

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

  updateBroadcast: (
    kafelaId: string,
    broadcastId: string,
    body: { title: string; body: string; priority?: 'info' | 'urgent' }
  ) =>
    api
      .patch(`/kafelas/${kafelaId}/broadcasts/${broadcastId}`, body)
      .then((r) => unwrap<Broadcast>(r)),

  deleteBroadcast: (kafelaId: string, broadcastId: string) =>
    api
      .delete(`/kafelas/${kafelaId}/broadcasts/${broadcastId}`)
      .then((r) => unwrap<{ deleted: boolean }>(r)),

  deleteAllBroadcasts: (kafelaId: string) =>
    api.delete(`/kafelas/${kafelaId}/broadcasts`).then((r) => unwrap<{ deleted: number }>(r)),

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
          householdSize?: number;
          confirmedFor?: number;
          label?: string;
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
    body?: {
      latitude?: number | null;
      longitude?: number | null;
      note?: string | null;
      companionId?: string | null;
    }
  ) => api.post(`/kafelas/${kafelaId}/sos`, body ?? {}).then((r) => unwrap<SosEvent>(r)),

  resolveSos: (kafelaId: string, sosId: string) =>
    api.post(`/kafelas/${kafelaId}/sos/${sosId}/resolve`).then((r) => unwrap<SosEvent>(r)),

  listRollCalls: (kafelaId: string) =>
    api.get(`/kafelas/${kafelaId}/roll-calls`).then((r) => unwrap<RollCall[]>(r)),

  createRollCall: (kafelaId: string, body: { title: string; groupId?: string | null }) =>
    api.post(`/kafelas/${kafelaId}/roll-calls`, body).then((r) => unwrap<RollCall>(r)),

  getRollCall: (kafelaId: string, rollCallId: string) =>
    api.get(`/kafelas/${kafelaId}/roll-calls/${rollCallId}`).then((r) => unwrap(r)),

  respondRollCall: (
    kafelaId: string,
    rollCallId: string,
    body:
      | boolean
      | {
          present?: boolean;
          subjectType?: 'member' | 'companion';
          memberId?: string | null;
          companionId?: string | null;
        } = true
  ) => {
    const payload =
      typeof body === 'boolean'
        ? { present: body, subjectType: 'member' as const }
        : {
            present: body.present !== false,
            subjectType: body.subjectType ?? (body.companionId ? 'companion' : 'member'),
            memberId: body.memberId,
            companionId: body.companionId,
          };
    return api
      .post(`/kafelas/${kafelaId}/roll-calls/${rollCallId}/respond`, payload)
      .then((r) =>
        unwrap<{
          responded: boolean;
          present: boolean;
          subjectType: 'member' | 'companion';
          memberId: string;
          companionId: string | null;
        }>(r)
      );
  },

  closeRollCall: (kafelaId: string, rollCallId: string) =>
    api
      .post(`/kafelas/${kafelaId}/roll-calls/${rollCallId}/close`)
      .then((r) => unwrap<RollCall>(r)),

  /**
   * Open an authenticated SSE stream. Browser EventSource cannot set Authorization,
   * so we use fetch + ReadableStream and parse SSE frames.
   */
  subscribeEvents: async (
    kafelaId: string,
    onEvent: (type: string) => void,
    signal: AbortSignal
  ): Promise<void> => {
    const token = await storageService.get('auth_token');
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${API_BASE_URL}/kafelas/${kafelaId}/events`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const dataLine = frame
          .split('\n')
          .find((line) => line.startsWith('data:'));
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine.slice(5).trim()) as { type?: string };
          if (payload.type) onEvent(payload.type);
        } catch {
          /* ignore malformed frames */
        }
      }
    }
  },
};
