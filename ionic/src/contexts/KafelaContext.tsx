import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { kafelaApi, type KafelaSnapshot } from '../services/kafelaApi';
import {
  cacheKafelaSnapshot,
  clearCachedKafelaSnapshot,
  enqueueOutbox,
  flushOutbox,
  readCachedKafelaSnapshot,
  readOutbox,
  type KafelaOutboxItem,
} from '../services/kafelaOffline';
import { useAuth } from './AuthContext';
import type {
  Broadcast,
  KafelaGroupSummary,
  KafelaMember,
  KafelaSummary,
  RollCall,
  SosEvent,
} from '../types/kafela';
import { canBroadcast, isKafelaAdmin } from '../types/kafela';

interface KafelaContextType {
  loading: boolean;
  error: string | null;
  kafela: KafelaSummary | null;
  me: KafelaMember | null;
  members: KafelaMember[];
  groups: KafelaGroupSummary[];
  broadcasts: Broadcast[];
  sosEvents: SosEvent[];
  rollCalls: RollCall[];
  isAdmin: boolean;
  canSendBroadcast: boolean;
  /** Increments when a live snapshot is applied; detail pages can reload local status. */
  liveRevision: number;
  /** ISO timestamp of last successful (or cached) snapshot. */
  lastUpdatedAt: string | null;
  /** True when showing cached data after a network failure. */
  isOffline: boolean;
  outbox: KafelaOutboxItem[];
  pendingCount: number;
  refresh: () => Promise<void>;
  refreshMembers: (q?: string) => Promise<void>;
  refreshBroadcasts: () => Promise<void>;
  refreshSos: () => Promise<void>;
  refreshRollCalls: () => Promise<void>;
  setLocalMe: (me: KafelaMember) => void;
  setLocalKafela: (k: KafelaSummary) => void;
  queueBroadcastAck: (broadcastId: string) => Promise<void>;
  queueRollCallMark: (input: {
    rollCallId: string;
    subjectType: 'member' | 'companion';
    memberId?: string | null;
    companionId?: string | null;
    present: boolean;
  }) => Promise<void>;
  clear: () => void;
}

const KafelaContext = createContext<KafelaContextType | undefined>(undefined);

const LIVE_FALLBACK_MS = 60_000;
const RECONNECT_BASE_MS = 1_500;
const RECONNECT_MAX_MS = 30_000;

