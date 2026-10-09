import React, { useEffect, useState } from 'react';
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
  IonToggle,
  IonAlert,
} from '@ionic/react';
import { Megaphone, MapPin } from 'lucide-react';
import InscribedField from '../components/InscribedField';
import { useKafela } from '../contexts/KafelaContext';
import { kafelaApi } from '../services/kafelaApi';
import type { Broadcast } from '../types/kafela';
import { Geolocation } from '@capacitor/geolocation';

const KafelaBroadcastPage: React.FC = () => {
  const { kafela, me, groups, broadcasts, canSendBroadcast, isAdmin, refreshBroadcasts, liveRevision } =
    useKafela();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [includeRally, setIncludeRally] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackFor, setAckFor] = useState<Broadcast | null>(null);
  const [acks, setAcks] = useState<
    Array<{ memberId: string; displayName: string; seen: boolean; seenAt: string | null }>
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editUrgent, setEditUrgent] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Broadcast | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const canManage = (b: Broadcast) => {
    if (!me || !canSendBroadcast) return false;
    if (isAdmin) return true;
    return me.role === 'group_admin' && !!b.groupId && b.groupId === me.groupId;
  };

  const manageable = broadcasts.filter(canManage);

  useEffect(() => {
    void refreshBroadcasts();
  }, [refreshBroadcasts]);

  useEffect(() => {
    if (!kafela || !ackFor) return;
    void kafelaApi
      .broadcastAcks(kafela.id, ackFor.id)
      .then(setAcks)
      .catch(() => setAcks([]));
  }, [liveRevision, kafela, ackFor]);

  const send = async () => {
    if (!kafela || !title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      let rallyLat: number | null = null;
      let rallyLng: number | null = null;
      if (includeRally) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        rallyLat = pos.coords.latitude;
        rallyLng = pos.coords.longitude;
      }
      await kafelaApi.createBroadcast(kafela.id, {
        title: title.trim(),
        body: body.trim(),
        groupId: isAdmin ? groupId || null : me?.groupId ?? null,
        priority: urgent ? 'urgent' : 'info',
        rallyLat,
        rallyLng,
      });
      setTitle('');
      setBody('');
      setUrgent(false);
      setIncludeRally(false);
      await refreshBroadcasts();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(err.response?.data?.error || err.message || 'Could not send broadcast');
    } finally {
      setBusy(false);
    }
  };

  const loadAcks = async (b: Broadcast) => {
    if (!kafela) return;
    setAckFor(b);
    try {
      setAcks(await kafelaApi.broadcastAcks(kafela.id, b.id));
    } catch {
      setAcks([]);
    }
  };

  const apiMessage = (e: unknown, fallback: string) => {
    const err = e as { response?: { data?: { error?: string } }; message?: string };
    return err.response?.data?.error || err.message || fallback;
  };

  const startEdit = (b: Broadcast) => {
    setActionError(null);
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditBody(b.body);
    setEditUrgent(b.priority === 'urgent');
  };

  const saveEdit = async (b: Broadcast) => {
    if (!kafela || !editTitle.trim() || !editBody.trim()) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const priority = editUrgent ? 'urgent' : 'info';
      await kafelaApi.updateBroadcast(kafela.id, b.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        priority,
      });
      if (ackFor?.id === b.id) {
        setAckFor({ ...ackFor, title: editTitle.trim(), body: editBody.trim(), priority });
      }
      setEditingId(null);
      await refreshBroadcasts();
    } catch (e: unknown) {
      setActionError(apiMessage(e, 'Could not update broadcast'));
    } finally {
      setActionBusy(false);
    }
  };

  const removeOne = async (broadcastId: string) => {
    if (!kafela) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await kafelaApi.deleteBroadcast(kafela.id, broadcastId);
      if (ackFor?.id === broadcastId) setAckFor(null);
      if (editingId === broadcastId) setEditingId(null);
      await refreshBroadcasts();
    } catch (e: unknown) {
      setActionError(apiMessage(e, 'Could not delete broadcast'));
    } finally {
      setActionBusy(false);
    }
  };

  const removeAll = async () => {
    if (!kafela) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await kafelaApi.deleteAllBroadcasts(kafela.id);
      setAckFor(null);
      setEditingId(null);
      await refreshBroadcasts();
    } catch (e: unknown) {
      setActionError(apiMessage(e, 'Could not delete broadcasts'));
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/kafela" text="Kafela" />
          </IonButtons>
          <IonTitle>Broadcasts</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="sanctuary-content">
        <div className="box-border px-5 pb-28 pt-4 font-sans text-stitch-on-surface">
          {canSendBroadcast && (
            <section className="rounded-[24px] bg-white p-4 shadow-ambient">
              <h2 className="flex items-center gap-2 text-sm font-bold text-stitch-primary">
                <Megaphone size={16} /> Compose
              </h2>
              <div className="mt-3 space-y-3">
                <InscribedField
                  id="bcast-title"
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Bus leaves in 10 minutes"
                />
                <div>
                  <label
                    htmlFor="bcast-body"
                    className="mb-1 ml-1 block text-xs font-semibold text-stitch-primary/60"
                  >
                    Message
                  </label>
                  <textarea
                    id="bcast-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border-0 bg-stitch-surface-low px-4 py-3 text-base outline-none focus:ring-2 focus:ring-stitch-primary/30"
                    placeholder="Meet at tent 42. Do not go to Jamarat yet."
                  />
                </div>
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
                <label className="flex items-center justify-between rounded-xl bg-stitch-surface-low px-3 py-2 text-sm">
                  <span>Urgent (requires ack)</span>
                  <IonToggle checked={urgent} onIonChange={(e) => setUrgent(e.detail.checked)} />
                </label>
                <label className="flex items-center justify-between rounded-xl bg-stitch-surface-low px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> Attach rally pin (my location)
                  </span>
                  <IonToggle
                    checked={includeRally}
                    onIonChange={(e) => setIncludeRally(e.detail.checked)}
                  />
                </label>
                {error && <p className="text-sm font-medium text-red-700">{error}</p>}
                <button
                  type="button"
                  disabled={busy || !title.trim() || !body.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void send()}
                >
                  {busy ? <IonSpinner name="crescent" /> : <Megaphone size={18} />}
                  Send broadcast
                </button>
              </div>
            </section>
          )}

          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-stitch-primary">Inbox</h2>
              {manageable.length > 0 && (
                <button
                  type="button"
                  disabled={actionBusy}
                  className="text-xs font-semibold text-red-700 disabled:opacity-50"
                  onClick={() => setConfirmClear(true)}
                >
                  Delete all
                </button>
              )}
            </div>
            {actionError && <p className="text-sm font-medium text-red-700">{actionError}</p>}
            {broadcasts.length === 0 && (
              <p className="text-sm text-stitch-on-variant">No broadcasts yet.</p>
            )}
            {broadcasts.map((b) => {
              const editing = editingId === b.id;
              return (
                <article key={b.id} className="rounded-2xl bg-white p-4 shadow-ambient">
                  {editing ? (
                    <div className="space-y-3">
                      <InscribedField
                        id={`edit-title-${b.id}`}
                        label="Title"
                        value={editTitle}
                        onChange={setEditTitle}
                      />
                      <div>
                        <label
                          htmlFor={`edit-body-${b.id}`}
                          className="mb-1 ml-1 block text-xs font-semibold text-stitch-primary/60"
                        >
                          Message
                        </label>
                        <textarea
                          id={`edit-body-${b.id}`}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border-0 bg-stitch-surface-low px-4 py-3 text-base outline-none focus:ring-2 focus:ring-stitch-primary/30"
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-xl bg-stitch-surface-low px-3 py-2 text-sm">
                        <span>Urgent (requires ack)</span>
                        <IonToggle
                          checked={editUrgent}
                          onIonChange={(e) => setEditUrgent(e.detail.checked)}
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={actionBusy || !editTitle.trim() || !editBody.trim()}
                          className="flex flex-1 items-center justify-center rounded-2xl bg-stitch-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
                          onClick={() => void saveEdit(b)}
                        >
                          {actionBusy ? <IonSpinner name="crescent" /> : 'Save'}
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          className="flex-1 rounded-2xl bg-stitch-surface-low py-2.5 text-sm font-bold text-stitch-primary disabled:opacity-50"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">
                            {b.priority === 'urgent' ? '🚨 ' : ''}
                            {b.title}
                          </p>
                          <p className="mt-1 text-xs text-stitch-on-variant">
                            {b.group?.name || 'Whole kafela'} ·{' '}
                            {new Date(b.createdAt).toLocaleString()}
                            {b.rallyLat != null && b.rallyLng != null ? ' · rally pin' : ''}
                          </p>
                        </div>
                        {b.seenByMe ? (
                          <span className="text-[0.65rem] font-semibold uppercase text-green-700">
                            Seen
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg bg-stitch-primary px-2 py-1 text-xs font-bold text-white"
                            onClick={() =>
                              void kafelaApi
                                .ackBroadcast(kafela!.id, b.id)
                                .then(() => refreshBroadcasts())
                            }
                          >
                            Ack
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{b.body}</p>
                      {canSendBroadcast && (
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            className="text-left text-xs font-semibold text-stitch-primary"
                            onClick={() => void loadAcks(b)}
                          >
                            Seen by {b._count?.acks ?? 0} — view roster
                          </button>
                          {canManage(b) && (
                            <div className="flex shrink-0 items-center gap-3">
                              <button
                                type="button"
                                disabled={actionBusy}
                                className="text-xs font-semibold text-stitch-primary disabled:opacity-50"
                                onClick={() => startEdit(b)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={actionBusy}
                                className="text-xs font-semibold text-red-700 disabled:opacity-50"
                                onClick={() => setPendingDelete(b)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </section>

          {ackFor && (
            <section className="mt-4 rounded-[24px] border border-stitch-primary/20 bg-stitch-surface-low p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Acks: {ackFor.title}</h3>
                <button type="button" className="text-xs font-semibold" onClick={() => setAckFor(null)}>
                  Close
                </button>
              </div>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
                {acks.map((a) => (
                  <li key={a.memberId} className="flex justify-between">
                    <span>{a.displayName}</span>
                    <span className={a.seen ? 'text-green-700' : 'text-red-700'}>
                      {a.seen ? 'Seen' : 'Missing'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <IonAlert
          isOpen={!!pendingDelete}
          header="Delete this broadcast?"
          message={
            pendingDelete
              ? `"${pendingDelete.title}" will be removed for everyone in the kafela.`
              : ''
          }
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                const id = pendingDelete?.id;
                if (id) void removeOne(id);
              },
            },
          ]}
          onDidDismiss={() => setPendingDelete(null)}
        />

        <IonAlert
          isOpen={confirmClear}
          header="Delete all broadcasts?"
          message={
            isAdmin
              ? 'This removes every broadcast in this kafela, including group messages.'
              : 'This removes every broadcast sent to your group. Whole-kafela messages stay.'
          }
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            { text: 'Delete all', role: 'destructive', handler: () => void removeAll() },
          ]}
          onDidDismiss={() => setConfirmClear(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default KafelaBroadcastPage;
