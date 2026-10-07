import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Copy, Loader2, Mic, MonitorUp, Square, Volume2 } from 'lucide-react';
import { useRealtime } from '@/lib/useRealtime';
import type { RealtimeEvent } from '@/lib/useRealtime';
import { captureCallAudio } from '@/lib/audio';
import { LevelMeter } from '@/components/ui/LevelMeter';

const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['ru', 'Russian'],
  ['zh', 'Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['ar', 'Arabic'],
  ['hi', 'Hindi'],
] as const;

interface Pane {
  order: string[];
  text: Record<string, string>;
}

const empty: Pane = { order: [], text: {} };

function put(p: Pane, id: string, text: string, append: boolean): Pane {
  const known = id in p.text;
  return {
    order: known ? p.order : [...p.order, id],
    text: { ...p.text, [id]: append && known ? p.text[id] + text : text },
  };
}

export function LiveTranslate({ audience }: { audience: 'coach' | 'student' }) {
  const [target, setTarget] = useState<string>('es');
  const [speak, setSpeak] = useState(false);
  const [includeTab, setIncludeTab] = useState(false);
  const [source, setSource] = useState<Pane>(empty);
  const [output, setOutput] = useState<Pane>(empty);
  const [micError, setMicError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const srcEnd = useRef<HTMLDivElement>(null);
  const outEnd = useRef<HTMLDivElement>(null);
  const outputKind = useRef<Record<string, 'text' | 'audio'>>({});

  const claim = (key: string, kind: 'text' | 'audio') => {
    const owner = outputKind.current[key];
    if (owner && owner !== kind) return false;
    outputKind.current[key] = kind;
    return true;
  };

  const onEvent = (e: RealtimeEvent) => {
    const id = String(e.item_id ?? e.response_id ?? 'x');
    const key = String(e.response_id ?? id);
    const delta = typeof e.delta === 'string' ? e.delta : typeof e.text === 'string' ? e.text : null;
    if (e.type === 'conversation.item.input_audio_transcription.delta' && delta) setSource((p) => put(p, id, delta, true));
    if (e.type === 'conversation.item.input_audio_transcription.text' && delta) setSource((p) => put(p, id, delta, false));
    if (e.type === 'conversation.item.input_audio_transcription.completed' && typeof e.transcript === 'string')
      setSource((p) => put(p, id, e.transcript as string, false));
    if (e.type === 'response.text.delta' && delta && claim(key, 'text')) setOutput((p) => put(p, key, delta, true));
    if (e.type === 'response.audio_transcript.delta' && delta && claim(key, 'audio')) setOutput((p) => put(p, key, delta, true));
    if (e.type === 'response.text.done' && typeof e.text === 'string' && claim(key, 'text'))
      setOutput((p) => put(p, key, e.text as string, false));
    if (e.type === 'response.audio_transcript.done' && typeof e.transcript === 'string' && claim(key, 'audio'))
      setOutput((p) => put(p, key, e.transcript as string, false));
  };

  const rt = useRealtime('translate', onEvent);
  const live = rt.status === 'live';
  const busy = rt.status === 'connecting' || rt.status === 'ending';

  useEffect(() => {
    srcEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [source]);
  useEffect(() => {
    outEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [output]);

  const start = async () => {
    setMicError(null);
    setSource(empty);
    setOutput(empty);
    outputKind.current = {};
    try {
      const capture = await captureCallAudio(includeTab);
      rt.start(
        { output_modalities: speak ? ['text', 'audio'] : ['text'], translation: { language: target } },
        capture.stream,
        capture.stop,
        speak,
      );
    } catch (cause) {
      setMicError(cause instanceof Error ? cause.message : 'Microphone access is needed for live translation.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output.order.map((id) => output.text[id]).join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setMicError('Copying is blocked in this browser. Select the text and copy it manually.');
    }
  };

  const targetName = LANGUAGES.find(([c]) => c === target)?.[1] ?? target;

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">{audience === 'coach' ? 'Calls & AI' : 'AI tools'}</p>
        <h1 className="page-title mt-2">Live Translate</h1>
        <p className="page-sub">
          Speak in any language and see it translated as you talk. Include the meeting tab to translate a client on a
          call, and optionally hear the translation spoken aloud.
        </p>
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-5 p-5">
        <div className="w-48">
          <label className="label" htmlFor="target">Translate into</label>
          <select id="target" className="field" value={target} disabled={live || busy} onChange={(e) => setTarget(e.target.value)}>
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
            checked={speak}
            disabled={live || busy}
            onChange={(e) => setSpeak(e.target.checked)}
          />
          <Volume2 className="h-4 w-4 text-ink-400" /> Speak translation aloud
        </label>
        <label className="flex h-10 cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-ink-300 text-brand-700 focus:ring-brand-500"
            checked={includeTab}
            disabled={live || busy}
            onChange={(e) => setIncludeTab(e.target.checked)}
          />
          <MonitorUp className="h-4 w-4 text-ink-400" /> Include meeting tab audio
        </label>
        <div className="ml-auto flex items-center gap-4">
          <LevelMeter level={rt.level} active={live} />
          {live || busy ? (
            <button onClick={() => void rt.stop()} disabled={rt.status === 'ending'} className="btn-danger">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
              {rt.status === 'connecting' ? 'Connecting… Cancel' : rt.status === 'ending' ? 'Finishing…' : 'Stop'}
            </button>
          ) : (
            <button onClick={() => void start()} className="btn-primary">
              <Mic className="h-4 w-4" /> Start translating
            </button>
          )}
        </div>
      </div>

      {micError || rt.error ? (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{micError ?? rt.error}</div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card flex h-[480px] flex-col overflow-hidden">
          <header className="flex h-14 items-center border-b border-ink-200 px-5">
            <p className="text-sm font-semibold text-ink-950">Original speech</p>
            {live ? <span className="ml-auto text-xs font-semibold text-emerald-700">Listening</span> : null}
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {source.order.length === 0 ? (
              <p className="pt-12 text-center text-sm text-ink-500">{live ? 'Start speaking…' : 'What is said appears here.'}</p>
            ) : (
              source.order.map((id) => (
                <p key={id} className="animate-fade-in text-sm leading-relaxed text-ink-700">{source.text[id]}</p>
              ))
            )}
            <div ref={srcEnd} />
          </div>
        </section>

        <section className="card flex h-[480px] flex-col overflow-hidden border-brand-200">
          <header className="flex h-14 items-center gap-2 border-b border-ink-200 px-5">
            <ArrowRight className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-ink-950">{targetName}</p>
            <button
              onClick={copy}
              disabled={output.order.length === 0}
              className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-100 disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy'}
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {output.order.length === 0 ? (
              <div className="flex flex-col items-center pt-12 text-center">
                <p className="text-sm text-ink-500">Translations stream in here, sentence by sentence.</p>
              </div>
            ) : (
              output.order.map((id) => (
                <p key={id} className="animate-fade-in text-base leading-relaxed text-ink-950">{output.text[id]}</p>
              ))
            )}
            <div ref={outEnd} />
          </div>
        </section>
      </div>
    </div>
  );
}
