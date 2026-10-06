import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { formatDateTimeShort } from '@/lib/format';
import type { Call } from '@/lib/types';

export function StudentCalls() {
  const { student, callsFor, coachById } = useData();
  const calls = useMemo(() => (student ? callsFor(student.id) : []), [student, callsFor]);

  if (!student) return null;

  const upcoming = calls
    .filter((c) => c.status === 'booked')
    .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''));
  const past = calls
    .filter((c) => c.status === 'completed' || c.status === 'missed')
    .sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''));

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">My program</p>
        <h1 className="page-title mt-2">Calls & recordings</h1>
        <p className="page-sub">
          Join upcoming sessions from here. After each call, the recording, full transcript, and your coach's notes appear
          below automatically.
        </p>
      </div>

      <section>
        <h2 className="eyebrow mb-3">Upcoming</h2>
        {upcoming.length === 0 ? (
          <div className="card px-5 py-8 text-center text-sm text-ink-500">No calls booked right now.</div>
        ) : (
          <div className="card divide-y divide-ink-100">
            {upcoming.map((call) => (
              <div key={call.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-950">{formatDateTimeShort(call.scheduled_at)}</p>
                  <p className="text-sm text-ink-500">
                    with {coachById(call.coach_id)?.name ?? 'your coach'} · {call.duration_min ?? 60} min
                  </p>
                </div>
                {call.meeting_link ? (
                  <a href={call.meeting_link} target="_blank" rel="noreferrer" className="btn-primary">
                    <ExternalLink className="h-4 w-4" /> Join meeting
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">History</h2>
        {past.length === 0 ? (
          <div className="card flex flex-col items-center p-10 text-center">
            <p className="text-sm text-ink-500">No past calls yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {past.map((call) => (
              <CallHistoryCard key={call.id} call={call} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CallHistoryCard({ call }: { call: Call }) {
  const { actionItems, coachById } = useData();
  const coach = coachById(call.coach_id);
  const actions = actionItems.filter((a) => a.call_id === call.id);

  return (
    <article className="card p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span className={`pill ${call.status === 'missed' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {call.status === 'missed' ? 'Missed' : 'Completed'}
        </span>
        <p className="text-sm font-semibold text-ink-950">{formatDateTimeShort(call.scheduled_at)}</p>
        {call.duration_min ? <span className="text-xs text-ink-500">{call.duration_min} min</span> : null}
        <span className="ml-auto text-xs text-ink-500">{coach?.name}</span>
      </header>

      {call.summary ? <p className="mt-4 text-sm leading-relaxed text-ink-700">{call.summary}</p> : null}

      {call.topics?.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {call.topics.map((t) => (
            <span key={t} className="pill border border-ink-200 bg-ink-50 text-ink-700">{t}</span>
          ))}
        </div>
      ) : null}

      {actions.length > 0 ? (
        <div className="mt-5">
          <p className="label">Action items</p>
          <ul className="space-y-1.5">
            {actions.map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm text-ink-700">
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${a.done ? 'bg-emerald-500' : 'bg-brand-600'}`} />
                <span className={a.done ? 'text-ink-400 line-through' : ''}>{a.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {call.recording_url ? <audio controls preload="none" src={call.recording_url} className="mt-5 h-9 w-full" /> : null}

      {call.raw_notes ? (
        <details className="mt-4 rounded-lg border border-ink-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink-700">Full transcript</summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{call.raw_notes}</p>
        </details>
      ) : null}
    </article>
  );
}
