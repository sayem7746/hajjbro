import React, { useEffect, useRef, useState } from 'react';
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
import { Megaphone, MapPin, Mic, Square } from 'lucide-react';
import InscribedField from '../components/InscribedField';
import VoiceBroadcastPlayer from '../components/kafela/VoiceBroadcastPlayer';
import { useKafela } from '../contexts/KafelaContext';
import { kafelaApi } from '../services/kafelaApi';
import {
  MAX_VOICE_MS,
  cancelVoiceRecording,
  formatVoiceDuration,
  revokeVoiceClip,
  startVoiceRecording,
  stopVoiceRecording,
  type VoiceClip,
} from '../services/kafelaVoiceRecorder';
import type { Broadcast } from '../types/kafela';
import { Geolocation } from '@capacitor/geolocation';

const isVoiceBroadcast = (b: Broadcast) => !!b.audioPath;

const KafelaBroadcastPage: React.FC = () => {
  const {
    kafela,
    me,
    groups,
    broadcasts,
    canSendBroadcast,
    isAdmin,
    refreshBroadcasts,
    liveRevision,
    queueBroadcastAck,
    isOffline,
    pendingCount,
    lastUpdatedAt,
  } = useKafela();
  const [composeMode, setComposeMode] = useState<'text' | 'voice'>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [groupId, setGroupId] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [includeRally, setIncludeRally] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordElapsedMs, setRecordElapsedMs] = useState(0);
  const [voiceClip, setVoiceClip] = useState<VoiceClip | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishingRecordRef = useRef(false);
  const [ackFor, setAckFor] = useState<Broadcast | null>(null);
  const [acks, setAcks] = useState<
    Array<{
      memberId: string;
      displayName: string;
      householdSize?: number;
      confirmedFor?: number;
      label?: string;
      seen: boolean;
      seenAt: string | null;
    }>
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editUrgent, setEditUrgent] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Broadcast | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const clearRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const clearVoiceClip = () => {
    setVoiceClip((prev) => {
      revokeVoiceClip(prev);
      return null;
    });
  };

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

  useEffect(() => {
    return () => {
      clearRecordTimer();
      void cancelVoiceRecording();
      revokeVoiceClip(voiceClip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const resolveRally = async () => {
    if (!includeRally) return { rallyLat: null as number | null, rallyLng: null as number | null };
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      rallyLat: pos.coords.latitude,
      rallyLng: pos.coords.longitude,
    };
  };

  const finishRecording = async () => {
    if (finishingRecordRef.current) return;
    finishingRecordRef.current = true;
    clearRecordTimer();
    try {
      const clip = await stopVoiceRecording();
      setRecordElapsedMs(clip.durationMs);
      setVoiceClip((prev) => {
        revokeVoiceClip(prev);
        return clip;
      });
    } catch (e: unknown) {
      setRecordElapsedMs(0);
      const err = e as { message?: string };
      setError(err.message || 'Could not finish recording');
    } finally {
      setRecording(false);
      finishingRecordRef.current = false;
    }
  };

  const startRecording = async () => {
    setError(null);
    clearVoiceClip();
    setRecordElapsedMs(0);
    finishingRecordRef.current = false;
    try {
      await startVoiceRecording();
      setRecording(true);
      const startedAt = Date.now();
      clearRecordTimer();
      recordTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setRecordElapsedMs(Math.min(elapsed, MAX_VOICE_MS));
        if (elapsed >= MAX_VOICE_MS) {
          clearRecordTimer();
          void finishRecording();
        }
      }, 200);
    } catch (e: unknown) {
      setRecording(false);
      const err = e as { message?: string };
      setError(err.message || 'Could not start recording');
    }
  };

  const send = async () => {
    if (!kafela || !title.trim()) return;
    if (composeMode === 'text' && !body.trim()) return;
    if (composeMode === 'voice' && !voiceClip) return;
    if (isOffline) {
      setError('Connect to the internet to send a broadcast');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { rallyLat, rallyLng } = await resolveRally();
      const audience = {
        groupId: isAdmin ? groupId || null : me?.groupId ?? null,
        priority: (urgent ? 'urgent' : 'info') as 'urgent' | 'info',
        rallyLat,
        rallyLng,
      };
      if (composeMode === 'voice' && voiceClip) {
        await kafelaApi.createVoiceBroadcast(kafela.id, {
          title: title.trim() || 'Voice message',
          ...audience,
          durationMs: voiceClip.durationMs,
          audio: voiceClip.blob,
          mimeType: voiceClip.mimeType,
        });
        clearVoiceClip();
        setRecordElapsedMs(0);
      } else {
        await kafelaApi.createBroadcast(kafela.id, {
          title: title.trim(),
          body: body.trim(),
          ...audience,
        });
        setBody('');
      }
      setTitle('');
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
    setEditBody(isVoiceBroadcast(b) ? 'Voice message' : b.body);
    setEditUrgent(b.priority === 'urgent');
  };

  const saveEdit = async (b: Broadcast) => {
    const voice = isVoiceBroadcast(b);
    if (!kafela || !editTitle.trim() || (!voice && !editBody.trim())) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const priority = editUrgent ? 'urgent' : 'info';
      const nextBody = voice ? 'Voice message' : editBody.trim();
      await kafelaApi.updateBroadcast(kafela.id, b.id, {
        title: editTitle.trim(),
        body: nextBody,
        priority,
      });
      if (ackFor?.id === b.id) {
        setAckFor({ ...ackFor, title: editTitle.trim(), body: nextBody, priority });
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
          {(isOffline || pendingCount > 0) && (
            <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {isOffline
                ? 'Offline — acknowledgements are saved on this phone until you reconnect.'
                : 'Syncing waiting acknowledgements…'}
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

          {canSendBroadcast && (
            <section className="rounded-[24px] bg-white p-4 shadow-ambient">
              <h2 className="flex items-center gap-2 text-sm font-bold text-stitch-primary">
                <Megaphone size={16} /> Compose
              </h2>
              <div className="mt-3 flex gap-2 rounded-xl bg-stitch-surface-low p-1">
                <button
                  type="button"
                  disabled={recording || busy}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold disabled:opacity-50 ${
                    composeMode === 'text'
                      ? 'bg-white text-stitch-primary shadow-sm'
                      : 'text-stitch-on-variant'
                  }`}
                  onClick={() => {
                    if (recording) return;
                    setComposeMode('text');
                    setError(null);
                  }}
                >
                  Text
                </button>
                <button
                  type="button"
                  disabled={recording || busy}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold disabled:opacity-50 ${
                    composeMode === 'voice'
                      ? 'bg-white text-stitch-primary shadow-sm'
                      : 'text-stitch-on-variant'
                  }`}
                  onClick={() => {
                    if (recording) return;
                    setComposeMode('voice');
                    setError(null);
                  }}
                >
                  Voice
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <InscribedField
                  id="bcast-title"
                  label="Title"
                  value={title}
                  onChange={setTitle}
                  placeholder="Bus leaves in 10 minutes"
                />
                {composeMode === 'text' ? (
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
                ) : (
                  <div className="rounded-xl bg-stitch-surface-low px-4 py-4">
                    <p className="text-center text-2xl font-extrabold tabular-nums text-stitch-primary">
                      {formatVoiceDuration(voiceClip?.durationMs ?? recordElapsedMs)}
                    </p>
                    <p className="mt-1 text-center text-xs text-stitch-on-variant">
                      {recording
                        ? 'Recording… tap stop when done (max 60s)'
                        : voiceClip
                          ? 'Preview below, then send or re-record'
                          : 'Tap the mic to record a short voice message'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      {!recording ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void startRecording()}
                          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-stitch-primary text-white disabled:opacity-50"
                          aria-label={voiceClip ? 'Re-record voice message' : 'Start recording'}
                        >
                          <Mic size={24} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void finishRecording()}
                          className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-700 text-white"
                          aria-label="Stop recording"
                        >
                          <Square size={22} fill="currentColor" />
                        </button>
                      )}
                    </div>
                    {voiceClip && !recording && (
                      <audio
                        className="mt-4 w-full"
                        controls
                        src={voiceClip.objectUrl}
                        preload="metadata"
                      />
                    )}
                  </div>
                )}
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
                  disabled={
                    busy ||
                    recording ||
                    !title.trim() ||
                    (composeMode === 'text' ? !body.trim() : !voiceClip)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void send()}
                >
                  {busy ? (
                    <IonSpinner name="crescent" />
                  ) : composeMode === 'voice' ? (
                    <Mic size={18} />
                  ) : (
                    <Megaphone size={18} />
                  )}
                  {composeMode === 'voice' ? 'Send voice broadcast' : 'Send broadcast'}
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
              const voice = isVoiceBroadcast(b);
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
                      {voice ? (
                        kafela && (
                          <VoiceBroadcastPlayer
                            kafelaId={kafela.id}
                            broadcastId={b.id}
                            durationMs={b.audioDurationMs}
                          />
                        )
                      ) : (
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
                      )}
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
                          disabled={
                            actionBusy || !editTitle.trim() || (!voice && !editBody.trim())
                          }
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
                            {voice ? ' · voice' : ''}
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
                            onClick={() => void queueBroadcastAck(b.id)}
                          >
                            Ack
                          </button>
                        )}
                      </div>
                      {voice && kafela ? (
                        <VoiceBroadcastPlayer
                          kafelaId={kafela.id}
                          broadcastId={b.id}
                          durationMs={b.audioDurationMs}
                        />
                      ) : (
                        <p className="mt-2 text-sm whitespace-pre-wrap">{b.body}</p>
                      )}
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
                  <li key={a.memberId} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {a.seen && a.label ? a.label : a.displayName}
                      {!a.seen && a.householdSize && a.householdSize > 1
                        ? ` · household ${a.householdSize}`
                        : ''}
                    </span>
                    <span className={`shrink-0 ${a.seen ? 'text-green-700' : 'text-red-700'}`}>
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
