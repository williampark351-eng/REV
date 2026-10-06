import { Check, ListChecks, NotebookPen, Target } from 'lucide-react';
import type { CallDrafts } from '@/lib/ai';

export interface EditableDrafts {
  summary: string;
  topics: string[];
  next_call_focus: string;
  actions: { text: string; include: boolean }[];
  homework: { title: string; description: string; due_in_days: number; include: boolean }[];
}

export function toEditable(d: CallDrafts): EditableDrafts {
  return {
    summary: d.summary,
    topics: d.topics,
    next_call_focus: d.next_call_focus,
    actions: d.action_items.map((text) => ({ text, include: true })),
    homework: d.homework.map((h) => ({ ...h, include: true })),
  };
}

export function toSelected(d: EditableDrafts): CallDrafts {
  return {
    summary: d.summary.trim(),
    topics: d.topics,
    next_call_focus: d.next_call_focus,
    action_items: d.actions.filter((a) => a.include && a.text.trim()).map((a) => a.text.trim()),
    homework: d.homework
      .filter((h) => h.include && h.title.trim())
      .map(({ title, description, due_in_days }) => ({ title: title.trim(), description, due_in_days })),
  };
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
        on ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-300 bg-white text-transparent hover:border-ink-400'
      }`}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </button>
  );
}

interface Props {
  drafts: EditableDrafts | null;
  onChange: (next: EditableDrafts) => void;
  drafting: boolean;
  live: boolean;
}

export function DraftsPanel({ drafts, onChange, drafting, live }: Props) {
  if (!drafts) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <p className="text-sm font-semibold text-ink-900">
          {drafting ? 'Writing first drafts…' : 'First drafts appear here'}
        </p>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          {live
            ? 'Once there is about a minute of conversation, the summary, action items and homework start filling in.'
            : 'Record or upload a call and REV will draft the summary, action items, and homework for you to approve.'}
        </p>
      </div>
    );
  }

  const set = (patch: Partial<EditableDrafts>) => onChange({ ...drafts, ...patch });

  return (
    <div className="divide-y divide-ink-100">
      <section className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-ink-400" />
          <h3 className="text-sm font-semibold text-ink-950">Summary</h3>
          {drafting ? <span className="ml-auto text-xs text-brand-700">Updating…</span> : null}
        </div>
        <textarea
          className="field min-h-28 resize-y leading-relaxed"
          value={drafts.summary}
          onChange={(e) => set({ summary: e.target.value })}
        />
        {drafts.topics.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {drafts.topics.map((t) => (
              <span key={t} className="pill border border-ink-200 bg-ink-50 text-ink-700">{t}</span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-ink-400" />
          <h3 className="text-sm font-semibold text-ink-950">Action items</h3>
          <span className="ml-auto text-xs text-ink-500">{drafts.actions.filter((a) => a.include).length} selected</span>
        </div>
        {drafts.actions.length === 0 ? (
          <p className="text-sm text-ink-500">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3">
                <Toggle
                  on={a.include}
                  onClick={() => set({ actions: drafts.actions.map((x, j) => (j === i ? { ...x, include: !x.include } : x)) })}
                />
                <input
                  className={`w-full border-0 bg-transparent p-0 text-sm leading-relaxed focus:outline-none focus:ring-0 ${
                    a.include ? 'text-ink-900' : 'text-ink-400 line-through'
                  }`}
                  value={a.text}
                  onChange={(e) => set({ actions: drafts.actions.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardIcon />
          <h3 className="text-sm font-semibold text-ink-950">Homework to assign</h3>
        </div>
        {drafts.homework.length === 0 ? (
          <p className="text-sm text-ink-500">None yet.</p>
        ) : (
          <ul className="space-y-3">
            {drafts.homework.map((h, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-ink-200 p-3">
                <Toggle
                  on={h.include}
                  onClick={() => set({ homework: drafts.homework.map((x, j) => (j === i ? { ...x, include: !x.include } : x)) })}
                />
                <div className="min-w-0 flex-1">
                  <input
                    className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-ink-950 focus:outline-none focus:ring-0"
                    value={h.title}
                    onChange={(e) => set({ homework: drafts.homework.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  />
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{h.description}</p>
                  <p className="mt-1.5 text-xs text-ink-500">Due in {h.due_in_days} days</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {drafts.next_call_focus ? (
        <section className="flex items-start gap-2 p-5">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
          <div>
            <h3 className="text-sm font-semibold text-ink-950">Next call focus</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">{drafts.next_call_focus}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}
