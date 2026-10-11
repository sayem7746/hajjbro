import React, { useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonToggle,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/react';
import { KeyRound, Plus } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import InscribedField from '../components/InscribedField';
import KafelaHome from '../components/kafela/KafelaHome';
import KafelaRoster from '../components/kafela/KafelaRoster';
import KafelaHousehold from '../components/kafela/KafelaHousehold';
import { useKafela } from '../contexts/KafelaContext';
import { useAuth } from '../contexts/AuthContext';
import { kafelaApi } from '../services/kafelaApi';
import { useKafelaLocationSharing } from '../hooks/useKafelaLocationSharing';
import { isKafelaAdmin, memberLabel } from '../types/kafela';
import { Geolocation } from '@capacitor/geolocation';

type Segment = 'home' | 'people' | 'household';

const KafelaPage: React.FC = () => {
  const { user } = useAuth();
  const {
    loading,
    error,
    kafela,
    me,
    members,
    refresh,
    setLocalMe,
    setLocalKafela,
  } = useKafela();

  const [mode, setMode] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [sharingConsent, setSharingConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [segment, setSegment] = useState<Segment>('home');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leavePassword, setLeavePassword] = useState('');
  const [leaveConfirmName, setLeaveConfirmName] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [sosNote, setSosNote] = useState('');
  const [sosOpen, setSosOpen] = useState(false);
  const [sosCompanionId, setSosCompanionId] = useState<string>('');
  const [sosError, setSosError] = useState<string | null>(null);

  useKafelaLocationSharing(kafela?.id, Boolean(me?.sharingEnabled));

  const myCompanions = me?.companions ?? [];
  const isAdmin = me ? isKafelaAdmin(me.role) : false;
  const isSoleMember = useMemo(
    () => Boolean(me) && members.filter((m) => m.status === 'active' || !m.status).length <= 1,
    [me, members]
  );
  const needsConfirmName = isAdmin || isSoleMember;

  const handleCreate = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await kafelaApi.create({
        name: name.trim(),
        displayName: user?.name,
        sharingEnabled: false,
      });
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

  const closeLeaveSheet = () => {
    setLeaveOpen(false);
    setLeavePassword('');
    setLeaveConfirmName('');
    setLeaveError(null);
    setLeaveBusy(false);
  };

  const submitLeave = async () => {
    if (!kafela) return;
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await kafelaApi.createLeaveRequest(kafela.id, {
        password: leavePassword,
        ...(needsConfirmName ? { confirmName: leaveConfirmName.trim() } : {}),
      });
      closeLeaveSheet();
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setLeaveError(err.response?.data?.error || 'Could not leave kafela');
    } finally {
      setLeaveBusy(false);
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
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
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
                {busy ? (
                  <IonSpinner name="crescent" />
                ) : mode === 'join' ? (
                  <KeyRound size={18} />
                ) : (
                  <Plus size={18} />
                )}
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

        <IonSegment
          value={segment}
          onIonChange={(e) => setSegment((e.detail.value as Segment) || 'home')}
          className="map-segment"
        >
          <IonSegmentButton value="home">
            <IonLabel>Home</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="people">
            <IonLabel>People</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="household">
            <IonLabel>Household</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <div className="box-border w-full max-w-full px-5 pb-28 pt-3 font-sans text-stitch-on-surface">
          {formError && (
            <p className="mb-3 text-sm font-medium text-red-700">{formError}</p>
          )}
          {segment === 'home' && (
            <KafelaHome
              onOpenSos={() => setSosOpen(true)}
              onLeave={() => setLeaveOpen(true)}
              onOpenPeople={() => setSegment('people')}
            />
          )}
          {segment === 'people' && <KafelaRoster />}
          {segment === 'household' && <KafelaHousehold />}
        </div>

        {leaveOpen && kafela && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="w-full max-w-md rounded-[24px] bg-white p-5 shadow-ambient">
              <h2 className="text-lg font-extrabold text-stitch-on-surface">Leave kafela?</h2>
              <p className="mt-1 text-sm text-stitch-on-variant">
                {needsConfirmName
                  ? 'Enter your account password and type the kafela name to leave.'
                  : 'Enter your account password to request leave. You stay in the group until a kafela admin approves.'}
              </p>
              <div className="mt-4 space-y-3">
                <InscribedField
                  id="leave-password"
                  label="Account password"
                  type="password"
                  value={leavePassword}
                  onChange={setLeavePassword}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
                {needsConfirmName && (
                  <InscribedField
                    id="leave-confirm-name"
                    label={`Type "${kafela.name}" to confirm`}
                    value={leaveConfirmName}
                    onChange={setLeaveConfirmName}
                    placeholder={kafela.name}
                    autoComplete="off"
                  />
                )}
              </div>
              {leaveError && (
                <p className="mt-3 text-sm font-medium text-red-700">{leaveError}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-2xl bg-stitch-surface-low py-3 text-sm font-bold text-stitch-primary"
                  disabled={leaveBusy}
                  onClick={closeLeaveSheet}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-2xl bg-red-700 py-3 text-sm font-bold text-white disabled:opacity-50"
                  disabled={
                    leaveBusy ||
                    !leavePassword ||
                    (needsConfirmName && !leaveConfirmName.trim())
                  }
                  onClick={() => void submitLeave()}
                >
                  {leaveBusy ? (
                    <IonSpinner name="crescent" />
                  ) : needsConfirmName ? (
                    'Leave kafela'
                  ) : (
                    'Request leave'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

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

export default KafelaPage;
