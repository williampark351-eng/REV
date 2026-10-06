import { useState } from 'react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  Home,
  Languages,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Radio,
  RefreshCw,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useData } from '@/state/DataContext';
import { todayLabel } from '@/lib/format';

export type CoachTab =
  | 'dashboard'
  | 'homework'
  | 'clients'
  | 'roadmaps'
  | 'calendar'
  | 'studio'
  | 'training'
  | 'translate';
export type StudentTab = 'home' | 'homework' | 'calls' | 'roadmap' | 'training' | 'translate';

interface NavItem<T> {
  key: T;
  label: string;
  icon: ReactNode;
}

const icon = 'h-[18px] w-[18px]';

const COACH_NAV: { title: string; items: NavItem<CoachTab>[] }[] = [
  {
    title: 'Coaching',
    items: [
      { key: 'dashboard', label: 'Overview', icon: <LayoutDashboard className={icon} /> },
      { key: 'clients', label: 'Clients', icon: <Users className={icon} /> },
      { key: 'homework', label: 'Homework review', icon: <ClipboardCheck className={icon} /> },
      { key: 'roadmaps', label: 'Roadmaps', icon: <Map className={icon} /> },
      { key: 'calendar', label: 'Schedule', icon: <CalendarClock className={icon} /> },
    ],
  },
  {
    title: 'Calls & AI',
    items: [
      { key: 'studio', label: 'Call Studio', icon: <Radio className={icon} /> },
      { key: 'training', label: 'AI Training', icon: <GraduationCap className={icon} /> },
      { key: 'translate', label: 'Live Translate', icon: <Languages className={icon} /> },
    ],
  },
];

const STUDENT_NAV: { title: string; items: NavItem<StudentTab>[] }[] = [
  {
    title: 'My program',
    items: [
      { key: 'home', label: 'Home', icon: <Home className={icon} /> },
      { key: 'homework', label: 'Homework', icon: <BookOpen className={icon} /> },
      { key: 'calls', label: 'Calls & recordings', icon: <Video className={icon} /> },
      { key: 'roadmap', label: 'Roadmap', icon: <Map className={icon} /> },
    ],
  },
  {
    title: 'AI tools',
    items: [
      { key: 'training', label: 'AI Training', icon: <GraduationCap className={icon} /> },
      { key: 'translate', label: 'Live Translate', icon: <Languages className={icon} /> },
    ],
  },
];

interface ShellProps {
  role: 'coach' | 'student';
  active: CoachTab | StudentTab;
  onNavigate: (tab: CoachTab | StudentTab) => void;
  topbar?: ReactNode;
  children: ReactNode;
}

export function Shell({ role, active, onNavigate, topbar, children }: ShellProps) {
  const { coach, student, logout, refresh, loading } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);

  const personName = role === 'coach' ? coach?.name ?? 'Coach' : student?.name ?? 'Client';
  const personSub = role === 'coach' ? coach?.headline ?? 'Coach' : 'REV University member';
  const groups = (role === 'coach' ? COACH_NAV : STUDENT_NAV) as { title: string; items: NavItem<CoachTab | StudentTab>[] }[];
  const current = groups.flatMap((g) => g.items).find((i) => i.key === active);

  const go = (key: CoachTab | StudentTab) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  const nav = (
    <nav className="space-y-7">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="eyebrow mb-2 px-3 text-ink-400">{group.title}</p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => go(item.key)}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive ? 'bg-ink-950 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-950'
                  }`}
                >
                  <span className={isActive ? 'text-brand-400' : 'text-ink-400 group-hover:text-ink-700'}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-ink-200 pt-4">
      <p className="truncate px-3 text-sm font-semibold text-ink-950">{personName}</p>
      <p className="truncate px-3 text-xs text-ink-500">{personSub}</p>
      <button
        onClick={logout}
        className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 lg:hidden">
        <img src="/rev-logo.png" alt="REV University" className="h-6 w-auto" draggable={false} />
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="rounded-lg p-2 text-ink-700 hover:bg-ink-100"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-200 bg-white px-3 pb-4 lg:flex">
        <div className="flex items-center justify-between px-3 pb-8 pt-7">
          <img src="/rev-logo.png" alt="REV University" className="h-7 w-auto select-none" draggable={false} />
          <span className="rounded-md border border-ink-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            {role === 'coach' ? 'Coach' : 'Member'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {account}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-lift animate-fade-in">
            <img src="/rev-logo.png" alt="REV University" className="mb-8 ml-3 mt-2 h-6 w-auto self-start" draggable={false} />
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {account}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <div className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-ink-200 bg-white/95 px-8 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-400">{role === 'coach' ? 'Coach' : 'My program'}</span>
            <span className="text-ink-300">/</span>
            <span className="font-semibold text-ink-950">{current?.label}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-500">{todayLabel()}</span>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-950"
              title="Refresh data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {topbar}
          <ErrorBoundary key={active}>
            <div className="animate-fade-in">{children}</div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
