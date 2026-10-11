import React, { useMemo, useState } from 'react';
import { IonSelect, IonSelectOption, IonSpinner } from '@ionic/react';
import { Plus, Trash2 } from 'lucide-react';
import InscribedField from '../InscribedField';
import { useKafela } from '../../contexts/KafelaContext';
import { kafelaApi } from '../../services/kafelaApi';
import {
  COMPANION_RELATION_LABELS,
  householdSize,
  memberLabel,
  type KafelaCompanionRelation,
  type KafelaMember,
} from '../../types/kafela';

const MAX_COMPANIONS = 3;

const KafelaHousehold: React.FC = () => {
  const { kafela, me, members, isAdmin, refresh } = useKafela();
  const [companionName, setCompanionName] = useState('');
  const [companionRelation, setCompanionRelation] = useState<KafelaCompanionRelation>('spouse');
  const [householdTargetId, setHouseholdTargetId] = useState<string | null>(null);
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);

  const householdTarget: KafelaMember | null = useMemo(() => {
    if (!me) return null;
    const id = householdTargetId || me.id;
    return members.find((m) => m.id === id) || me;
  }, [householdTargetId, me, members]);

  const editingCompanions = householdTarget?.companions ?? [];
  const canEditHousehold =
    !!householdTarget && (householdTarget.id === me?.id || isAdmin);

  if (!kafela || !me) return null;

  const addCompanion = async () => {
    if (!householdTarget || !companionName.trim()) return;
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

  return (
    <section className="rounded-[24px] bg-white p-4 shadow-ambient">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-stitch-primary">My household</h2>
          <p className="mt-1 text-xs text-stitch-on-variant">
            Add family without the app (up to {MAX_COMPANIONS} companions on this phone).
          </p>
        </div>
        <span className="rounded-full bg-stitch-surface-low px-2 py-1 text-xs font-bold text-stitch-primary">
          {householdSize(householdTarget || me)}/4
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
              setCompanionRelation((e.detail.value as KafelaCompanionRelation) || 'other')
            }
          >
            {(Object.keys(COMPANION_RELATION_LABELS) as KafelaCompanionRelation[]).map((key) => (
              <IonSelectOption key={key} value={key}>
                {COMPANION_RELATION_LABELS[key]}
              </IonSelectOption>
            ))}
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
  );
};

export default KafelaHousehold;
