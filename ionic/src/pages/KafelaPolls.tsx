import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonToggle,
  IonCheckbox,
  IonRadio,
  IonRadioGroup,
  IonAlert,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { BarChart3, Plus, Trash2 } from 'lucide-react';
import InscribedField from '../components/InscribedField';
import { useKafela } from '../contexts/KafelaContext';
import { kafelaApi } from '../services/kafelaApi';
import type { PollDetail, PollSummary } from '../types/kafela';

type ListSegment = 'open' | 'closed';

const KafelaPollsPage: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialId = params.get('id');

  const {
    kafela,
    me,
    groups,
    polls,
    canSendBroadcast,
    isAdmin,
    refreshPolls,
    liveRevision,
    queuePollVote,
    isOffline,
    lastUpdatedAt,
    pendingCount,
  } = useKafela();

  const [segment, setSegment] = useState<ListSegment>('open');
  const [closedPolls, setClosedPolls] = useState<PollSummary[]>([]);
  const [question, setQuestion] = useState('');
  const [optionLabels, setOptionLabels] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [closesAtLocal, setClosesAtLocal] = useState('');
  const [busy, setBusy] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<PollDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const listForSegment = segment === 'open' ? polls : closedPolls;

  const loadDetail = useCallback(
    async (id: string) => {
      if (!kafela) return;
      try {
        const data = await kafelaApi.getPoll(kafela.id, id);
        setDetail(data);
        setActiveId(id);
        setSelectedIds(data.myOptionIds ?? []);
        setError(null);
      } catch {
        setDetail(null);
        if (!navigator.onLine) {
          setError('Could not refresh poll. Showing waiting vote only.');
        }
      }
    },
    [kafela]
  );

  const loadClosed = useCallback(async () => {
    if (!kafela) return;
    try {
      setClosedPolls(await kafelaApi.listPolls(kafela.id, 'closed'));
    } catch {
      /* keep previous */
    }
  }, [kafela]);

  useEffect(() => {
    void refreshPolls();
  }, [refreshPolls]);

  useEffect(() => {
    if (segment === 'closed') void loadClosed();
  }, [segment, loadClosed, liveRevision]);

  useEffect(() => {
    if (initialId) {
      setSegment('open');
      void loadDetail(initialId);
    }
  }, [initialId, loadDetail]);

  useEffect(() => {
    if (activeId) void loadDetail(activeId);
  }, [liveRevision, activeId, loadDetail]);

  const create = async () => {
    if (!kafela) return;
    setBusy(true);
    setError(null);
    try {
      const labels = optionLabels.map((l) => l.trim()).filter(Boolean);
      const closesAt = closesAtLocal
        ? new Date(closesAtLocal).toISOString()
        : null;
      const poll = await kafelaApi.createPoll(kafela.id, {
        question: question.trim(),
        options: labels,
        allowMultiple,
        anonymous,
        groupId: isAdmin ? groupId || null : me?.groupId ?? null,
        closesAt,
      });
      setQuestion('');
      setOptionLabels(['', '']);
      setAllowMultiple(false);
      setAnonymous(false);
      setGroupId('');
      setClosesAtLocal('');
      await refreshPolls();
      setSegment('open');
      await loadDetail(poll.id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not create poll');
    } finally {
      setBusy(false);
    }
  };

  const toggleOption = (optionId: string) => {
    if (!detail || detail.closed || !detail.canVote) return;
    if (detail.allowMultiple) {
      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
      );
    } else {
      setSelectedIds([optionId]);
    }
  };

  const submitVote = async () => {
    if (!kafela || !activeId || !detail?.canVote) return;
    if (!selectedIds.length) {
      setError('Pick at least one option');
      return;
    }
    setVoteBusy(true);
    setError(null);
    try {
      await queuePollVote({ pollId: activeId, optionIds: selectedIds });
      if (navigator.onLine) {
        await loadDetail(activeId);
        await refreshPolls();
      } else if (detail) {
        setDetail({ ...detail, myOptionIds: selectedIds });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not save vote');
    } finally {
      setVoteBusy(false);
    }
  };

  const retractVote = async () => {
    if (!kafela || !activeId || !detail?.canVote) return;
    setVoteBusy(true);
    setError(null);
    try {
      await queuePollVote({ pollId: activeId, optionIds: [], retract: true });
      setSelectedIds([]);
      if (navigator.onLine) {
        await loadDetail(activeId);
        await refreshPolls();
      } else if (detail) {
        setDetail({ ...detail, myOptionIds: [] });
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not retract vote');
    } finally {
      setVoteBusy(false);
    }
  };

  const closePoll = async () => {
    if (!kafela || !activeId) return;
    await kafelaApi.closePoll(kafela.id, activeId);
    await refreshPolls();
    await loadClosed();
    await loadDetail(activeId);
  };

  const deletePoll = async () => {
    if (!kafela || !activeId) return;
    await kafelaApi.deletePoll(kafela.id, activeId);
    setDetail(null);
    setActiveId(null);
    await refreshPolls();
    if (segment === 'closed') await loadClosed();
  };

  const maxVotes = useMemo(() => {
    if (!detail) return 1;
    return Math.max(1, ...detail.options.map((o) => o.voteCount), detail.turnout.voted);
  }, [detail]);

  const hasVoted = (detail?.myOptionIds.length ?? 0) > 0;
  const selectionChanged =
    !!detail &&
    (selectedIds.length !== detail.myOptionIds.length ||
      selectedIds.some((id) => !detail.myOptionIds.includes(id)));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/kafela" text="Kafela" />
          </IonButtons>
          <IonTitle>Polls</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="sanctuary-content">
        <div className="box-border px-5 pb-28 pt-4 font-sans text-stitch-on-surface">
          {(isOffline || pendingCount > 0) && (
            <div className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {isOffline
                ? 'Offline — votes are saved on this phone and will sync later.'
                : 'Syncing waiting votes…'}
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
                <BarChart3 size={16} /> Create poll
              </h2>
              <div className="mt-3 space-y-3">
                <InscribedField
                  id="poll-question"
                  label="Question"
                  value={question}
                  onChange={setQuestion}
                  placeholder="Which bus are you on?"
                />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-stitch-on-variant">Options</p>
                  {optionLabels.map((label, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <InscribedField
                          id={`poll-opt-${index}`}
                          label={`Option ${index + 1}`}
                          value={label}
                          onChange={(v) =>
                            setOptionLabels((prev) =>
                              prev.map((p, i) => (i === index ? v : p))
                            )
                          }
                          placeholder={`Choice ${index + 1}`}
                        />
                      </div>
                      {optionLabels.length > 2 && (
                        <button
                          type="button"
                          className="mt-4 rounded-lg p-2 text-red-700"
                          aria-label="Remove option"
                          onClick={() =>
                            setOptionLabels((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {optionLabels.length < 8 && (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-semibold text-stitch-primary"
                      onClick={() => setOptionLabels((prev) => [...prev, ''])}
                    >
                      <Plus size={14} /> Add option
                    </button>
                  )}
                </div>

                <label className="flex items-center justify-between gap-3 rounded-xl bg-stitch-surface-low px-3 py-2">
                  <span className="text-sm">
                    <span className="font-semibold">Multiple choice</span>
                    <span className="mt-0.5 block text-xs text-stitch-on-variant">
                      Members may pick more than one option
                    </span>
                  </span>
                  <IonToggle
                    checked={allowMultiple}
                    onIonChange={(e) => setAllowMultiple(e.detail.checked)}
                  />
                </label>

                <label className="flex items-center justify-between gap-3 rounded-xl bg-stitch-surface-low px-3 py-2">
                  <span className="text-sm">
                    <span className="font-semibold">Anonymous</span>
                    <span className="mt-0.5 block text-xs text-stitch-on-variant">
                      Counts only — names stay hidden
                    </span>
                  </span>
                  <IonToggle
                    checked={anonymous}
                    onIonChange={(e) => setAnonymous(e.detail.checked)}
                  />
                </label>

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

                <label className="block text-xs font-semibold text-stitch-on-variant">
                  Closes at (optional)
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-xl border border-stitch-outline/30 bg-stitch-surface-low px-3 py-2 text-sm text-stitch-on-surface"
                    value={closesAtLocal}
                    onChange={(e) => setClosesAtLocal(e.target.value)}
                  />
                </label>

                {error && !detail && (
                  <p className="text-sm font-medium text-red-700">{error}</p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void create()}
                >
                  {busy ? <IonSpinner name="crescent" /> : null}
                  Create poll
                </button>
              </div>
            </section>
          )}

          <section className="mt-5">
            <IonSegment
              value={segment}
              onIonChange={(e) => setSegment((e.detail.value as ListSegment) || 'open')}
              className="map-segment"
            >
              <IonSegmentButton value="open">
                <IonLabel>Open</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="closed">
                <IonLabel>Closed</IonLabel>
              </IonSegmentButton>
            </IonSegment>

            <ul className="mt-3 space-y-2">
              {listForSegment.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full rounded-2xl px-4 py-3 text-left shadow-ambient ${
                      activeId === p.id ? 'bg-stitch-primary text-white' : 'bg-white'
                    }`}
                    onClick={() => void loadDetail(p.id)}
                  >
                    <p className="font-semibold">{p.question}</p>
                    <p
                      className={`text-xs ${
                        activeId === p.id ? 'text-white/80' : 'text-stitch-on-variant'
                      }`}
                    >
                      {p.group?.name || 'Whole kafela'} · {p.turnout.voted}/{p.turnout.eligible}{' '}
                      voted
                      {p.anonymous ? ' · Anonymous' : ''}
                      {p.canVote && (p.myOptionIds?.length ?? 0) === 0 ? ' · Your vote needed' : ''}
                    </p>
                  </button>
                </li>
              ))}
              {listForSegment.length === 0 && (
                <p className="text-sm text-stitch-on-variant">
                  {segment === 'open' ? 'No open polls.' : 'No closed polls yet.'}
                </p>
              )}
            </ul>
          </section>

          {detail && (
            <section className="mt-6 rounded-[24px] bg-white p-4 shadow-ambient">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold">{detail.question}</h3>
                  <p className="text-sm text-stitch-on-variant">
                    {detail.turnout.voted} of {detail.turnout.eligible} voted
                    {detail.anonymous ? ' · Anonymous' : ' · Named'}
                    {detail.allowMultiple ? ' · Multi' : ' · Single'}
                    {detail.closed ? ' · Closed' : ''}
                  </p>
                  {detail.closesAt && !detail.closed && (
                    <p className="text-xs text-stitch-on-variant">
                      Closes {new Date(detail.closesAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {detail.canManage && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!detail.closed && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-700"
                        onClick={() => void closePoll()}
                      >
                        Close
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-stitch-on-variant"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {detail.allowMultiple ? (
                  detail.options.map((opt) => {
                    const checked = selectedIds.includes(opt.id);
                    const pct = Math.round((opt.voteCount / maxVotes) * 100);
                    return (
                      <div key={opt.id} className="rounded-xl bg-stitch-surface-low p-3">
                        <label className="flex items-start gap-3">
                          {detail.canVote && !detail.closed ? (
                            <IonCheckbox
                              checked={checked}
                              onIonChange={() => toggleOption(opt.id)}
                              className="mt-0.5"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold">{opt.label}</span>
                              <span className="text-xs font-bold text-stitch-primary">
                                {opt.voteCount}
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                              <div
                                className="h-full rounded-full bg-stitch-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {!detail.anonymous && opt.voters && opt.voters.length > 0 && (
                              <p className="mt-2 text-xs text-stitch-on-variant">
                                {opt.voters.map((v) => v.displayName).join(', ')}
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    );
                  })
                ) : (
                  <IonRadioGroup value={selectedIds[0] ?? ''}>
                    {detail.options.map((opt) => {
                      const pct = Math.round((opt.voteCount / maxVotes) * 100);
                      return (
                        <div key={opt.id} className="mb-3 rounded-xl bg-stitch-surface-low p-3">
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 text-left"
                            disabled={!detail.canVote || detail.closed}
                            onClick={() => toggleOption(opt.id)}
                          >
                            {detail.canVote && !detail.closed ? (
                              <IonRadio
                                value={opt.id}
                                className="mt-0.5 pointer-events-none"
                              />
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{opt.label}</span>
                                <span className="text-xs font-bold text-stitch-primary">
                                  {opt.voteCount}
                                </span>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                                <div
                                  className="h-full rounded-full bg-stitch-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {!detail.anonymous && opt.voters && opt.voters.length > 0 && (
                                <p className="mt-2 text-xs text-stitch-on-variant">
                                  {opt.voters.map((v) => v.displayName).join(', ')}
                                </p>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </IonRadioGroup>
                )}
              </div>

              {detail.anonymous && detail.notVoted && detail.notVoted.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Not voted yet ({detail.notVoted.length})
                  </h4>
                  <ul className="mt-2 space-y-1 text-sm text-stitch-on-variant">
                    {detail.notVoted.map((m) => (
                      <li key={m.memberId}>{m.displayName}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasVoted && (
                <p className="mt-3 text-xs text-stitch-on-variant">
                  Your choice:{' '}
                  {detail.options
                    .filter((o) => detail.myOptionIds.includes(o.id))
                    .map((o) => o.label)
                    .join(', ') || '—'}
                </p>
              )}

              {error && <p className="mt-3 text-sm font-medium text-red-700">{error}</p>}

              {detail.canVote && !detail.closed && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={voteBusy || !selectedIds.length || (!selectionChanged && hasVoted)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                    onClick={() => void submitVote()}
                  >
                    {voteBusy ? <IonSpinner name="crescent" /> : null}
                    {hasVoted ? 'Update vote' : 'Vote'}
                  </button>
                  {hasVoted && (
                    <button
                      type="button"
                      disabled={voteBusy}
                      className="w-full py-2 text-sm font-semibold text-stitch-on-variant disabled:opacity-50"
                      onClick={() => void retractVote()}
                    >
                      Retract vote
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <IonAlert
          isOpen={confirmDelete}
          onDidDismiss={() => setConfirmDelete(false)}
          header="Delete this poll?"
          message="Votes will be removed permanently."
          buttons={[
            { text: 'Cancel', role: 'cancel' },
            {
              text: 'Delete',
              role: 'destructive',
              handler: () => {
                void deletePoll();
              },
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default KafelaPollsPage;
