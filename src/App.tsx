import { useState, useEffect } from 'react';
import { DataProvider, useData } from '@/state/DataContext';
import { ToastProvider } from '@/components/ui/Toast';
import { LoginScreen } from '@/components/auth/LoginScreen';
import { Shell } from '@/components/layout/Shell';
import type { CoachTab, StudentTab } from '@/components/layout/Shell';
import { CoachDashboard } from '@/pages/coach/CoachDashboard';
import { ReviewQueue } from '@/pages/coach/ReviewQueue';
import { ClientList } from '@/pages/coach/ClientList';
import { StudentProfile } from '@/pages/coach/StudentProfile';
import { RoadmapsPage } from '@/pages/coach/RoadmapsPage';
import { CoachCalendar } from '@/pages/coach/CoachCalendar';
import { CallStudio } from '@/pages/coach/CallStudio';
import { AITraining } from '@/pages/shared/AITraining';
import { LiveTranslate } from '@/pages/shared/LiveTranslate';
import { StudentHome } from '@/pages/student/StudentHome';
import { StudentHomework } from '@/pages/student/StudentHomework';
import { StudentCalls } from '@/pages/student/StudentCalls';
import { StudentRoadmap } from '@/pages/student/StudentRoadmap';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function MissingProfile({ kind }: { kind: 'coach' | 'client' }) {
  const { logout, refresh } = useData();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
      <p className="eyebrow">REV University</p>
      <p className="mt-2 text-lg font-semibold text-ink-950">We couldn't find your {kind} profile</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        Your sign-in worked, but the profile linked to it didn't load. Try again, or sign in with a different account.
      </p>
      <div className="mt-5 flex gap-2">
        <button type="button" className="btn-primary" onClick={() => void refresh()}>Try again</button>
        <button type="button" className="btn-outline" onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}

function CoachApp() {
  const { coach } = useData();
  const [tab, setTab] = useState<CoachTab>('dashboard');
  const [activeStudent, setActiveStudent] = useState<string | null>(null);
  const [studioStudent, setStudioStudent] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Coach Dashboard — REV University';
  }, []);

  const navigate = (t: CoachTab, studentId?: string) => {
    setTab(t);
    if (t === 'studio') {
      setStudioStudent(studentId ?? null);
      setActiveStudent(null);
    } else if (studentId) setActiveStudent(studentId);
    else if (t !== 'clients') setActiveStudent(null);
  };

  if (!coach) return <MissingProfile kind="coach" />;

  if (tab === 'clients' && activeStudent) {
    return (
      <Shell role="coach" active="clients" onNavigate={(t) => navigate(t as CoachTab)}>
        <StudentProfile studentId={activeStudent} onBack={() => setActiveStudent(null)} />
      </Shell>
    );
  }

  return (
    <Shell role="coach" active={tab} onNavigate={(t) => navigate(t as CoachTab)}>
      {tab === 'dashboard' && <CoachDashboard onNavigate={navigate} />}
      {tab === 'homework' && <ReviewQueue />}
      {tab === 'clients' && <ClientList onOpenStudent={setActiveStudent} />}
      {tab === 'roadmaps' && <RoadmapsPage onOpenStudent={(id) => { setActiveStudent(id); setTab('clients'); }} />}
      {tab === 'calendar' && <CoachCalendar />}
      {tab === 'studio' && <CallStudio initialStudentId={studioStudent} />}
      {tab === 'training' && <AITraining audience="coach" />}
      {tab === 'translate' && <LiveTranslate audience="coach" />}
    </Shell>
  );
}

function StudentApp() {
  const { student } = useData();
  const [tab, setTab] = useState<StudentTab>('home');

  useEffect(() => {
    document.title = 'My Hub — REV University';
  }, []);

  if (!student) return <MissingProfile kind="client" />;

  return (
    <Shell role="student" active={tab} onNavigate={(t) => setTab(t as StudentTab)}>
      {tab === 'home' && <StudentHome onNavigate={setTab} />}
      {tab === 'homework' && <StudentHomework />}
      {tab === 'calls' && <StudentCalls />}
      {tab === 'roadmap' && <StudentRoadmap />}
      {tab === 'training' && <AITraining audience="student" />}
      {tab === 'translate' && <LiveTranslate audience="student" />}
    </Shell>
  );
}

function Gate() {
  const { session, loading, error, coaches, refresh } = useData();

  if (loading && coaches.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-white" />
          <p className="text-sm text-ink-400">Loading your coaching hub…</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-4 text-center">
        <p className="text-base font-semibold text-ink-800">We couldn't load the app</p>
        <p className="mt-1 max-w-sm text-sm text-ink-500">
          Please check your connection and try again.
        </p>
        <button type="button" className="btn-primary mt-5" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return session.role === 'coach' ? <CoachApp /> : <StudentApp />;
}

function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <ErrorBoundary>
          <Gate />
        </ErrorBoundary>
      </DataProvider>
    </ToastProvider>
  );
}

export default App;
