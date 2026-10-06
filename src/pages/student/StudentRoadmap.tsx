import { useMemo } from 'react';
import { Map, Check, Sparkles } from 'lucide-react';
import { useData } from '@/state/DataContext';

export function StudentRoadmap() {
  const { student, roadmapFor, milestonesFor } = useData();

  const roadmap = student ? roadmapFor(student.id) : undefined;
  const milestones = useMemo(
    () => (student ? milestonesFor(student.id) : []),
    [student, milestonesFor],
  );

  if (!student) return null;

  if (!roadmap || !roadmap.approved) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title">Your roadmap</h1>
        </div>
        <div className="card flex flex-col items-center p-12 text-center">
          <p className="text-base font-semibold text-ink-800">Your roadmap is being built</p>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Your coach is personalizing a 6-meeting plan from your onboarding answers. It'll unlock
            here once it's approved.
          </p>
        </div>
      </div>
    );
  }

  const doneCount = milestones.filter((m) => m.status === 'done').length;
  const pct = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Your roadmap</h1>
        <p className="page-sub">
          Personalized to your goals. Each meeting builds on the last.
        </p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-ink-400" />
            <span className="text-base font-semibold text-ink-900">{roadmap.title}</span>
          </div>
          <span className="text-sm font-medium text-ink-500">
            {doneCount} of {milestones.length} complete
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="relative space-y-4 before:absolute before:left-[23px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-ink-200">
        {milestones.map((m) => (
          <li key={m.id} className="relative pl-14">
            <span
              className={`absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${
                m.status === 'done'
                  ? 'bg-emerald-500 text-white'
                  : m.status === 'current'
                    ? 'bg-brand-600 text-white shadow-lift'
                    : 'bg-white text-ink-400 border border-ink-200'
              }`}
            >
              {m.status === 'done' ? <Check className="h-5 w-5" /> : m.position}
            </span>
            <div
              className={`rounded-2xl border p-5 ${
                m.status === 'current' ? 'border-brand-200 bg-brand-50/40' : 'border-ink-100 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold text-ink-900">{m.title}</p>
                {m.status === 'current' && (
                  <span className="pill bg-brand-100 text-brand-700">In progress</span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-600">{m.goal}</p>
              <div className="mt-3 rounded-xl bg-white p-3.5 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Homework</p>
                <p className="mt-1 text-sm text-ink-800">{m.homework}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <p className="text-sm text-brand-900">
          This plan was built from your onboarding answers and updated after each call. If your
          situation changes, bring it up with your coach and they'll adjust it.
        </p>
      </div>
    </div>
  );
}
