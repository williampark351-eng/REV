import { useMemo } from 'react';
import { CalendarDays, AlertTriangle, ArrowRight, Users, Radio } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { formatDateTimeShort, formatDate } from '@/lib/format';
import type { Student } from '@/lib/types';
import { EmptyState } from '@/components/ui/Primitives';
import { StageBadge, AtRiskBadge } from '@/components/ui/Badges';
import type { CoachTab } from '@/components/layout/Shell';

interface Props {
  onNavigate: (tab: CoachTab, studentId?: string) => void;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function CoachDashboard({ onNavigate }: Props) {
  const {
    coach,
    students,
    calls,
    homework,
    riskReasons,
    coachById,
    studentById,
    tasksFor,
  } = useData();

  const weekCalls = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return calls
      .filter((c) => c.scheduled_at && new Date(c.scheduled_at) >= now && new Date(c.scheduled_at) <= end)
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
  }, [calls]);

  const todays = useMemo(() => {
    const today = new Date().toDateString();
    return weekCalls.filter((c) => new Date(c.scheduled_at!).toDateString() === today);
  }, [weekCalls]);

  const toReview = useMemo(() => homework.filter((h) => h.status === 'submitted'), [homework]);

  const atRisk = useMemo(
    () =>
      students
        .filter((s) => s.stage === 'Active' || s.stage === 'Onboarding')
        .map((s) => ({ student: s, reasons: riskReasons(s) }))
        .filter((r) => r.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length),
    [students, riskReasons],
  );

  const onboarding = useMemo(
    () =>
      students
        .filter((s) => s.stage === 'Onboarding')
        .map((s) => {
          const tasks = tasksFor(s.id);
          const done = tasks.filter((t) => t.done).length;
          return { student: s, done, total: tasks.length || 5 };
        })
        .sort((a, b) => b.done / b.total - a.done / a.total),
    [students, tasksFor],
  );

  const firstName = (coach?.name ?? 'Coach').split(' ')[0];
  const activeCount = students.filter((s) => s.stage === 'Active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="page-title mt-2">
            {greeting()}, {firstName}
          </h1>
        </div>
        <button onClick={() => onNavigate('studio')} className="btn-primary">
          <Radio className="h-4 w-4" /> Start a call
        </button>
      </div>

      {/* attention summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Calls this week', sub: `${todays.length} today`, value: weekCalls.length, go: () => onNavigate('calendar') },
          { label: 'Homework to review', sub: 'Waiting on your feedback', value: toReview.length, go: () => onNavigate('homework') },
          { label: 'At-risk clients', sub: 'Need a check-in', value: atRisk.length, go: () => onNavigate('clients') },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={stat.go}
            className="card group p-5 text-left transition-colors hover:border-ink-300"
          >
            <p className="eyebrow">{stat.label}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-display text-3xl font-bold text-ink-950">{stat.value}</span>
              <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700" />
            </div>
            <p className="mt-1 text-xs text-ink-500">{stat.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left column: calls */}
        <div className="space-y-6 lg:col-span-2">
          {/* at-risk */}
          {atRisk.length > 0 && (
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  <h2 className="text-base font-semibold text-ink-900">Needs your attention</h2>
                </div>
                <span className="pill bg-rose-100 text-rose-700">{atRisk.length}</span>
              </div>
              <div className="space-y-2">
                {atRisk.map(({ student, reasons }) => (
                  <button
                    key={student.id}
                    onClick={() => onNavigate('clients', student.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-ink-100 px-3.5 py-3 text-left transition hover:border-rose-200 hover:bg-rose-50/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">{student.name}</p>
                        <StageBadge stage={student.stage} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {reasons.map((r) => (
                          <span key={r.key} className="pill bg-rose-50 text-rose-700">
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* this week's calls */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">This week's 1:1s</h2>
              <span className="flex items-center gap-1.5 text-xs text-ink-500">
                <CalendarDays className="h-3.5 w-3.5" /> Next 7 days
              </span>
            </div>
            {weekCalls.length === 0 ? (
              <EmptyState
                title="No calls in the next 7 days"
                sub="When a student books a call, it will show up here automatically."
              />
            ) : (
              <div className="space-y-2">
                {weekCalls.map((call) => {
                  const student = studentById(call.student_id);
                  const coach = coachById(call.coach_id);
                  return (
                    <button
                      key={call.id}
                      onClick={() => student && onNavigate('clients', student.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink-100 bg-white px-4 py-3 text-left shadow-card transition hover:border-brand-200 hover:shadow-lift"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                        <span className="text-sm font-bold leading-none">
                          {new Date(call.scheduled_at!).toLocaleDateString('en-US', { day: '2-digit' })}
                        </span>
                        <span className="text-[9px] font-semibold uppercase">
                          {new Date(call.scheduled_at!).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {student?.name ?? 'Unknown student'}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {formatDateTimeShort(call.scheduled_at)} · {coach?.name ?? 'Unassigned'}
                        </p>
                      </div>
                      {call.meeting_link ? (
                        <a
                          href={call.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn-outline hidden !py-2 text-xs sm:inline-flex"
                        >
                          Join
                        </a>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* team overview */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-400" />
              <h2 className="text-base font-semibold text-ink-900">Program pulse</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Active" value={activeCount} tone="emerald" />
              <Stat label="Onboarding" value={students.filter((s) => s.stage === 'Onboarding').length} tone="brand" />
              <Stat label="Paused" value={students.filter((s) => s.stage === 'Paused').length} tone="amber" />
              <Stat label="Graduated" value={students.filter((s) => s.stage === 'Graduated').length} tone="ink" />
            </div>
          </section>
        </div>

        {/* right column: onboarding progress */}
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 text-base font-semibold text-ink-900">Onboarding progress</h2>
            {onboarding.length === 0 ? (
              <p className="text-sm text-ink-500">No students in onboarding right now.</p>
            ) : (
              <div className="space-y-3">
                {onboarding.map(({ student, done, total }) => {
                  const pct = Math.round((done / total) * 100);
                  return (
                    <button
                      key={student.id}
                      onClick={() => onNavigate('clients', student.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <p className="flex-1 truncate text-sm font-semibold text-ink-900">{student.name}</p>
                        <span className="text-xs font-medium text-ink-500">
                          {done}/{total}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => onNavigate('clients')}
              className="btn-ghost mt-4 w-full text-brand-700 hover:bg-brand-50"
            >
              View all clients
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'brand' | 'emerald' | 'amber' | 'ink' }) {
  const tones = {
    brand: 'text-brand-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    ink: 'text-ink-900',
  } as const;
  return (
    <div className="rounded-xl bg-ink-50 p-3.5 text-center">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-500">{label}</p>
    </div>
  );
}
