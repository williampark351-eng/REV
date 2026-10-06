import { useMemo, useState } from 'react';
import { ClipboardList, BookOpen, ExternalLink, Map } from 'lucide-react';
import { useData } from '@/state/DataContext';
import {
  formatDateTimeShort,
  formatDate,
  formatCountdown,
} from '@/lib/format';
import { HomeworkBadge } from '@/components/ui/Badges';
import { useToast } from '@/components/ui/Toast';
import type { StudentTab } from '@/components/layout/Shell';
import type { ActionItem } from '@/lib/types';
import { BookingPanel } from '@/components/calendar/BookingPanel';

interface Props {
  onNavigate: (tab: StudentTab) => void;
}

export function StudentHome({ onNavigate }: Props) {
  const {
    student,
    coachById,
    upcomingCall,
    actionItems,
    homework,
    milestonesFor,
    roadmapFor,
    toggleActionItem,
  } = useData();
  const { toast } = useToast();
  const [bookingOpen, setBookingOpen] = useState(false);

  const coach = coachById(student?.coach_id ?? null);
  const nextCall = student ? upcomingCall(student.id) : undefined;
  const openActions = useMemo(
    () => (student ? actionItems.filter((a) => a.student_id === student.id && !a.done) : []),
    [student, actionItems],
  );
  const openHomework = useMemo(
    () =>
      student
        ? homework
            .filter((h) => h.student_id === student.id && h.status !== 'reviewed')
            .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
        : [],
    [student, homework],
  );
  const roadmap = student ? roadmapFor(student.id) : undefined;
  const milestones = student ? milestonesFor(student.id) : [];

  if (!student) return null;

  const firstName = student.name.split(' ')[0];
  const currentMilestone = milestones.find((m) => m.status === 'current');
  const doneCount = milestones.filter((m) => m.status === 'done').length;

  const toggle = async (a: ActionItem) => {
    await toggleActionItem(a);
    if (!a.done) toast('Nice — action item completed');
  };

  return (
    <div className="space-y-6">
      {/* greeting */}
      <div>
        <p className="eyebrow">My program</p>
        <h1 className="page-title mt-2">
          Welcome back, {firstName}
        </h1>
      </div>

      {/* next call countdown hero */}
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {nextCall ? 'Next 1:1 call' : 'Your next call'}
              </p>
              {nextCall ? (
                <>
                  <p className="text-lg font-bold text-ink-900">
                    {formatDateTimeShort(nextCall.scheduled_at)}
                  </p>
                  <p className="text-sm text-ink-500">
                    Finish your homework {formatCountdown(nextCall.scheduled_at)} — then you're set.
                  </p>
                </>
              ) : (
                <p className="text-base font-semibold text-ink-800">No call booked yet</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {coach?.booking_enabled && (
              <button type="button" className="btn-primary" onClick={() => setBookingOpen(true)}>
                Book with {coach.name.split(' ')[0]}
              </button>
            )}
            {coach && (
              <div className="flex items-center gap-2 self-start sm:self-end">
                <span className="text-xs text-ink-500">
                  Your coach: <span className="font-semibold text-ink-700">{coach.name}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MIT / focus */}
      {student.thirty_day_win && (
        <section className="card border-l-4 border-l-brand-600 p-5">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Your 30-day most important task
              </p>
              <p className="mt-0.5 text-base font-semibold text-ink-900">{student.thirty_day_win}</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* action items */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-ink-400" />
                <h2 className="text-base font-semibold text-ink-900">Action items</h2>
              </div>
              <span className="pill bg-brand-50 text-brand-700">{openActions.length} open</span>
            </div>
            {openActions.length === 0 ? (
              <p className="text-sm text-ink-500">
                Nothing pending right now. Check back after your next call.
              </p>
            ) : (
              <div className="space-y-1.5">
                {openActions.slice(0, 5).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggle(a)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition hover:bg-ink-50"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink-300 transition hover:border-brand-500" />
                    <span className="flex-1 text-sm text-ink-800">{a.text}</span>
                    {a.due_date && (
                      <span
                        className={`text-xs ${
                          new Date(a.due_date) < new Date() ? 'text-rose-600' : 'text-ink-400'
                        }`}
                      >
                        {formatDate(a.due_date)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('homework')}
              className="btn-ghost mt-3 w-full text-brand-700 hover:bg-brand-50"
            >
              View all homework
            </button>
          </section>

          {/* homework */}
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-ink-400" />
                <h2 className="text-base font-semibold text-ink-900">Homework</h2>
              </div>
            </div>
            {openHomework.length === 0 ? (
              <p className="text-sm text-ink-500">No open homework. You're all caught up.</p>
            ) : (
              <div className="space-y-2.5">
                {openHomework.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex items-start gap-3 rounded-xl border border-ink-100 p-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">{h.title}</p>
                        <HomeworkBadge status={h.status} />
                      </div>
                      <p className="mt-0.5 text-xs text-ink-500">Due {formatDate(h.due_date)}</p>
                      {h.feedback && (
                        <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">
                          <span className="font-semibold">Coach feedback:</span> {h.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('homework')}
              className="btn-ghost mt-3 w-full text-brand-700 hover:bg-brand-50"
            >
              Go to homework
            </button>
          </section>
        </div>

        {/* right column */}
        <div className="space-y-6">
          {/* roadmap progress */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Map className="h-4 w-4 text-ink-400" />
              <h2 className="text-base font-semibold text-ink-900">Your roadmap</h2>
            </div>
            {!roadmap || !roadmap.approved ? (
              <p className="text-sm text-ink-500">
                Your personalized roadmap will appear here once your coach approves it.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-900">{roadmap.title}</span>
                  <span className="text-ink-500">
                    {doneCount}/{milestones.length}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-600 transition-all"
                    style={{ width: `${milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0}%` }}
                  />
                </div>
                {currentMilestone && (
                  <div className="rounded-xl bg-brand-50 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                      Current focus
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">{currentMilestone.title}</p>
                    <p className="mt-1 text-sm text-ink-600">{currentMilestone.goal}</p>
                  </div>
                )}
                <button
                  onClick={() => onNavigate('roadmap')}
                  className="btn-outline w-full !py-2 text-xs"
                >
                  View full roadmap
                </button>
              </div>
            )}
          </section>

          {/* upcoming call card */}
          {nextCall && (
            <section className="card p-5">
              <h2 className="mb-3 text-base font-semibold text-ink-900">Upcoming call</h2>
              <div className="rounded-xl bg-ink-50 p-4">
                <p className="text-lg font-bold text-ink-900">
                  {formatDateTimeShort(nextCall.scheduled_at)}
                </p>
                <p className="text-sm text-ink-500">with {coach?.name ?? 'your coach'}</p>
                {nextCall.meeting_link && (
                  <a
                    href={nextCall.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary mt-3 w-full !py-2 text-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Join call
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
      {bookingOpen ? <BookingPanel onClose={() => setBookingOpen(false)} /> : null}
    </div>
  );
}
