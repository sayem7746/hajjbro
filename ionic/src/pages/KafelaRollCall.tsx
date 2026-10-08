import React, { useCallback, useEffect, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonSelect,
  IonSelectOption,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import InscribedField from '../components/InscribedField';
import { useKafela } from '../contexts/KafelaContext';
import { kafelaApi } from '../services/kafelaApi';
import type { RollCall } from '../types/kafela';

type RollStatus = {
  rollCall: RollCall;
  summary: { expected: number; present: number; missing: number };
  present: Array<{
    memberId: string;
    displayName: string;
    phone: string | null;
    present: boolean | null;
  }>;
  missing: Array<{
    memberId: string;
    displayName: string;
    phone: string | null;
    present: boolean | null;
  }>;
  myResponse: { memberId: string; present: boolean | null } | null;
};

const KafelaRollCallPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialId = params.get('id');

  const { kafela, me, groups, rollCalls, canSendBroadcast, isAdmin, refreshRollCalls, liveRevision } =
    useKafela();
  const [title, setTitle] = useState('Bus headcount');
  const [groupId, setGroupId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [status, setStatus] = useState<RollStatus | null>(null);

  const loadStatus = useCallback(
    async (id: string) => {
      if (!kafela) return;
      try {
        const data = (await kafelaApi.getRollCall(kafela.id, id)) as RollStatus;
        setStatus(data);
        setActiveId(id);
      } catch {
        setStatus(null);
      }
    },
    [kafela]
  );

  useEffect(() => {
    void refreshRollCalls();
  }, [refreshRollCalls]);

  useEffect(() => {
    if (initialId) void loadStatus(initialId);
  }, [initialId, loadStatus]);

  useEffect(() => {
    if (activeId) void loadStatus(activeId);
  }, [liveRevision, activeId, loadStatus]);

  const start = async () => {
    if (!kafela) return;
    setBusy(true);
    setError(null);
    try {
      const rc = await kafelaApi.createRollCall(kafela.id, {
        title: title.trim() || 'Roll call',
        groupId: isAdmin ? groupId || null : me?.groupId ?? null,
      });
      await refreshRollCalls();
      await loadStatus(rc.id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not start roll call');
    } finally {
      setBusy(false);
    }
  };

  const respond = async (present: boolean) => {
    if (!kafela || !activeId) return;
    await kafelaApi.respondRollCall(kafela.id, activeId, present);
    await loadStatus(activeId);
  };

  const close = async () => {
    if (!kafela || !activeId) return;
    await kafelaApi.closeRollCall(kafela.id, activeId);
    setStatus(null);
    setActiveId(null);
    await refreshRollCalls();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/kafela" text="Kafela" />
          </IonButtons>
          <IonTitle>Roll call</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="sanctuary-content">
        <div className="box-border px-5 pb-28 pt-4 font-sans text-stitch-on-surface">
          {canSendBroadcast && (
            <section className="rounded-[24px] bg-white p-4 shadow-ambient">
              <h2 className="flex items-center gap-2 text-sm font-bold text-stitch-primary">
                <ClipboardCheck size={16} /> Start roll call
              </h2>
              <div className="mt-3 space-y-3">
                <InscribedField
                  id="roll-title"
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Bus 1 headcount"
                />
                {isAdmin && (
                  <IonSelect
                    interface="popover"
                    placeholder="Whole kafela"
                    value={groupId}
                    onIonChange={(e) => setGroupId(String(e.detail.value ?? ''))}
                  >
                    <IonSelectOption value="">Whole kafela</IonSelectOption>
                    {groups.map((g) => (
                      <IonSelectOption key={g.id} value={g.id}>
                        {g.name}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                )}
                {error && <p className="text-sm font-medium text-red-700">{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void start()}
                >
                  {busy ? <IonSpinner name="crescent" /> : null}
                  Start
                </button>
              </div>
            </section>
          )}

          <section className="mt-5">
            <h2 className="text-lg font-extrabold text-stitch-primary">Open roll calls</h2>
            <ul className="mt-2 space-y-2">
              {rollCalls.map((rc) => (
                <li key={rc.id}>
                  <button
                    type="button"
                    className={`w-full rounded-2xl px-4 py-3 text-left shadow-ambient ${
                      activeId === rc.id ? 'bg-stitch-primary text-white' : 'bg-white'
                    }`}
                    onClick={() => void loadStatus(rc.id)}
                  >
                    <p className="font-semibold">{rc.title}</p>
                    <p
                      className={`text-xs ${
                        activeId === rc.id ? 'text-white/80' : 'text-stitch-on-variant'
                      }`}
                    >
                      {rc.group?.name || 'Whole kafela'} · {rc._count?.responses ?? 0} responses
                    </p>
                  </button>
                </li>
              ))}
              {rollCalls.length === 0 && (
                <p className="text-sm text-stitch-on-variant">No open roll calls.</p>
              )}
            </ul>
          </section>

          {status && (
            <section className="mt-6 rounded-[24px] bg-white p-4 shadow-ambient">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{status.rollCall.title}</h3>
                  <p className="text-sm text-stitch-on-variant">
                    {status.summary.present}/{status.summary.expected} present ·{' '}
                    {status.summary.missing} missing
                  </p>
                </div>
                {canSendBroadcast && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-700"
                    onClick={() => void close()}
                  >
                    Close
                  </button>
                )}
              </div>

              {status.myResponse?.present !== true && (
                <button
                  type="button"
                  className="mt-3 w-full rounded-2xl bg-green-700 py-3 text-sm font-bold text-white"
                  onClick={() => void respond(true)}
                >
                  I&apos;m present
                </button>
              )}

              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-800">
                  Missing ({status.missing.length})
                </h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {status.missing.map((m) => (
                    <li key={m.memberId} className="flex justify-between">
                      <span>{m.displayName}</span>
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="font-semibold text-stitch-primary">
                          Call
                        </a>
                      )}
                    </li>
                  ))}
                  {status.missing.length === 0 && (
                    <li className="text-green-700">Everyone accounted for</li>
                  )}
                </ul>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-800">
                  Present ({status.present.length})
                </h4>
                <ul className="mt-2 space-y-1 text-sm text-stitch-on-variant">
                  {status.present.map((m) => (
                    <li key={m.memberId}>{m.displayName}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default KafelaRollCallPage;
