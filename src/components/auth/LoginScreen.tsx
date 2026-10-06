import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useData } from '@/state/DataContext';

const DEMO_PASSWORD = 'JonahdaBeast2';
const DEMOS = [
  { label: 'Coach workspace', email: 'coach.demo@example.com' },
  { label: 'Client workspace', email: 'client.demo@example.com' },
];

const FEATURES = [
  { title: 'Call Studio', text: 'Every call gets a meeting room, recording, and live transcript automatically.' },
  { title: 'AI Training', text: 'A voice coach that explains REV methods out loud and answers questions.' },
  { title: 'Live Translate', text: 'Real-time translation for clients in any language.' },
];

export function LoginScreen() {
  const { login, loading } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (address: string, secret: string, key: string) => {
    setBusy(key);
    setError(null);
    const err = await login(address, secret);
    setBusy(null);
    if (err) setError(err);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void signIn(email, password, 'form');
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(70% 55% at 0% 0%, rgba(19,175,224,0.18) 0%, rgba(19,175,224,0) 70%)' }}
        />
        <div className="relative">
          <p className="font-display text-xl font-bold tracking-tight">
            REV <span className="text-brand-400">University</span>
          </p>
          <p className="eyebrow mt-1 text-ink-400">Coaching Hub</p>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[40px] font-bold leading-[1.1] tracking-tight">
            Run every client relationship from one place.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-300">
            Homework, roadmaps, calls, and AI notes, built for REV coaches and the members they serve.
          </p>
          <ul className="mt-10 space-y-6">
            {FEATURES.map(({ title, text }) => (
              <li key={title} className="border-l-2 border-brand-500 pl-4">
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-ink-500">© {new Date().getFullYear()} REV University</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm animate-fade-in">
          <img src="/rev-logo.png" alt="REV University" className="h-8 w-auto select-none" draggable={false} />
          <h2 className="mt-10 font-display text-2xl font-bold tracking-tight text-ink-950">Sign in</h2>
          <p className="mt-2 text-sm text-ink-500">Use your REV account, or jump straight into a demo workspace.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="field h-11"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="field h-11 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-ink-400 hover:text-ink-700"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            <button type="submit" className="btn-primary h-11 w-full" disabled={!!busy || loading}>
              {busy === 'form' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          </form>

          <div className="my-8 flex items-center gap-3">
            <span className="h-px flex-1 bg-ink-200" />
            <span className="eyebrow">Demo access</span>
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          <div className="space-y-2">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                type="button"
                disabled={!!busy}
                onClick={() => void signIn(d.email, DEMO_PASSWORD, d.email)}
                className="group flex w-full items-center justify-between rounded-lg border border-ink-200 px-4 py-3 text-left transition-colors hover:border-ink-950"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink-950">{d.label}</span>
                  <span className="block text-xs text-ink-500">{d.email}</span>
                </span>
                {busy === d.email ? (
                  <Loader2 className="h-4 w-4 animate-spin text-ink-500" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-950" />
                )}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
