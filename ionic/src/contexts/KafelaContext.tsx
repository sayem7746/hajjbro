import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const clear = useCallback(() => {
    setKafela(null);
    setMe(null);
    setMembers([]);
    setGroups([]);
    setBroadcasts([]);
    setSosEvents([]);
    setRollCalls([]);
    setError(null);
  }, []);

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
      const [memberList, groupList, bcasts, sos, rolls] = await Promise.all([
        kafelaApi.listMembers(mine.kafela.id),
        kafelaApi.listGroups(mine.kafela.id),
        kafelaApi.listBroadcasts(mine.kafela.id),
        kafelaApi.listSos(mine.kafela.id, true),
        kafelaApi.listRollCalls(mine.kafela.id),
      ]);
      setMembers(memberList);
      setGroups(groupList);
      setBroadcasts(bcasts);
      setSosEvents(sos);
      setRollCalls(rolls);
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
  }, [authLoading, isAuthenticated, clear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
