import { useMemo, useState } from 'react';
import { CheckCircle2, Link2, Loader2 } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { formatDate } from '@/lib/format';
import { HomeworkBadge } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type { Homework } from '@/lib/types';

export function StudentHomework() {
  const { student, homeworkFor, submitHomework } = useData();
  const { toast } = useToast();
  const [target, setTarget] = useState<Homework | null>(null);
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () => (student ? homeworkFor(student.id) : []),
    [student, homeworkFor],
  );

  const openSubmit = (h: Homework) => {
    setTarget(h);
    setBody('');
    setLink('');
  };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    await submitHomework(target.id, target.student_id, body.trim(), link.trim());
    setBusy(false);
    setTarget(null);
    toast('Homework submitted — your coach will review it');
  };

  if (!student) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Homework</h1>
        <p className="page-sub">
          Every assignment from your coach, with due dates and feedback.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <p className="text-sm font-semibold text-ink-800">No homework yet</p>
          <p className="mt-1 text-sm text-ink-500">
            Assignments from your coach will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <div key={h.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-ink-900">{h.title}</h2>
                    <HomeworkBadge status={h.status} />
                  </div>
                  {h.description && <p className="mt-1 text-sm text-ink-500">{h.description}</p>}
                  <p className="mt-2 text-xs text-ink-400">Due {formatDate(h.due_date)}</p>
                </div>
              </div>

              {h.feedback && (
                <div className="mt-3 rounded-xl bg-emerald-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Coach feedback
                  </p>
                  <p className="mt-1 text-sm text-emerald-900">{h.feedback}</p>
                </div>
              )}

              {(h.status === 'assigned' || h.status === 'overdue') && (
                <button onClick={() => openSubmit(h)} className="btn-primary mt-4">
                  Submit update
                </button>
              )}
              {(h.status === 'submitted' || h.status === 'reviewed') && (
                <p className="mt-3 text-xs text-ink-400">
                  {h.status === 'submitted'
                    ? 'Submitted — waiting for your coach to review.'
                    : 'Reviewed by your coach.'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Submit homework"
        sub={target?.title}
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="body">What did you do?</label>
            <textarea
              id="body"
              className="field min-h-[110px] resize-y"
              placeholder="Share what you completed, what got in the way, or ask a question…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="link">Link (optional)</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="link"
                className="field pl-9"
                placeholder="e.g. a Google Doc, Loom, or file link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setTarget(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submit} disabled={busy || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
