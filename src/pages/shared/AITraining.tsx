import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, PhoneOff, Send } from 'lucide-react';
import { useRealtime } from '@/lib/useRealtime';
import type { RealtimeEvent } from '@/lib/useRealtime';
import { captureCallAudio } from '@/lib/audio';
import { LevelMeter } from '@/components/ui/LevelMeter';

const VOICES = ['Aiden', 'Ryan', 'Marcus', 'Dylan', 'Raymond', 'Tina', 'Serena', 'Jennifer'];

const TOPICS = [
  { title: 'The REV roadmap', prompt: 'Walk me through the REV University coaching roadmap and what each stage is for.' },
  { title: 'Running a discovery call', prompt: 'Teach me how to run a great discovery call with a new client, step by step.' },
  { title: 'Pricing your offer', prompt: 'Explain how I should think about pricing my offer and raising prices with confidence.' },
  { title: 'Hiring your first VA', prompt: 'Explain how to hire, onboard, and delegate to my first virtual assistant.' },
  { title: 'Weekly homework', prompt: 'Explain how to get the most out of my weekly homework and how to report progress.' },
  { title: 'Handling objections', prompt: 'Role-play a sales call with me and coach me through handling common objections.' },
];

interface Line {
  id: string;
  role: 'you' | 'coach';
  text: string;
  final: boolean;
}

function instructions(audience: 'coach' | 'student') {
  return [
    'You are the REV University AI training coach, speaking out loud in a live voice session.',
    audience === 'coach'
      ? 'You are training a REV coach on how to deliver better coaching sessions, keep clients accountable, and run the program.'
      : 'You are training a REV University member who is growing a service business.',
    'Explain ideas clearly and practically, like a seasoned business coach. Use short spoken sentences, concrete examples and numbered steps.',
    'Keep each turn under about 45 seconds, then check understanding or ask a question so the learner stays engaged.',
    'Never use markdown, emojis or list symbols since everything is spoken. Answer in the language the learner speaks.',
  ].join(' ');
}

