import { useMemo, useState } from 'react';
import { Search, CheckCircle2, MessageSquareText } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { formatDate, timeAgo } from '@/lib/format';
import { EmptyState } from '@/components/ui/Primitives';
import { HomeworkBadge } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { Homework } from '@/lib/types';

export function ReviewQueue() {
  const { homework, homeworkUpdates, studentById, coachById, reviewHomework } = useData();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<Homework | null>(null);
  const [feedback, setFeedback] = useState('');

  const submitted = useMemo(
    () => homework.filter((h) => h.status === 'submitted'),
    [homework],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return submitted;
    const q = query.toLowerCase();
    return submitted.filter((h) => {
      const student = studentById(h.student_id);
      return h.title.toLowerCase().includes(q) || (student?.name.toLowerCase().includes(q) ?? false);
    });
  }, [submitted, query, studentById]);

  const openReview = (h: Homework) => {
    setTarget(h);
    setFeedback(h.feedback ?? '');
  };

  const submitReview = async () => {
    if (!target) return;
    await reviewHomework(target.id, feedback.trim());
    toast('Homework marked as reviewed');
    setTarget(null);
    setFeedback('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Homework to review</h1>
          <p className="page-sub">
            {submitted.length} submission{submitted.length === 1 ? '' : 's'} waiting on feedback
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            className="field pl-9"
            placeholder="Search by student or task"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {submitted.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          sub="New submissions from students will land here for you to review."
        />
      ) : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {filtered.map((h) => {
            const student = studentById(h.student_id);
            const updates = homeworkUpdates
              .filter((u) => u.homework_id === h.id)
              .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
            const latest = updates[0];
            const coach = coachById(h.coach_id);
            return (
              <div key={h.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900">{student?.name}</p>
                    <HomeworkBadge status={h.status} />
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-ink-700">{h.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    Due {formatDate(h.due_date)} · {coach?.name ?? 'Unassigned'}
                  </p>
                  {latest ? (
                    <div className="mt-3 rounded-xl bg-ink-50 p-3">
                      <p className="text-sm text-ink-700">{latest.body || 'Submission attached.'}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        {latest.link ? (
                          <a
                            href={latest.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            View attachment
                          </a>
                        ) : (
                          <span />
                        )}
                        <span className="text-xs text-ink-400">{timeAgo(latest.created_at)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                <button onClick={() => openReview(h)} className="btn-primary self-start !py-2 text-xs">
                  Review
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Review homework"
        sub={target ? `${studentById(target.student_id)?.name} — ${target.title}` : undefined}
      >
        {target && (
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="feedback">Feedback for the student</label>
              <textarea
                id="feedback"
                className="field min-h-[120px] resize-y"
                placeholder="Great work — one thing to tighten up next is…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setTarget(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={submitReview}>
                <CheckCircle2 className="h-4 w-4" /> Mark reviewed
              </button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-400">
              <MessageSquareText className="h-3.5 w-3.5" />
              The student sees your feedback on their homework card.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
