import React, { useEffect, useMemo, useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonBackButton,
  IonButtons,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonSelect,
  IonSelectOption,
  IonCheckbox,
} from '@ionic/react';
import { Plus, Trash2 } from 'lucide-react';
import InscribedField from '../components/InscribedField';
import { useKafela } from '../contexts/KafelaContext';
import { kafelaApi } from '../services/kafelaApi';
import { memberLabel } from '../types/kafela';

const COLORS = ['#0d9488', '#0369a1', '#7c3aed', '#c2410c', '#be123c', '#15803d', '#a16207', '#4338ca'];

const KafelaGroupsPage: React.FC = () => {
  const { kafela, me, members, groups, isAdmin, refresh, refreshMembers } = useKafela();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [adminId, setAdminId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [assignGroupId, setAssignGroupId] = useState<string>('');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canManage = isAdmin || me?.role === 'group_admin';

  const ungrouped = useMemo(() => members.filter((m) => !m.groupId), [members]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createGroup = async () => {
    if (!kafela || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await kafelaApi.createGroup(kafela.id, {
        name: name.trim(),
        color,
        adminMemberId: adminId || null,
      });
      setName('');
      setAdminId('');
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not create group');
    } finally {
      setBusy(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!kafela) return;
    setBusy(true);
    try {
      await kafelaApi.deleteGroup(kafela.id, groupId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not delete group');
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!kafela || selected.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await kafelaApi.assignMembers(
        kafela.id,
        selected,
        assignGroupId ? assignGroupId : null
      );
      setSelected([]);
      await refreshMembers();
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not assign members');
    } finally {
      setBusy(false);
    }
  };

  const setGroupAdmin = async (groupId: string, memberId: string) => {
    if (!kafela) return;
    try {
      await kafelaApi.updateGroup(kafela.id, groupId, { adminMemberId: memberId || null });
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not update group admin');
    }
  };

  if (!kafela || !me) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar className="hajj-glass-toolbar">
            <IonButtons slot="start">
              <IonBackButton defaultHref="/app/kafela" />
            </IonButtons>
            <IonTitle>Groups</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="sanctuary-content">
          <p className="p-5 text-sm text-stitch-on-variant">Join a kafela first.</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar className="hajj-glass-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/app/kafela" text="Kafela" />
          </IonButtons>
          <IonTitle>Groups</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="sanctuary-content">
        <div className="box-border px-5 pb-28 pt-4 font-sans text-stitch-on-surface">
          {error && <p className="mb-3 text-sm font-medium text-red-700">{error}</p>}

          {isAdmin && (
            <section className="rounded-[24px] bg-white p-4 shadow-ambient">
              <h2 className="text-sm font-bold text-stitch-primary">Create group</h2>
              <div className="mt-3 space-y-3">
                <InscribedField
                  id="group-name"
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Bus 1, Tent C, Sisters…"
                />
                <div>
                  <p className="mb-1 ml-1 text-xs font-semibold text-stitch-primary/60">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`h-8 w-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-stitch-primary' : ''}`}
                        style={{ background: c }}
                        onClick={() => setColor(c)}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 ml-1 text-xs font-semibold text-stitch-primary/60">Group admin</p>
                  <IonSelect
                    value={adminId}
                    placeholder="Optional"
                    onIonChange={(e) => setAdminId(String(e.detail.value ?? ''))}
                    interface="popover"
                  >
                    <IonSelectOption value="">None yet</IonSelectOption>
                    {members.map((m) => (
                      <IonSelectOption key={m.id} value={m.id}>
                        {memberLabel(m)}
                      </IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
                <button
                  type="button"
                  disabled={busy || !name.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void createGroup()}
                >
                  {busy ? <IonSpinner name="crescent" /> : <Plus size={18} />}
                  Add group
                </button>
              </div>
            </section>
          )}

          <section className="mt-5 space-y-3">
            <h2 className="text-lg font-extrabold text-stitch-primary">Groups ({groups.length})</h2>
            {groups.length === 0 && (
              <p className="text-sm text-stitch-on-variant">No groups yet. Admins can create buses, tents, etc.</p>
            )}
            {groups.map((g) => (
              <div key={g.id} className="rounded-2xl bg-white p-4 shadow-ambient">
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-full" style={{ background: g.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{g.name}</p>
                    <p className="text-xs text-stitch-on-variant">
                      {g._count?.members ?? 0} members
                      {g.admin
                        ? ` · admin ${g.admin.displayName || g.admin.user.name || ''}`
                        : ' · no admin'}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="rounded-full p-2 text-red-700"
                      onClick={() => void deleteGroup(g.id)}
                      aria-label={`Delete ${g.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <div className="mt-3">
                    <IonSelect
                      interface="popover"
                      placeholder="Assign group admin"
                      value={g.adminMemberId || ''}
                      onIonChange={(e) => void setGroupAdmin(g.id, String(e.detail.value ?? ''))}
                    >
                      <IonSelectOption value="">Clear admin</IonSelectOption>
                      {members.map((m) => (
                        <IonSelectOption key={m.id} value={m.id}>
                          {memberLabel(m)}
                        </IonSelectOption>
                      ))}
                    </IonSelect>
                  </div>
                )}
              </div>
            ))}
          </section>

          {canManage && (
            <section className="mt-6 rounded-[24px] bg-white p-4 shadow-ambient">
              <h2 className="text-sm font-bold text-stitch-primary">Assign members</h2>
              <p className="mt-1 text-xs text-stitch-on-variant">
                Ungrouped: {ungrouped.length}. Select people, then choose a group.
              </p>
              <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 py-1">
                    <IonCheckbox
                      checked={selected.includes(m.id)}
                      onIonChange={() => toggleSelect(m.id)}
                    />
                    <span className="text-sm">
                      {memberLabel(m)}
                      <span className="text-stitch-on-variant">
                        {m.group ? ` · ${m.group.name}` : ' · ungrouped'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-col gap-2">
                <IonSelect
                  interface="popover"
                  placeholder="Target group (empty = ungroup)"
                  value={assignGroupId}
                  onIonChange={(e) => setAssignGroupId(String(e.detail.value ?? ''))}
                >
                  <IonSelectOption value="">Ungroup</IonSelectOption>
                  {groups.map((g) => (
                    <IonSelectOption key={g.id} value={g.id}>
                      {g.name}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <button
                  type="button"
                  disabled={busy || selected.length === 0}
                  className="rounded-2xl bg-stitch-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  onClick={() => void assign()}
                >
                  Assign {selected.length || ''} selected
                </button>
              </div>
            </section>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default KafelaGroupsPage;
