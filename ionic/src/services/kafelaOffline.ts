import { storageService } from './storage';
import type { KafelaSnapshot } from './kafelaApi';
import { kafelaApi } from './kafelaApi';

const SNAPSHOT_KEY = 'kafela_snapshot_cache';
const OUTBOX_KEY = 'kafela_outbox';

export type KafelaOutboxItem =
  | {
      id: string;
      type: 'roll_call_mark';
      kafelaId: string;
      rollCallId: string;
      subjectType: 'member' | 'companion';
      memberId?: string | null;
      companionId?: string | null;
      present: boolean;
      createdAt: string;
    }
  | {
      id: string;
      type: 'broadcast_ack';
      kafelaId: string;
      broadcastId: string;
      createdAt: string;
    };

export type CachedKafelaSnapshot = KafelaSnapshot & {
  cachedAt: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function cacheKafelaSnapshot(snap: KafelaSnapshot): Promise<void> {
  const payload: CachedKafelaSnapshot = {
    ...snap,
    cachedAt: new Date().toISOString(),
  };
  await storageService.setObject(SNAPSHOT_KEY, payload);
}

export async function readCachedKafelaSnapshot(): Promise<CachedKafelaSnapshot | null> {
  return storageService.getObject<CachedKafelaSnapshot>(SNAPSHOT_KEY);
}

export async function clearCachedKafelaSnapshot(): Promise<void> {
  await storageService.remove(SNAPSHOT_KEY);
}

export async function readOutbox(): Promise<KafelaOutboxItem[]> {
  const items = await storageService.getObject<KafelaOutboxItem[]>(OUTBOX_KEY);
  return items ?? [];
}

async function writeOutbox(items: KafelaOutboxItem[]): Promise<void> {
  await storageService.setObject(OUTBOX_KEY, items);
}

export async function enqueueOutbox(
  item:
    | {
        type: 'roll_call_mark';
        kafelaId: string;
        rollCallId: string;
        subjectType: 'member' | 'companion';
        memberId?: string | null;
        companionId?: string | null;
        present: boolean;
        id?: string;
        createdAt?: string;
      }
    | {
        type: 'broadcast_ack';
        kafelaId: string;
        broadcastId: string;
        id?: string;
        createdAt?: string;
      }
): Promise<KafelaOutboxItem[]> {
  const items = await readOutbox();
  const next = (
    item.type === 'broadcast_ack'
      ? {
          id: item.id ?? newId(),
          type: 'broadcast_ack' as const,
          kafelaId: item.kafelaId,
          broadcastId: item.broadcastId,
          createdAt: item.createdAt ?? new Date().toISOString(),
        }
      : {
          id: item.id ?? newId(),
          type: 'roll_call_mark' as const,
          kafelaId: item.kafelaId,
          rollCallId: item.rollCallId,
          subjectType: item.subjectType,
          memberId: item.memberId,
          companionId: item.companionId,
          present: item.present,
          createdAt: item.createdAt ?? new Date().toISOString(),
        }
  ) satisfies KafelaOutboxItem;

  // Deduplicate: keep latest mark per subject; one ack per broadcast
  const filtered = items.filter((existing) => {
    if (next.type === 'broadcast_ack' && existing.type === 'broadcast_ack') {
      return existing.broadcastId !== next.broadcastId;
    }
    if (next.type === 'roll_call_mark' && existing.type === 'roll_call_mark') {
      if (existing.rollCallId !== next.rollCallId) return true;
      if (next.subjectType === 'companion') {
        return existing.companionId !== next.companionId;
      }
      return !(
        existing.subjectType === 'member' &&
        (existing.memberId || '') === (next.memberId || '')
      );
    }
    return true;
  });

  filtered.push(next);
  await writeOutbox(filtered);
  return filtered;
}

export async function removeOutboxItem(id: string): Promise<KafelaOutboxItem[]> {
  const items = await readOutbox();
  const next = items.filter((i) => i.id !== id);
  await writeOutbox(next);
  return next;
}

export async function flushOutbox(): Promise<{ flushed: number; remaining: KafelaOutboxItem[] }> {
  const items = await readOutbox();
  if (!items.length) return { flushed: 0, remaining: [] };

  let flushed = 0;
  const remaining: KafelaOutboxItem[] = [];

  for (const item of items) {
    try {
      if (item.type === 'broadcast_ack') {
        await kafelaApi.ackBroadcast(item.kafelaId, item.broadcastId);
      } else {
        await kafelaApi.respondRollCall(item.kafelaId, item.rollCallId, {
          present: item.present,
          subjectType: item.subjectType,
          memberId: item.memberId,
          companionId: item.companionId,
        });
      }
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }

  await writeOutbox(remaining);
  return { flushed, remaining };
}
