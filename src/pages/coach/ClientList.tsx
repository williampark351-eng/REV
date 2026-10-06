import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Plus, Mail, Loader2 } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { STAGES } from '@/lib/types';
import type { Stage, Student } from '@/lib/types';
import { EmptyState } from '@/components/ui/Primitives';
import { StageBadge, AtRiskBadge } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { money } from '@/lib/format';

interface Props {
  onOpenStudent: (studentId: string) => void;
}

export function ClientList({ onOpenStudent }: Props) {
  const { coach, students, coaches, riskReasons, coachById, addStudent } = useData();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [showAtRisk, setShowAtRisk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<{ name: string; email: string; temp_password: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    coach_id: '',
    start_date: '',
  });

  const filtered = useMemo(() => {
    let list = [...students];
    if (scope === 'mine' && coach) {
      list = list.filter((s) => s.coach_id === coach.id);
    }
    if (stage !== 'all') list = list.filter((s) => s.stage === stage);
    if (showAtRisk) list = list.filter((s) => riskReasons(s).length > 0);
    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.location?.toLowerCase().includes(q) ?? false),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, scope, coach, stage, showAtRisk, query, riskReasons]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const result = await addStudent({
      name: form.name,
      email: form.email,
      phone: form.phone,
      coach_id: form.coach_id || coaches[0]?.id || '',
      start_date: form.start_date,
    });
    setAdding(false);
    if (typeof result === 'string') {
      toast(result, 'error');
      return;
    }
    setCreated({ name: form.name, email: form.email, temp_password: result.temp_password });
    setForm({ name: '', email: '', phone: '', coach_id: '', start_date: '' });
    toast(`${form.name} added to the program`);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setCreated(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-sub">
            {students.length} students · {students.filter((s) => s.stage === 'Active').length} active
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add student
        </button>
      </div>

      {/* filters */}
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="field pl-9"
            placeholder="Search name, email, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="field w-auto !py-2"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'mine' | 'all')}
          >
            <option value="all">Everyone</option>
            <option value="mine">My students</option>
          </select>
          <select
            className="field w-auto !py-2"
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage | 'all')}
          >
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAtRisk((v) => !v)}
            className={`btn-outline !py-2 text-xs ${showAtRisk ? 'border-rose-300 bg-rose-50 text-rose-700' : ''}`}
          >
            At-risk only
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No students match"
          sub="Try adjusting the filters, or add a new student."
        />
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {filtered.map((s) => {
            const risks = riskReasons(s);
            const c = coachById(s.coach_id);
            return (
              <button
                key={s.id}
                onClick={() => onOpenStudent(s.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-ink-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{s.name}</p>
                    <StageBadge stage={s.stage} />
                    <AtRiskBadge reasons={risks.length} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-ink-500">
                    <Mail className="h-3 w-3" /> {s.email}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {c?.name ?? 'Unassigned'} · {s.location ?? 'No location'} · Goal{' '}
                    {money(s.goal_revenue)}/mo
                  </p>
                </div>
                {risks.length > 0 && (
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    {risks.map((r) => (
                      <span key={r.key} className="pill bg-rose-50 text-rose-700">
                        {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* add student modal */}
      <Modal
        open={showAdd}
        onClose={closeAdd}
        title={created ? 'Student added' : 'Add a student'}
        sub={
          created
            ? undefined
            : 'Creates their login and starts their onboarding checklist.'
        }
      >
        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">{created.name}'s account is ready.</p>
              <p className="mt-1">Send them these details to sign in:</p>
              <div className="mt-3 space-y-1.5 rounded-lg bg-white p-3 text-sm">
                <p>
                  <span className="text-ink-500">Email:</span>{' '}
                  <span className="font-semibold">{created.email}</span>
                </p>
                <p>
                  <span className="text-ink-500">Password:</span>{' '}
                  <span className="font-semibold">{created.temp_password}</span>
                </p>
              </div>
            </div>
            <button className="btn-primary w-full" onClick={closeAdd}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input
                id="name"
                className="field"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="field"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="coach">Coach</label>
                <select
                  id="coach"
                  className="field"
                  value={form.coach_id}
                  onChange={(e) => setForm((f) => ({ ...f, coach_id: e.target.value }))}
                >
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="start">Start date</label>
                <input
                  id="start"
                  type="date"
                  className="field"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={closeAdd}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add student
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
