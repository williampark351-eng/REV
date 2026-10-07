import { useEffect, useRef, useState } from 'react';
import { Check, Copy, ExternalLink, Loader2, Mic, MonitorUp, RotateCcw, Sparkles, Square } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { draftCall, uploadRecording } from '@/lib/ai';
import type { Call, Student } from '@/lib/types';
import { useCallCapture } from '@/components/studio/useCallCapture';
import { DraftsPanel, toEditable, toSelected } from '@/components/studio/DraftsPanel';
import type { EditableDrafts } from '@/components/studio/DraftsPanel';

const clock = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

function contextFor(student: Student) {
  return [
    `Client: ${student.name}`,
    `Stage: ${student.stage}`,
    student.thirty_day_win ? `30-day win goal: ${student.thirty_day_win}` : '',
    student.goal_revenue ? `Revenue goal: $${student.goal_revenue}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

interface Props {
  call: Call;
  student: Student;
  onDone: () => void;
}

export function LiveSession({ call, student, onDone }: Props) {
  const { updateCall, applyCallDrafts } = useData();
  const capture = useCallCapture();
  const [includeTab, setIncludeTab] = useState(true);
  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState<EditableDrafts | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [stage, setStage] = useState<'ready' | 'saving' | 'review' | 'saved'>(
    call.raw_notes ? 'review' : 'ready',
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftedAt = useRef(0);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const transcript = capture.segments.length
    ? capture.segments.map((s) => `[${clock(s.offsetSec)}] ${s.text}`).join('\n')
    : call.raw_notes ?? '';

  const runDraft = async (text: string) => {
    if (!text.trim() || drafting) return;
    setDrafting(true);
    setDraftError(null);
    try {
      setDrafts(toEditable(await draftCall(text, contextFor(student))));
    } catch (cause) {
      setDraftError(cause instanceof Error ? cause.message : 'Could not draft notes.');
    } finally {
      setDrafting(false);
    }
  };

  useEffect(() => {
    const count = capture.segments.length;
    if (capture.phase === 'recording' && count >= 2 && count - draftedAt.current >= 2) {
      draftedAt.current = count;
      void runDraft(transcript);
    }
    transcriptEnd.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture.segments.length]);

  useEffect(() => {
    if (call.raw_notes && !drafts) void runDraft(call.raw_notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = async () => {
    draftedAt.current = 0;
    setDrafts(null);
    if (stage === 'saved') setStage('review');
    await capture.start(includeTab);
  };

  const finish = async () => {
    const blob = await capture.stop();
    setStage('saving');
    setSaveError(null);
    try {
      const recording_url = blob && blob.size > 0 ? await uploadRecording(student.id, call.id, blob) : call.recording_url;
      const finalText = capture.segments.length
        ? capture.segments.map((s) => `[${clock(s.offsetSec)}] ${s.text}`).join('\n')
        : '';
      await updateCall(call.id, {
        status: 'completed',
        recording_url,
        raw_notes: finalText || call.raw_notes,
        duration_min: Math.max(1, Math.round(capture.elapsed / 60)),
      });
      setStage('review');
      if (finalText) await runDraft(finalText);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Saving the recording failed.');
      setStage('review');
    }
  };

  const save = async () => {
    if (!drafts) return;
    setSaveError(null);
    try {
      await applyCallDrafts(call, toSelected(drafts));
      setStage('saved');
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save to the client profile.');
    }
  };

  const copy = async () => {
    if (!call.meeting_link) return;
    await navigator.clipboard.writeText(call.meeting_link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const recording = capture.phase === 'recording';
  const busy = capture.phase === 'starting' || capture.phase === 'finishing' || stage === 'saving';

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-6">
        <div className="card p-5">
          <p className="label">Meeting room</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 truncate rounded-lg border border-ink-200 bg-ink-50 px-3 py-2.5 font-mono text-[13px] text-ink-800">
              {call.meeting_link ?? 'No meeting link'}
            </div>
            <div className="flex gap-2">
              <button onClick={copy} className="btn-outline" disabled={!call.meeting_link}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {call.meeting_link ? (
                <a href={call.meeting_link} target="_blank" rel="noreferrer" className="btn btn-primary">
                  <ExternalLink className="h-4 w-4" /> Join
                </a>
              ) : null}
            </div>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Share this link with {student.name.split(' ')[0]}. The recording and transcript save to this call automatically.
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-ink-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={`relative flex h-2.5 w-2.5 rounded-full ${recording ? 'bg-rose-500' : 'bg-ink-300'}`}>
                {recording ? <span className="absolute inset-0 animate-live-ring rounded-full bg-rose-500" /> : null}
              </span>
              <span className="font-mono text-lg font-semibold tabular-nums text-ink-950">{clock(capture.elapsed)}</span>
              <span className="text-sm text-ink-500">
                {recording ? 'Recording' : stage === 'saving' ? 'Saving recording…' : capture.phase === 'starting' ? 'Starting…' : 'Not recording'}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {!recording ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
                    checked={includeTab}
                    onChange={(e) => setIncludeTab(e.target.checked)}
                    disabled={busy}
                  />
                  <MonitorUp className="h-4 w-4 text-ink-400" /> Include meeting tab audio
                </label>
              ) : null}
              {recording ? (
                <button onClick={finish} className="btn-danger">
                  <Square className="h-4 w-4 fill-current" /> End & save
                </button>
              ) : (
                <button onClick={begin} disabled={busy} className="btn btn-primary">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  {stage === 'review' || stage === 'saved' ? 'Record again' : 'Start recording'}
                </button>
              )}
            </div>
          </div>

          {capture.error ? (
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{capture.error}</div>
          ) : null}

          <div className="h-[420px] overflow-y-auto px-5 py-4">
            {transcript ? (
              <div className="space-y-3">
                {(capture.segments.length ? capture.segments.map((s) => ({ key: s.index, time: clock(s.offsetSec), text: s.text })) : [
                  { key: 0, time: '', text: transcript },
                ]).map((line) => (
                  <div key={line.key} className="flex gap-4 animate-fade-in">
                    {line.time ? <span className="w-12 shrink-0 pt-0.5 font-mono text-xs text-ink-400">{line.time}</span> : null}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{line.text}</p>
                  </div>
                ))}
                {capture.pending > 0 ? (
                  <p className="flex items-center gap-2 pl-16 text-xs text-ink-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Transcribing the last few seconds…
                  </p>
                ) : null}
                <div ref={transcriptEnd} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-ink-900">{recording ? 'Listening…' : 'Transcript will stream here'}</p>
                <p className="mt-1 max-w-sm text-sm text-ink-500">
                  {recording
                    ? 'The first lines appear about 40 seconds in, then update continuously.'
                    : 'Join the meeting, then press Start recording. Choose the meeting tab and tick "Share tab audio" so both voices are captured.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card flex flex-col overflow-hidden xl:sticky xl:top-20 xl:max-h-[calc(100vh-7rem)]">
        <div className="flex items-center gap-2 border-b border-ink-200 px-5 py-4">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-ink-950">Atlas first drafts</h2>
          <button
            onClick={() => runDraft(transcript)}
            disabled={!transcript || drafting}
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-40"
          >
            {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Draft now
          </button>
        </div>
        {draftError ? <div className="bg-rose-50 px-5 py-2 text-xs text-rose-800">{draftError}</div> : null}
        <div className="flex-1 overflow-y-auto">
          <DraftsPanel drafts={drafts} onChange={setDrafts} drafting={drafting} live={recording} />
        </div>
        <div className="border-t border-ink-200 p-4">
          {saveError ? <p className="mb-2 text-xs text-rose-700">{saveError}</p> : null}
          {stage === 'saved' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <Check className="h-4 w-4" /> Saved to {student.name.split(' ')[0]}'s profile
              </p>
              <button onClick={onDone} className="btn-outline">Done</button>
            </div>
          ) : (
            <button
              onClick={save}
              disabled={!drafts || recording || stage === 'saving' || drafting}
              className="btn btn-primary w-full"
            >
              Approve & save to client
            </button>
          )}
          {recording ? <p className="mt-2 text-center text-xs text-ink-500">End the recording to approve drafts.</p> : null}
        </div>
      </div>
    </div>
  );
}
