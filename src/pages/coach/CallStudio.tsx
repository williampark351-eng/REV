import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FileAudio, Loader2, Search, Upload } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { transcribeAudio, uploadRecording } from '@/lib/ai';
import { formatDateTimeShort, isUpcoming } from '@/lib/format';
import type { Call } from '@/lib/types';
import { LiveSession } from '@/components/studio/LiveSession';

type View = 'session' | 'library';

export function CallStudio({ initialStudentId }: { initialStudentId?: string | null }) {
  const { students, calls, coach, studentById, startCall, updateCall } = useData();
  const [view, setView] = useState<View>('session');
  const [studentId, setStudentId] = useState<string>(initialStudentId ?? '');
  const [callId, setCallId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const student = studentById(studentId || null);
  const activeCall = calls.find((c) => c.id === callId);
  const booked = useMemo(
    () =>
      calls
        .filter((c) => c.student_id === studentId && c.status === 'booked')
        .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? '')),
    [calls, studentId],
  );

  const newCall = async () => {
    if (!studentId) return;
    setCreating(true);
    setError(null);
    try {
      setCallId(await startCall(studentId, coach?.id ?? student?.coach_id ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start the call.');
    } finally {
      setCreating(false);
    }
  };

  const openFromLibrary = (call: Call) => {
    setStudentId(call.student_id);
    setCallId(call.id);
    setView('session');
  };

  if (activeCall && student) {
    return (
      <div>
        <button onClick={() => setCallId(null)} className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-950">
          <ArrowLeft className="h-4 w-4" /> All calls
        </button>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Call Studio</p>
            <h1 className="page-title mt-2">{student.name}</h1>
            <p className="page-sub">
              {activeCall.scheduled_at ? formatDateTimeShort(activeCall.scheduled_at) : 'Now'} · {student.stage}
              {student.thirty_day_win ? ` · Goal: ${student.thirty_day_win}` : ''}
            </p>
          </div>
        </div>
        <LiveSession key={activeCall.id} call={activeCall} student={student} onDone={() => setCallId(null)} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Calls & AI</p>
          <h1 className="page-title mt-2">Call Studio</h1>
          <p className="page-sub">
            Every call gets its own meeting room and recording. Transcripts stream in live and REV writes the summary,
            action items, and homework while you talk.
          </p>
        </div>
        <div className="flex rounded-lg border border-ink-200 bg-white p-1">
          {(['session', 'library'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                view === v ? 'bg-ink-950 text-white' : 'text-ink-600 hover:text-ink-950'
              }`}
            >
              {v === 'session' ? 'Start a call' : 'Recordings library'}
            </button>
          ))}
        </div>
      </div>

      {view === 'library' ? (
        <Library onOpen={openFromLibrary} updateCall={updateCall} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-950">1. Choose a client</p>
            <select
              className="field mt-3"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setError(null);
              }}
            >
              <option value="">Select a client…</option>
              {students
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.stage}
                  </option>
                ))}
            </select>
            {student ? (
              <dl className="mt-5 space-y-3 border-t border-ink-100 pt-5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Email</dt>
                  <dd className="truncate text-ink-900">{student.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Stage</dt>
                  <dd className="text-ink-900">{student.stage}</dd>
                </div>
                {student.thirty_day_win ? (
                  <div>
                    <dt className="text-ink-500">30-day win</dt>
                    <dd className="mt-1 leading-relaxed text-ink-900">{student.thirty_day_win}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-ink-200 p-5">
              <p className="text-sm font-semibold text-ink-950">2. Pick the call</p>
              <p className="mt-1 text-sm text-ink-500">Open a booked call or start one right now. Both come with a ready meeting link.</p>
            </div>
            {!student ? (
              <div className="px-5 py-16 text-center text-sm text-ink-500">Choose a client to see their calls.</div>
            ) : (
              <div className="divide-y divide-ink-100">
                <button
                  onClick={newCall}
                  disabled={creating}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin text-brand-700" /> : null}
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-ink-950">Start a call now</span>
                    <span className="block text-sm text-ink-500">Creates the meeting room and opens the live studio</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-600" />
                </button>
                {booked.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCallId(c.id)}
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-ink-50"
                  >
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-ink-950">{formatDateTimeShort(c.scheduled_at)}</span>
                      <span className="block text-sm text-ink-500">
                        {isUpcoming(c.scheduled_at) ? 'Booked' : 'Booked, not yet recorded'} · {c.duration_min ?? 60} min
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-ink-600" />
                  </button>
                ))}
                {error ? <p className="px-5 py-3 text-sm text-rose-700">{error}</p> : null}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Library({
  onOpen,
  updateCall,
}: {
  onOpen: (call: Call) => void;
  updateCall: ReturnType<typeof useData>['updateCall'];
}) {
  const { calls, studentById } = useData();
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = calls
    .filter((c) => c.status === 'completed')
    .filter((c) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const name = studentById(c.student_id)?.name.toLowerCase() ?? '';
      return name.includes(q) || (c.raw_notes ?? '').toLowerCase().includes(q) || (c.summary ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? ''));

  const upload = async (call: Call, file: File) => {
    setError(null);
    if (file.size > 25 * 1024 * 1024) {
      setError('That file is over 25 MB. Please upload a shorter or compressed recording.');
      return;
    }
    setBusyId(call.id);
    try {
      const [url, text] = await Promise.all([uploadRecording(call.student_id, call.id, file), transcribeAudio(file, file.name)]);
      await updateCall(call.id, { recording_url: url, raw_notes: text });
      onOpen({ ...call, recording_url: url, raw_notes: text });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-ink-200 px-5 py-3">
        <Search className="h-4 w-4 text-ink-400" />
        <input
          className="w-full border-0 bg-transparent p-0 text-sm focus:outline-none focus:ring-0"
          placeholder="Search by client or anything said on the call"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error ? <p className="border-b border-rose-200 bg-rose-50 px-5 py-2 text-sm text-rose-800">{error}</p> : null}
      {done.length === 0 ? (
        <div className="px-5 py-16 text-center text-sm text-ink-500">No completed calls match.</div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {done.map((c) => {
            const name = studentById(c.student_id)?.name ?? 'Client';
            return (
              <li key={c.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-ink-950">{name}</p>
                    <span className="text-xs text-ink-500">{formatDateTimeShort(c.scheduled_at)}</span>
                    {c.raw_notes ? (
                      <span className="pill bg-emerald-50 text-emerald-700">Transcript</span>
                    ) : (
                      <span className="pill bg-ink-100 text-ink-600">No transcript</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
                    {c.summary || c.raw_notes || 'No notes yet. Upload the recording to transcribe and draft notes.'}
                  </p>
                  {c.recording_url ? <audio controls preload="none" src={c.recording_url} className="mt-3 h-9 w-full max-w-md" /> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <label className={`btn-outline cursor-pointer ${busyId === c.id ? 'pointer-events-none opacity-60' : ''}`}>
                    {busyId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {busyId === c.id ? 'Transcribing…' : 'Upload audio'}
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void upload(c, file);
                      }}
                    />
                  </label>
                  <button onClick={() => onOpen(c)} className="btn-secondary">
                    <FileAudio className="h-4 w-4" /> Open
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
