import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { EmptyState } from '@/components/ui/Primitives';
import { StageBadge } from '@/components/ui/Badges';
import type { CoachTab } from '@/components/layout/Shell';

interface Props {
  onOpenStudent: (studentId: string) => void;
}

export function RoadmapsPage({ onOpenStudent }: Props) {
  const { students, roadmaps, milestonesFor, coachById } = useData();

  const rows = useMemo(
    () =>
      students
        .filter((s) => s.stage === 'Active' || s.stage === 'Onboarding' || s.stage === 'Graduated')
        .map((s) => {
          const roadmap = roadmaps.find((r) => r.student_id === s.id);
          const ms = milestonesFor(s.id);
          const done = ms.filter((m) => m.status === 'done').length;
          return { student: s, roadmap, milestones: ms, done, total: ms.length };
        })
        .sort((a, b) => Number(b.roadmap?.approved ?? false) - Number(a.roadmap?.approved ?? false)),
    [students, roadmaps, milestonesFor],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Roadmaps</h1>
        <p className="page-sub">
          Personalized 6-meeting plans, drafted by AI and approved by you.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No roadmaps yet"
          sub="Open a student profile to build their 6-meeting plan."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ student, roadmap, milestones, done, total }) => (
            <button
              key={student.id}
              onClick={() => onOpenStudent(student.id)}
              className="card group p-5 text-left transition hover:shadow-lift"
            >
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">{student.name}</p>
                    <StageBadge stage={student.stage} />
                  </div>
                  <p className="text-xs text-ink-500">{coachById(student.coach_id)?.name ?? 'Unassigned'}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </div>

              <div className="mt-4">
                {roadmap ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`pill ${roadmap.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {roadmap.approved ? 'Approved' : 'Draft'}
                      </span>
                      <span className="font-medium text-ink-500">
                        {done}/{total || milestones.length} done
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all"
                        style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-500">
                    No roadmap — open profile to build one.
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