export function AITraining({ audience }: { audience: 'coach' | 'student' }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [voice, setVoice] = useState(VOICES[0]);
  const [typed, setTyped] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const pendingTopic = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const upsert = (id: string, role: Line['role'], text: string, final: boolean, append: boolean) =>
    setLines((list) => {
      const i = list.findIndex((l) => l.id === id);
      if (i === -1) return [...list, { id, role, text, final }];
      const next = list.slice();
      next[i] = { ...next[i], text: append ? next[i].text + text : text, final };
      return next;
    });

  const onEvent = (e: RealtimeEvent) => {
    const itemId = String(e.item_id ?? e.response_id ?? '');
    if (e.type === 'conversation.item.input_audio_transcription.completed' && typeof e.transcript === 'string') {
      if (e.transcript.trim()) upsert(`u-${itemId}`, 'you', e.transcript.trim(), true, false);
    }
    if (e.type === 'response.audio_transcript.delta' && typeof e.delta === 'string') upsert(`a-${itemId}`, 'coach', e.delta, false, true);
    if (e.type === 'response.audio_transcript.done' && typeof e.transcript === 'string') upsert(`a-${itemId}`, 'coach', e.transcript, true, false);
  };

  const rt = useRealtime('assistant', onEvent);
  const live = rt.status === 'live';

  const sendText = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    upsert(`t-${Date.now()}`, 'you', clean, true, false);
    rt.send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: clean }] } });
    rt.send({ type: 'response.create' });
  };

  useEffect(() => {
    if (live && pendingTopic.current) {
      const topic = pendingTopic.current;
      pendingTopic.current = null;
      sendText(topic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines]);

  const connect = async (topic?: string) => {
    setMicError(null);
    pendingTopic.current = topic ?? null;
    try {
      const mic = await captureCallAudio(false);
      rt.start(
        {
          modalities: ['text', 'audio'],
          voice,
          instructions: instructions(audience),
          input_audio_format: 'pcm',
          output_audio_format: 'pcm',
          input_audio_transcription: { model: 'qwen3-asr-flash-realtime' },
          turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 800 },
        },
        mic.stream,
        mic.stop,
        true,
      );
    } catch {
      setMicError('Microphone access is needed to talk with the AI coach. Allow it in your browser and try again.');
    }
  };

  const pickTopic = (prompt: string) => (live ? sendText(prompt) : void connect(prompt));
  const busy = rt.status === 'connecting' || rt.status === 'ending';
  const speaking = lines.length > 0 && !lines[lines.length - 1].final && lines[lines.length - 1].role === 'coach';

  return (
    <div>
      <div className="mb-8">
        <p className="eyebrow">{audience === 'coach' ? 'Calls & AI' : 'AI tools'}</p>
        <h1 className="page-title mt-2">AI Training</h1>
        <p className="page-sub">
          A voice coach that talks you through REV methods out loud. Pick a topic or just start talking, and interrupt
          at any time with a question.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card flex h-[620px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-ink-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-ink-300'}`} />
              <span className="text-sm font-semibold text-ink-950">
                {live ? (speaking ? 'Coach is speaking' : 'Listening') : rt.status === 'connecting' ? 'Connecting…' : 'Not connected'}
              </span>
            </div>
            <LevelMeter level={rt.level} active={live} />
            <div className="ml-auto">
              {live || busy ? (
                <button onClick={() => void rt.stop()} disabled={rt.status === 'ending'} className="btn-danger">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}{' '}
                  {rt.status === 'connecting' ? 'Connecting… Cancel' : 'End session'}
                </button>
              ) : (
                <button onClick={() => void connect()} className="btn-primary">
                  <Mic className="h-4 w-4" /> Start talking
                </button>
              )}
            </div>
          </div>

          {micError || rt.error ? (
            <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">{micError ?? rt.error}</div>
          ) : null}

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
            {lines.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-ink-900">Your training session will appear here</p>
                <p className="mt-1 max-w-sm text-sm text-ink-500">
                  Everything said in the session is written out, so you can read back any explanation.
                </p>
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.id} className={`flex animate-fade-in ${l.role === 'you' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[85%] ${l.role === 'you' ? 'text-right' : ''}`}>
                    <p className="eyebrow mb-1">{l.role === 'you' ? 'You' : 'REV coach'}</p>
                    <p
                      className={`inline-block rounded-xl px-4 py-2.5 text-left text-sm leading-relaxed ${
                        l.role === 'you' ? 'bg-ink-950 text-white' : 'border border-ink-200 bg-ink-50 text-ink-900'
                      }`}
                    >
                      {l.text}
                      {!l.final ? <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-brand-600 align-middle" /> : null}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText(typed);
              setTyped('');
            }}
            className="flex gap-2 border-t border-ink-200 p-3"
          >
            <input
              className="field"
              placeholder={live ? 'Or type a question…' : 'Start a session to type questions'}
              value={typed}
              disabled={!live}
              onChange={(e) => setTyped(e.target.value)}
            />
            <button type="submit" disabled={!live || !typed.trim()} className="btn-secondary px-3" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="card p-5">
            <p className="text-sm font-semibold text-ink-950">Training topics</p>
            <p className="mt-1 text-sm text-ink-500">The coach starts explaining as soon as you pick one.</p>
            <div className="mt-4 space-y-2">
              {TOPICS.map((t) => (
                <button
                  key={t.title}
                  onClick={() => pickTopic(t.prompt)}
                  disabled={busy}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-left text-sm font-semibold text-ink-800 transition-colors hover:border-brand-600 hover:bg-brand-50 hover:text-ink-950"
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <label className="label" htmlFor="voice">Coach voice</label>
            <select id="voice" className="field" value={voice} disabled={live || busy} onChange={(e) => setVoice(e.target.value)}>
              {VOICES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-ink-500">Use headphones so the coach doesn't hear itself.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