export const KafelaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kafela, setKafela] = useState<KafelaSummary | null>(null);
  const [me, setMe] = useState<KafelaMember | null>(null);
  const [members, setMembers] = useState<KafelaMember[]>([]);
  const [groups, setGroups] = useState<KafelaGroupSummary[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [liveRevision, setLiveRevision] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [outbox, setOutbox] = useState<KafelaOutboxItem[]>([]);

  const kafelaIdRef = useRef<string | null>(null);
  const snapshotInFlight = useRef<Promise<void> | null>(null);
  const snapshotQueued = useRef(false);

  const clear = useCallback(() => {
    setKafela(null);
    setMe(null);
    setMembers([]);
    setGroups([]);
    setBroadcasts([]);
    setSosEvents([]);
    setRollCalls([]);
    setError(null);
    setLastUpdatedAt(null);
    setIsOffline(false);
    kafelaIdRef.current = null;
    void clearCachedKafelaSnapshot();
  }, []);

  const applySnapshot = useCallback(
    (snap: KafelaSnapshot, meta?: { cachedAt?: string; offline?: boolean }) => {
      setKafela(snap.kafela);
      setMe(snap.me);
      setMembers(snap.members);
      setGroups(snap.groups);
      setBroadcasts(snap.broadcasts);
      setSosEvents(snap.sosEvents);
      setRollCalls(snap.rollCalls);
      kafelaIdRef.current = snap.kafela.id;
      setLastUpdatedAt(meta?.cachedAt ?? new Date().toISOString());
      setIsOffline(Boolean(meta?.offline));
      setLiveRevision((n) => n + 1);
    },
    []
  );

  const reloadOutbox = useCallback(async () => {
    setOutbox(await readOutbox());
  }, []);

  const tryFlushOutbox = useCallback(async () => {
    const result = await flushOutbox();
    setOutbox(result.remaining);
    return result;
  }, []);

  const refreshMembers = useCallback(
    async (q?: string) => {
      if (!kafela) return;
      try {
        const list = await kafelaApi.listMembers(kafela.id, q);
        setMembers(list);
        setIsOffline(false);
      } catch {
        /* keep cached roster */
      }
    },
    [kafela]
  );

  const refreshBroadcasts = useCallback(async () => {
    if (!kafela) return;
    try {
      setBroadcasts(await kafelaApi.listBroadcasts(kafela.id));
      setIsOffline(false);
    } catch {
      /* keep cached */
    }
  }, [kafela]);

  const refreshSos = useCallback(async () => {
    if (!kafela) return;
    try {
      setSosEvents(await kafelaApi.listSos(kafela.id, true));
      setIsOffline(false);
    } catch {
      /* keep cached */
    }
  }, [kafela]);

  const refreshRollCalls = useCallback(async () => {
    if (!kafela) return;
    try {
      setRollCalls(await kafelaApi.listRollCalls(kafela.id));
      setIsOffline(false);
    } catch {
      /* keep cached */
    }
  }, [kafela]);

  const loadSnapshotSilent = useCallback(
    async (kafelaId: string) => {
      if (snapshotInFlight.current) {
        snapshotQueued.current = true;
        await snapshotInFlight.current;
        return;
      }
      const run = (async () => {
        try {
          do {
            snapshotQueued.current = false;
            await tryFlushOutbox();
            const snap = await kafelaApi.getSnapshot(kafelaId);
            applySnapshot(snap, { offline: false });
            await cacheKafelaSnapshot(snap);
            setError(null);
          } while (snapshotQueued.current);
        } catch (e: unknown) {
          const err = e as { response?: { status?: number }; message?: string };
          if (err.response?.status === 401 || err.response?.status === 403) {
            clear();
            return;
          }
          const cached = await readCachedKafelaSnapshot();
          if (cached && cached.kafela.id === kafelaId) {
            applySnapshot(cached, { cachedAt: cached.cachedAt, offline: true });
          }
        } finally {
          snapshotInFlight.current = null;
        }
      })();
      snapshotInFlight.current = run;
      await run;
    },
    [applySnapshot, clear, tryFlushOutbox]
  );

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clear();
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    await reloadOutbox();
    try {
      await tryFlushOutbox();
      const mine = await kafelaApi.getMine();
      if (!mine) {
        clear();
        return;
      }
      setKafela(mine.kafela);
      setMe(mine.me);
      kafelaIdRef.current = mine.kafela.id;
      const snap = await kafelaApi.getSnapshot(mine.kafela.id);
      applySnapshot(snap, { offline: false });
      await cacheKafelaSnapshot(snap);
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { error?: string }; status?: number };
        message?: string;
      };
      if (err.response?.status === 401) {
        clear();
        setError(err.response?.data?.error || err.message || 'Failed to load kafela');
        return;
      }
      const cached = await readCachedKafelaSnapshot();
      if (cached) {
        applySnapshot(cached, { cachedAt: cached.cachedAt, offline: true });
        setError(null);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load kafela');
      }
    } finally {
      setLoading(false);
      await reloadOutbox();
    }
  }, [authLoading, isAuthenticated, clear, applySnapshot, reloadOutbox, tryFlushOutbox]);

  const queueBroadcastAck = useCallback(
    async (broadcastId: string) => {
      if (!kafela) return;
      try {
        await kafelaApi.ackBroadcast(kafela.id, broadcastId);
        setBroadcasts((prev) =>
          prev.map((b) => (b.id === broadcastId ? { ...b, seenByMe: true } : b))
        );
        setIsOffline(false);
      } catch {
        const items = await enqueueOutbox({
          type: 'broadcast_ack',
          kafelaId: kafela.id,
          broadcastId,
        });
        setOutbox(items);
        setBroadcasts((prev) =>
          prev.map((b) => (b.id === broadcastId ? { ...b, seenByMe: true } : b))
        );
        setIsOffline(true);
      }
    },
    [kafela]
  );

  const queueRollCallMark = useCallback(
    async (input: {
      rollCallId: string;
      subjectType: 'member' | 'companion';
      memberId?: string | null;
      companionId?: string | null;
      present: boolean;
    }) => {
      if (!kafela) return;
      try {
        await kafelaApi.respondRollCall(kafela.id, input.rollCallId, {
          present: input.present,
          subjectType: input.subjectType,
          memberId: input.memberId,
          companionId: input.companionId,
        });
        setIsOffline(false);
      } catch {
        const items = await enqueueOutbox({
          type: 'roll_call_mark',
          kafelaId: kafela.id,
          rollCallId: input.rollCallId,
          subjectType: input.subjectType,
          memberId: input.memberId,
          companionId: input.companionId,
          present: input.present,
        });
        setOutbox(items);
        setIsOffline(true);
      }
    },
    [kafela]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void reloadOutbox();
  }, [reloadOutbox]);

  useEffect(() => {
    const onOnline = () => {
      void (async () => {
        await tryFlushOutbox();
        if (kafelaIdRef.current) await loadSnapshotSilent(kafelaIdRef.current);
      })();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadSnapshotSilent, tryFlushOutbox]);

  // Live SSE + visibility reconnect + slow fallback poll
  useEffect(() => {
    if (!isAuthenticated || authLoading || !kafela?.id) return;

    const kafelaId = kafela.id;
    let aborted = false;
    let abortController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let attempt = 0;

    const stopStream = () => {
      abortController?.abort();
      abortController = null;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (aborted || document.hidden) return;
      const delay = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        void startStream();
      }, delay);
    };

    const startStream = async () => {
      if (aborted || document.hidden) return;
      stopStream();
      abortController = new AbortController();
      try {
        await kafelaApi.subscribeEvents(
          kafelaId,
          (type) => {
            if (type === 'connected') {
              attempt = 0;
              void loadSnapshotSilent(kafelaId);
            } else if (type === 'changed') {
              void loadSnapshotSilent(kafelaId);
            }
          },
          abortController.signal
        );
        if (!aborted && !document.hidden) scheduleReconnect();
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err.name === 'AbortError' || aborted) return;
        scheduleReconnect();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stopStream();
      } else {
        attempt = 0;
        void loadSnapshotSilent(kafelaId);
        void startStream();
      }
    };

    void startStream();
    fallbackTimer = setInterval(() => {
      if (!document.hidden) void loadSnapshotSilent(kafelaId);
    }, LIVE_FALLBACK_MS);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      aborted = true;
      stopStream();
      if (fallbackTimer) clearInterval(fallbackTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, authLoading, kafela?.id, loadSnapshotSilent]);

  const value = useMemo<KafelaContextType>(
    () => ({
      loading,
      error,
      kafela,
      me,
      members,
      groups,
      broadcasts,
      sosEvents,
      rollCalls,
      isAdmin: me ? isKafelaAdmin(me.role) : false,
      canSendBroadcast: me ? canBroadcast(me.role) : false,
      liveRevision,
      lastUpdatedAt,
      isOffline,
      outbox,
      pendingCount: outbox.length,
      refresh,
      refreshMembers,
      refreshBroadcasts,
      refreshSos,
      refreshRollCalls,
      setLocalMe: setMe,
      setLocalKafela: setKafela,
      queueBroadcastAck,
      queueRollCallMark,
      clear,
    }),
    [
      loading,
      error,
      kafela,
      me,
      members,
      groups,
      broadcasts,
      sosEvents,
      rollCalls,
      liveRevision,
      lastUpdatedAt,
      isOffline,
      outbox,
      refresh,
      refreshMembers,
      refreshBroadcasts,
      refreshSos,
      refreshRollCalls,
      queueBroadcastAck,
      queueRollCallMark,
      clear,
    ]
  );

  return <KafelaContext.Provider value={value}>{children}</KafelaContext.Provider>;
};

export const useKafela = (): KafelaContextType => {
  const ctx = useContext(KafelaContext);
  if (!ctx) throw new Error('useKafela must be used within KafelaProvider');
  return ctx;
};
