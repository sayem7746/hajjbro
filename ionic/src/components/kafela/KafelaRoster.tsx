import React, { useMemo, useState } from 'react';
import { IonSearchbar } from '@ionic/react';
import { Phone } from 'lucide-react';
import { useKafela } from '../../contexts/KafelaContext';
import { kafelaApi } from '../../services/kafelaApi';
import { householdLabel, householdSize, memberLabel } from '../../types/kafela';

const KafelaRoster: React.FC = () => {
  const { kafela, me, members, leaveRequests, isAdmin, refresh } = useKafela();
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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

  const pendingLeaveForAdmin = useMemo(
    () =>
      isAdmin
        ? leaveRequests.filter((r) => r.status === 'pending' && r.memberId !== me?.id)
        : [],
    [isAdmin, leaveRequests, me?.id]
  );

  if (!kafela || !me) return null;

  const promoteMember = async (memberId: string, role: 'kafela_admin' | 'member') => {
    try {
      await kafelaApi.updateMemberRole(kafela.id, memberId, role);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not update role');
    }
  };

  const removeMember = async (memberId: string) => {
    try {
      await kafelaApi.removeMember(kafela.id, memberId);
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Could not remove member');
    }
  };

  const resolveLeave = async (requestId: string, action: 'approve' | 'deny') => {
    setResolvingId(requestId);
    setError(null);
    try {
      if (action === 'approve') {
        await kafelaApi.approveLeaveRequest(kafela.id, requestId);
      } else {
        await kafelaApi.denyLeaveRequest(kafela.id, requestId);
      }
      await refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(
        err.response?.data?.error ||
          (action === 'approve' ? 'Could not approve leave' : 'Could not deny leave')
      );
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stitch-primary">Roster</h2>
      </div>
      {pendingLeaveForAdmin.length > 0 && (
        <div className="mb-4 space-y-2 rounded-[24px] bg-amber-50 p-4">
          <h3 className="text-sm font-extrabold text-amber-950">Leave requests</h3>
          <ul className="space-y-2">
            {pendingLeaveForAdmin.map((req) => (
              <li
                key={req.id}
                className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-ambient"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{memberLabel(req.member)}</p>
                  <p className="text-xs text-stitch-on-variant">Asked to leave this kafela</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    className="rounded-lg bg-stitch-surface-low px-2 py-1 text-[0.65rem] font-bold text-stitch-primary disabled:opacity-50"
                    onClick={() => void resolveLeave(req.id, 'deny')}
                  >
                    Deny
                  </button>
                  <button
                    type="button"
                    disabled={resolvingId === req.id}
                    className="rounded-lg bg-red-50 px-2 py-1 text-[0.65rem] font-bold text-red-800 disabled:opacity-50"
                    onClick={() => void resolveLeave(req.id, 'approve')}
                  >
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <IonSearchbar
        value={search}
        onIonInput={(e) => setSearch(String(e.detail.value ?? ''))}
        placeholder="Search name, tent, phone"
        className="kafela-search px-0"
      />
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
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
  );
};

export default KafelaRoster;
