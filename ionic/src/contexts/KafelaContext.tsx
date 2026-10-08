import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { kafelaApi } from '../services/kafelaApi';
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
  refresh: () => Promise<void>;
  refreshMembers: (q?: string) => Promise<void>;
  refreshBroadcasts: () => Promise<void>;
  refreshSos: () => Promise<void>;
  refreshRollCalls: () => Promise<void>;
  setLocalMe: (me: KafelaMember) => void;
  setLocalKafela: (k: KafelaSummary) => void;
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
    kafelaIdRef.current = null;
  }, []);

  const applySnapshot = useCallback(
    (snap: {
      kafela: KafelaSummary;
      me: KafelaMember;
      members: KafelaMember[];
      groups: KafelaGroupSummary[];
      broadcasts: Broadcast[];
      sosEvents: SosEvent[];
      rollCalls: RollCall[];
    }) => {
      setKafela(snap.kafela);
      setMe(snap.me);
      setMembers(snap.members);
      setGroups(snap.groups);
      setBroadcasts(snap.broadcasts);
      setSosEvents(snap.sosEvents);
      setRollCalls(snap.rollCalls);
      kafelaIdRef.current = snap.kafela.id;
      setLiveRevision((n) => n + 1);
    },
    []
  );

  const refreshMembers = useCallback(
    async (q?: string) => {
      if (!kafela) return;
      const list = await kafelaApi.listMembers(kafela.id, q);
      setMembers(list);
    },
    [kafela]
  );

  const refreshBroadcasts = useCallback(async () => {
    if (!kafela) return;
    setBroadcasts(await kafelaApi.listBroadcasts(kafela.id));
  }, [kafela]);

  const refreshSos = useCallback(async () => {
    if (!kafela) return;
    setSosEvents(await kafelaApi.listSos(kafela.id, true));
  }, [kafela]);

  const refreshRollCalls = useCallback(async () => {
    if (!kafela) return;
    setRollCalls(await kafelaApi.listRollCalls(kafela.id));
  }, [kafela]);

  const loadSnapshotSilent = useCallback(async (kafelaId: string) => {
    if (snapshotInFlight.current) {
      snapshotQueued.current = true;
      await snapshotInFlight.current;
      return;
    }
    const run = (async () => {
      try {
        do {
          snapshotQueued.current = false;
          const snap = await kafelaApi.getSnapshot(kafelaId);
          applySnapshot(snap);
          setError(null);
        } while (snapshotQueued.current);
      } catch (e: unknown) {
        const err = e as { response?: { status?: number }; message?: string };
        if (err.response?.status === 401 || err.response?.status === 403) {
          clear();
        }
      } finally {
        snapshotInFlight.current = null;
      }
    })();
    snapshotInFlight.current = run;
    await run;
  }, [applySnapshot, clear]);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      clear();
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mine = await kafelaApi.getMine();
      if (!mine) {
        clear();
        return;
      }
      setKafela(mine.kafela);
      setMe(mine.me);
      kafelaIdRef.current = mine.kafela.id;
      const snap = await kafelaApi.getSnapshot(mine.kafela.id);
      applySnapshot(snap);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string }; status?: number }; message?: string };
      // Keep existing state on transient errors; only clear on hard auth failures
      if (err.response?.status === 401) {
        clear();
      }
      setError(err.response?.data?.error || err.message || 'Failed to load kafela');
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, clear, applySnapshot]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
        // Stream ended cleanly — reconnect
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
      refresh,
      refreshMembers,
      refreshBroadcasts,
      refreshSos,
      refreshRollCalls,
      setLocalMe: setMe,
      setLocalKafela: setKafela,
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
      refresh,
      refreshMembers,
      refreshBroadcasts,
      refreshSos,
      refreshRollCalls,
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
