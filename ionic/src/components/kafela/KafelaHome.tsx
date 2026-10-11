import React, { useState } from 'react';
import { IonToggle } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import {
  Users,
  Megaphone,
  MapPinned,
  Siren,
  ClipboardList,
  Layers,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { useKafela } from '../../contexts/KafelaContext';
import { kafelaApi } from '../../services/kafelaApi';
import { householdSize } from '../../types/kafela';
import VoiceBroadcastPlayer from './VoiceBroadcastPlayer';

type Props = {
  onOpenSos: () => void;
  onLeave: () => void;
  onOpenPeople: () => void;
};

const KafelaHome: React.FC<Props> = ({ onOpenSos, onLeave, onOpenPeople }) => {
  const router = useIonRouter();
  const {
    kafela,
    me,
    members,
    groups,
    broadcasts,
    sosEvents,
    rollCalls,
    leaveRequests,
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

  const [copied, setCopied] = useState(false);
  const [leaveActionBusy, setLeaveActionBusy] = useState(false);

  if (!kafela || !me) return null;

  const ungroupedCount = members.filter((m) => !m.groupId).length;
  const myCompanions = me.companions ?? [];
  const myPendingLeave = leaveRequests.find(
    (r) => r.status === 'pending' && r.memberId === me.id
  );
  const adminPendingCount = isAdmin
    ? leaveRequests.filter((r) => r.status === 'pending' && r.memberId !== me.id).length
    : 0;

  const cancelLeaveRequest = async () => {
    if (!myPendingLeave) return;
    setLeaveActionBusy(true);
    try {
      await kafelaApi.cancelLeaveRequest(kafela.id, myPendingLeave.id);
      await refresh();
    } catch {
      /* refresh will surface state */
    } finally {
      setLeaveActionBusy(false);
    }
  };

  const toggleSharing = async (enabled: boolean) => {
    try {
      const updated = await kafelaApi.updateMe(kafela.id, { sharingEnabled: enabled });
      setLocalMe(updated);
    } catch {
      /* ignore */
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(kafela.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const rotateCode = async () => {
    try {
      const updated = await kafelaApi.rotateCode(kafela.id);
      setLocalKafela(updated);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
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
              {kafela.headcount ?? members.reduce((n, m) => n + householdSize(m), 0)} people ·{' '}
              {kafela._count?.members ?? members.length} phones · {groups.length} groups
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

      {sosEvents.length > 0 && (
        <section className="rounded-[24px] border border-red-200 bg-red-50 p-4">
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
        <section className="rounded-[24px] bg-white p-4 shadow-ambient">
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
          {broadcasts[0].audioPath && kafela ? (
            <VoiceBroadcastPlayer
              kafelaId={kafela.id}
              broadcastId={broadcasts[0].id}
              durationMs={broadcasts[0].audioDurationMs}
            />
          ) : (
            <p className="mt-1 line-clamp-2 text-sm text-stitch-on-variant">{broadcasts[0].body}</p>
          )}
          {!broadcasts[0].seenByMe && (
            <button
              type="button"
              className="mt-3 rounded-xl bg-stitch-primary px-3 py-2 text-xs font-bold text-white"
              onClick={() => void queueBroadcastAck(broadcasts[0].id)}
            >
              Mark as seen
              {myCompanions.length > 0 ? ` (for ${householdSize(me)})` : ''}
            </button>
          )}
        </section>
      )}

      {rollCalls[0] && (
        <section className="rounded-[24px] bg-stitch-surface-low px-4 py-3">
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

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {adminPendingCount > 0 && (
        <button
          type="button"
          onClick={onOpenPeople}
          className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-950 shadow-ambient"
        >
          {adminPendingCount === 1
            ? '1 member asked to leave — review on People'
            : `${adminPendingCount} members asked to leave — review on People`}
        </button>
      )}

      <button
        type="button"
        onClick={onOpenSos}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-bold text-red-800 shadow-ambient"
      >
        <Siren size={20} className="text-red-700" />
        Send SOS
      </button>

      {myPendingLeave ? (
        <div className="space-y-2 rounded-2xl bg-stitch-surface-low px-4 py-3 text-center">
          <p className="text-sm font-semibold text-stitch-on-surface">
            Waiting for a kafela admin to approve your leave
          </p>
          <button
            type="button"
            disabled={leaveActionBusy}
            onClick={() => void cancelLeaveRequest()}
            className="w-full py-1 text-sm font-semibold text-stitch-primary disabled:opacity-50"
          >
            {leaveActionBusy ? 'Cancelling…' : 'Cancel leave request'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          className="w-full py-2 text-center text-sm font-semibold text-stitch-on-variant"
        >
          Leave kafela
        </button>
      )}
    </div>
  );
};

const ActionCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left text-stitch-on-surface shadow-ambient"
  >
    <span className="text-stitch-primary">{icon}</span>
    <span className="text-sm font-bold">{label}</span>
  </button>
);

export default KafelaHome;
