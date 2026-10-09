import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonToggle,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonAlert,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import {
  Users,
  KeyRound,
  Plus,
  Megaphone,
  MapPinned,
  Siren,
  ClipboardList,
  Layers,
  Phone,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import AppHeader from '../components/AppHeader';
import InscribedField from '../components/InscribedField';
import { useKafela } from '../contexts/KafelaContext';
import { useAuth } from '../contexts/AuthContext';
import { kafelaApi } from '../services/kafelaApi';
import { useKafelaLocationSharing } from '../hooks/useKafelaLocationSharing';
import {
  COMPANION_RELATION_LABELS,
  householdLabel,
  householdSize,
  memberLabel,
  type KafelaCompanionRelation,
  type KafelaMember,
} from '../types/kafela';
import { Geolocation } from '@capacitor/geolocation';

const MAX_COMPANIONS = 3;

const KafelaPage: React.FC = () => {
  const router = useIonRouter();
  const { user } = useAuth();
  const {
    loading,
    error,
    kafela,
    me,
    members,
    groups,
    broadcasts,
    sosEvents,
    rollCalls,
    isAdmin,
    canSendBroadcast,
    refresh,
    setLocalMe,
    setLocalKafela,
    isOffline,
    lastUpdatedAt,
    pendingCount,
    queueBroadcastAck,
  } = useKafela();

  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [sharingConsent, setSharingConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sosNote, setSosNote] = useState('');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosCompanionId, setSosCompanionId] = useState<string>('');
  const [sosError, setSosError] = useState<string | null>(null);
  const [companionName, setCompanionName] = useState('');
  const [companionRelation, setCompanionRelation] = useState<KafelaCompanionRelation>('spouse');
  const [householdTargetId, setHouseholdTargetId] = useState<string | null>(null);
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  useKafelaLocationSharing(kafela?.id, Boolean(me?.sharingEnabled));

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const label = householdLabel(m).toLowerCase();
      return (
        label.includes(q) ||
        (m.phone || '').includes(q) ||
        (m.tentOrRoom || '').toLowerCase().includes(q) ||
        (m.group?.name || '').toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  const ungroupedCount = members.filter((m) => !m.groupId).length;
  const householdTarget: KafelaMember | null = useMemo(() => {
    if (!me) return null;
    const id = householdTargetId || me.id;
    return members.find((m) => m.id === id) || me;
  }, [householdTargetId, me, members]);
  const myCompanions = me?.companions ?? [];
  const editingCompanions = householdTarget?.companions ?? [];
  const canEditHousehold =
    !!householdTarget && (householdTarget.id === me?.id || isAdmin);

  const handleCreate = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await kafelaApi.create({
        name: name.trim(),
        displayName: user?.name,
        sharingEnabled: false,
      });
      // enable sharing after create if consented
      await refresh();
      if (sharingConsent) {
        const mine = await kafelaApi.getMine();
        if (mine) {
          const updated = await kafelaApi.updateMe(mine.kafela.id, {
            sharingEnabled: true,
          });
          setLocalMe(updated);
          setLocalKafela(mine.kafela);
        }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setFormError(err.response?.data?.error || err.message || 'Could not create kafela');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await kafelaApi.join({
        joinCode: joinCode.trim(),
        sharingEnabled: sharingConsent,
        displayName: user?.name,
      });
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setFormError(err.response?.data?.error || err.message || 'Could not join kafela');
    } finally {
      setBusy(false);
    }
  };

  const toggleSharing = async (enabled: boolean) => {
    if (!kafela) return;
    try {
      const updated = await kafelaApi.updateMe(kafela.id, { sharingEnabled: enabled });
      setLocalMe(updated);
    } catch {
      /* ignore */
    }
  };

  const copyCode = async () => {
    if (!kafela) return;
    try {
      await navigator.clipboard.writeText(kafela.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const rotateCode = async () => {
    if (!kafela) return;
    try {
      const updated = await kafelaApi.rotateCode(kafela.id);
      setLocalKafela(updated);
    } catch {
      /* ignore */
    }
  };

  const leave = async () => {
    if (!kafela) return;
    try {
      await kafelaApi.leave(kafela.id);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setFormError(err.response?.data?.error || 'Could not leave kafela');
    }
  };

  const sendSos = async (note?: string) => {
    if (!kafela) return;
    setBusy(true);
    setSosError(null);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        /* optional */
      }
      await kafelaApi.createSos(kafela.id, {
        latitude,
        longitude,
        note: (note ?? sosNote).trim() || 'I need help',
        companionId: sosCompanionId || null,
      });
      setSosNote('');
      setSosCompanionId('');
      setSosOpen(false);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setSosError(err.response?.data?.error || err.message || 'SOS was not sent. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const addCompanion = async () => {
    if (!kafela || !householdTarget || !companionName.trim()) return;
    setHouseholdBusy(true);
    setHouseholdError(null);
    try {
      await kafelaApi.createCompanion(kafela.id, householdTarget.id, {
        name: companionName.trim(),
        relation: companionRelation,
      });
      setCompanionName('');
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setHouseholdError(err.response?.data?.error || err.message || 'Could not add companion');
    } finally {
      setHouseholdBusy(false);
    }
  };

  const removeCompanion = async (companionId: string) => {
    if (!kafela) return;
    setHouseholdBusy(true);
    setHouseholdError(null);
    try {
      await kafelaApi.deleteCompanion(kafela.id, companionId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setHouseholdError(err.response?.data?.error || err.message || 'Could not remove companion');
    } finally {
      setHouseholdBusy(false);
    }
  };

  const promoteMember = async (memberId: string, role: 'kafela_admin' | 'member') => {
    if (!kafela) return;
    try {
      await kafelaApi.updateMemberRole(kafela.id, memberId, role);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setFormError(err.response?.data?.error || 'Could not update role');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!kafela) return;
    try {
      await kafelaApi.removeMember(kafela.id, memberId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setFormError(err.response?.data?.error || 'Could not remove member');
    }
  };

  const onRefresh = async (e: CustomEvent) => {
    await refresh();
    (e.target as HTMLIonRefresherElement).complete();
  };

  if (loading) {
    return (
      <IonPage>
        <AppHeader title="Kafela" />
        <IonContent className="sanctuary-content">
          <div className="flex min-h-[50vh] items-center justify-center">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!kafela || !me) {
    return (
      <IonPage>
        <AppHeader title="Kafela" />
        <IonContent fullscreen className="sanctuary-content">
          <div className="box-border w-full max-w-full px-5 pb-28 pt-4 font-sans text-stitch-on-surface">
            <h1 className="text-2xl font-extrabold tracking-tight text-stitch-primary">
              Travel with your group
            </h1>
            <p className="mt-2 text-sm text-stitch-on-variant">
              Create a kafela or join with a code so leaders can find you in the crowd.
            </p>

            <div className="mt-5 flex gap-2 rounded-2xl bg-stitch-surface-low p-1">
              <button
                type="button"
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                  mode === 'join' ? 'bg-stitch-primary text-white' : 'text-stitch-on-variant'
                }`}
                onClick={() => setMode('join')}
              >
                Join
              </button>
              <button
                type="button"
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                  mode === 'create' ? 'bg-stitch-primary text-white' : 'text-stitch-on-variant'
                }`}
                onClick={() => setMode('create')}
              >
                Create
              </button>
            </div>

            <div className="mt-6 space-y-4 rounded-[28px] bg-white p-5 shadow-ambient">
              {mode === 'join' ? (
                <InscribedField
                  id="kafela-join-code"
                  label="Join code"
                  value={joinCode}
                  onChange={(v) => setJoinCode(v.toUpperCase())}
                  placeholder="HB-7K4M"
                  autoComplete="off"
                />
              ) : (
                <InscribedField
                  id="kafela-name"
                  label="Kafela name"
                  value={name}
                  onChange={setName}
                  placeholder="e.g. Dhaka Group 2026"
                  autoComplete="organization"
                />
              )}

              <label className="flex items-start gap-3 rounded-2xl bg-stitch-surface-low px-4 py-3">
                <IonToggle
                  checked={sharingConsent}
                  onIonChange={(e) => setSharingConsent(e.detail.checked)}
                />
                <span className="text-sm leading-snug text-stitch-on-surface">
                  Share my location with my group and kafela leaders during this Hajj
                </span>
              </label>

              {(formError || error) && (
                <p className="text-sm font-medium text-red-700">{formError || error}</p>
              )}

              <button
                type="button"
                disabled={busy || (mode === 'join' ? !joinCode.trim() : name.trim().length < 2)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
                onClick={() => void (mode === 'join' ? handleJoin() : handleCreate())}
              >
                {busy ? <IonSpinner name="crescent" /> : mode === 'join' ? <KeyRound size={18} /> : <Plus size={18} />}
                {mode === 'join' ? 'Join kafela' : 'Create kafela'}
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <AppHeader title="Kafela" />
      <IonContent fullscreen className="sanctuary-content">
        <IonRefresher slot="fixed" onIonRefresh={(e) => void onRefresh(e)}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="box-border w-full max-w-full px-5 pb-28 pt-3 font-sans text-stitch-on-surface">
          <div className="rounded-[28px] bg-white p-5 shadow-ambient">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stitch-on-variant">
                  Your kafela
                </p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-stitch-primary">
                  {kafela.name}
                </h1>
                <p className="mt-1 text-sm text-stitch-on-variant">
                  {kafela.headcount ??
                    members.reduce((n, m) => n + householdSize(m), 0)}{' '}
                  people · {kafela._count?.members ?? members.length} phones · {groups.length}{' '}
                  groups
                  {ungroupedCount > 0 ? ` · ${ungroupedCount} ungrouped` : ''}
                </p>
              </div>
              <Users className="h-8 w-8 shrink-0 text-stitch-primary/40" />
            </div>

            {(isOffline || pendingCount > 0) && (
              <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {isOffline
                  ? 'Showing last saved kafela data. Changes will sync when you are online.'
                  : 'Connection restored; waiting items will sync shortly.'}
                {lastUpdatedAt && (
                  <span className="mt-1 block text-xs text-amber-800/80">
                    Last updated {new Date(lastUpdatedAt).toLocaleString()}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="mt-1 block text-xs font-semibold">
                    {pendingCount} waiting to sync
                  </span>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-stitch-surface-low px-4 py-3">
                <span className="font-mono text-lg font-bold tracking-widest text-stitch-primary">
                  {kafela.joinCode}
                </span>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-stitch-primary shadow-sm"
                  onClick={() => void copyCode()}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-stitch-primary shadow-sm"
                  onClick={() => void rotateCode()}
                >
                  <RefreshCw size={14} />
                  Rotate
                </button>
              </div>
            )}

            <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-stitch-surface-low px-4 py-3">
              <span className="text-sm font-medium">Location sharing</span>
              <IonToggle
                checked={me.sharingEnabled}
                onIonChange={(e) => void toggleSharing(e.detail.checked)}
              />
            </label>
          </div>

          <section className="mt-4 rounded-[24px] bg-white p-4 shadow-ambient">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-stitch-primary">My household</h2>
                <p className="mt-1 text-xs text-stitch-on-variant">
                  Add family without the app (up to {MAX_COMPANIONS} companions on this phone).
                </p>
              </div>
              <span className="rounded-full bg-stitch-surface-low px-2 py-1 text-xs font-bold text-stitch-primary">
                {householdSize(me)}/4
              </span>
            </div>

            {isAdmin && (
              <IonSelect
                className="mt-3"
                interface="popover"
                value={householdTarget?.id ?? me.id}
                onIonChange={(e) => setHouseholdTargetId(String(e.detail.value ?? me.id))}
              >
                {members.map((m) => (
                  <IonSelectOption key={m.id} value={m.id}>
                    {memberLabel(m)}
                    {m.id === me.id ? ' (you)' : ''} · {householdSize(m)} people
                  </IonSelectOption>
                ))}
              </IonSelect>
            )}

            <ul className="mt-3 space-y-2">
              <li className="rounded-xl bg-stitch-surface-low px-3 py-2 text-sm font-semibold">
                {memberLabel(householdTarget || me)} · phone holder
              </li>
              {editingCompanions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stitch-surface-low px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-stitch-on-variant">
                      {' '}
                      · {COMPANION_RELATION_LABELS[c.relation]}
                    </span>
                  </span>
                  {canEditHousehold && (
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-red-700"
                      aria-label={`Remove ${c.name}`}
                      disabled={householdBusy}
                      onClick={() => void removeCompanion(c.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {canEditHousehold && editingCompanions.length < MAX_COMPANIONS && (
              <div className="mt-3 space-y-2">
                <InscribedField
                  id="companion-name"
                  label="Companion name"
                  value={companionName}
                  onChange={setCompanionName}
                  placeholder="e.g. Amina"
                />
                <IonSelect
                  interface="popover"
                  value={companionRelation}
                  onIonChange={(e) =>
                    setCompanionRelation(
                      (e.detail.value as KafelaCompanionRelation) || 'other'
                    )
                  }
                >
                  {(Object.keys(COMPANION_RELATION_LABELS) as KafelaCompanionRelation[]).map(
                    (key) => (
                      <IonSelectOption key={key} value={key}>
                        {COMPANION_RELATION_LABELS[key]}
                      </IonSelectOption>
                    )
                  )}
                </IonSelect>
                {householdError && (
                  <p className="text-sm font-medium text-red-700">{householdError}</p>
                )}
                <button
                  type="button"
                  disabled={householdBusy || !companionName.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void addCompanion()}
                >
                  {householdBusy ? <IonSpinner name="crescent" /> : <Plus size={16} />}
                  Add to household
                </button>
              </div>
            )}
          </section>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ActionCard
              icon={<MapPinned size={20} />}
              label="Live map"
              onClick={() => router.push('/app/map?view=kafela')}
            />
            <ActionCard
              icon={<Layers size={20} />}
              label="Groups"
              onClick={() => router.push('/app/kafela/groups')}
            />
            {canSendBroadcast && (
              <ActionCard
                icon={<Megaphone size={20} />}
                label="Broadcast"
                onClick={() => router.push('/app/kafela/broadcast')}
              />
            )}
            <ActionCard
              icon={<ClipboardList size={20} />}
              label="Roll call"
              onClick={() => router.push('/app/kafela/roll-call')}
            />
            <ActionCard
              icon={<Siren size={20} />}
              label="SOS"
              danger
              onClick={() => setSosOpen(true)}
            />
            <ActionCard
              icon={<LogOut size={20} />}
              label="Leave"
              onClick={() => setLeaveOpen(true)}
            />
          </div>

          {sosEvents.length > 0 && (
            <section className="mt-5 rounded-[24px] border border-red-200 bg-red-50 p-4">
              <h2 className="text-sm font-bold text-red-800">Open SOS ({sosEvents.length})</h2>
              <ul className="mt-2 space-y-2">
                {sosEvents.slice(0, 3).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-red-900">
                      {s.member.displayName || s.member.user.name || 'Pilgrim'}
                      {s.note ? ` — ${s.note}` : ''}
                    </span>
                    {(isAdmin || me.role === 'group_admin') && (
                      <button
                        type="button"
                        className="rounded-lg bg-red-800 px-2 py-1 text-xs font-semibold text-white"
                        onClick={() => void kafelaApi.resolveSos(kafela.id, s.id).then(() => refresh())}
                      >
                        Resolve
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {broadcasts[0] && (
            <section className="mt-5 rounded-[24px] bg-white p-4 shadow-ambient">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stitch-primary">Latest broadcast</h2>
                <button
                  type="button"
                  className="text-xs font-semibold text-stitch-primary"
                  onClick={() => router.push('/app/kafela/broadcast')}
                >
                  View all
                </button>
              </div>
              <p className="mt-2 font-semibold">{broadcasts[0].title}</p>
              <p className="mt-1 text-sm text-stitch-on-variant line-clamp-2">{broadcasts[0].body}</p>
              {!broadcasts[0].seenByMe && (
                <button
                  type="button"
                  className="mt-3 rounded-xl bg-stitch-primary px-3 py-2 text-xs font-bold text-white"
                  onClick={() => void queueBroadcastAck(broadcasts[0].id)}
                >
                  Mark as seen
                  {myCompanions.length > 0
                    ? ` (for ${householdSize(me)})`
                    : ''}
                </button>
              )}
            </section>
          )}

          {rollCalls[0] && (
            <section className="mt-4 rounded-[24px] bg-stitch-surface-low px-4 py-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => router.push(`/app/kafela/roll-call?id=${rollCalls[0].id}`)}
              >
                <span className="text-sm font-semibold">Active roll call: {rollCalls[0].title}</span>
                <span className="text-xs font-bold text-stitch-primary">Open</span>
              </button>
            </section>
          )}

          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-stitch-primary">Roster</h2>
            </div>
            <IonSearchbar
              value={search}
              onIonInput={(e) => setSearch(String(e.detail.value ?? ''))}
              placeholder="Search name, tent, phone"
              className="kafela-search px-0"
            />
            <ul className="mt-2 space-y-2">
              {filteredMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-ambient"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: m.group?.color || '#13423d' }}
                  >
                    {memberLabel(m).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {memberLabel(m)}
                      {m.id === me.id ? ' (you)' : ''}
                    </p>
                    <p className="truncate text-xs text-stitch-on-variant">
                      {m.role === 'kafela_admin'
                        ? 'Kafela admin'
                        : m.role === 'group_admin'
                          ? 'Group admin'
                          : 'Member'}
                      {m.group ? ` · ${m.group.name}` : ' · Ungrouped'}
                      {m.tentOrRoom ? ` · ${m.tentOrRoom}` : ''}
                      {householdSize(m) > 1 ? ` · household ${householdSize(m)}` : ''}
                      {!m.sharingEnabled ? ' · sharing off' : ''}
                    </p>
                    {(m.companions?.length ?? 0) > 0 && (
                      <p className="truncate text-xs text-stitch-on-variant">
                        With {m.companions!.map((c) => c.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {(m.phone || m.user.phone) && (
                      <a
                        href={`tel:${m.phone || m.user.phone}`}
                        className="rounded-full bg-stitch-surface-low p-2 text-stitch-primary"
                        aria-label={`Call ${memberLabel(m)}`}
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    {isAdmin && m.id !== me.id && (
                      <>
                        <button
                          type="button"
                          className="rounded-lg bg-stitch-surface-low px-2 py-1 text-[0.65rem] font-bold text-stitch-primary"
                          onClick={() =>
                            void promoteMember(
                              m.id,
                              m.role === 'kafela_admin' ? 'member' : 'kafela_admin'
                            )
                          }
                        >
                          {m.role === 'kafela_admin' ? 'Demote' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-50 px-2 py-1 text-[0.65rem] font-bold text-red-800"
                          onClick={() => void removeMember(m.id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <IonAlert
          isOpen={leaveOpen}
          header="Leave kafela?"
          message="You will lose access to this group's map and broadcasts."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Leave', role: 'destructive', handler: () => void leave() },
          ]}
          onDidDismiss={() => setLeaveOpen(false)}
        />

        {sosOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-ambient">
              <h2 className="text-lg font-extrabold text-red-800">Send SOS</h2>
              <p className="mt-1 text-sm text-stitch-on-variant">
                Leaders get this phone’s location. Choose who needs help.
              </p>
              <label className="mt-4 block text-xs font-semibold text-stitch-primary/60">
                Who needs help
              </label>
              <IonSelect
                interface="popover"
                className="mt-1 w-full rounded-xl bg-stitch-surface-low px-2"
                value={sosCompanionId}
                onIonChange={(e) => setSosCompanionId(String(e.detail.value ?? ''))}
              >
                <IonSelectOption value="">Me ({memberLabel(me)})</IonSelectOption>
                {myCompanions.map((c) => (
                  <IonSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <div className="mt-3">
                <InscribedField
                  id="sos-note"
                  label="Note (optional)"
                  value={sosNote}
                  onChange={setSosNote}
                  placeholder="e.g. near Jamarat"
                />
              </div>
              {sosError && (
                <p className="mt-3 text-sm font-medium text-red-700">{sosError}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-2xl bg-stitch-surface-low py-3 text-sm font-bold text-stitch-primary"
                  disabled={busy}
                  onClick={() => {
                    setSosOpen(false);
                    setSosError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-2xl bg-red-700 py-3 text-sm font-bold text-white disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void sendSos()}
                >
                  {busy ? <IonSpinner name="crescent" /> : sosError ? 'Retry SOS' : 'Send SOS'}
                </button>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

const ActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left shadow-ambient ${
      danger ? 'bg-red-50 text-red-800' : 'bg-white text-stitch-on-surface'
    }`}
  >
    <span className={danger ? 'text-red-700' : 'text-stitch-primary'}>{icon}</span>
    <span className="text-sm font-bold">{label}</span>
  </button>
);

export default KafelaPage;
