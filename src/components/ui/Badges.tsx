import type { HomeworkStatus, Stage } from '@/lib/types';

export function StageBadge({ stage }: { stage: Stage }) {
  const styles: Record<Stage, string> = {
    Onboarding: 'bg-brand-100 text-brand-700',
    Active: 'bg-emerald-100 text-emerald-700',
    Offboarding: 'bg-amber-100 text-amber-700',
    Graduated: 'bg-ink-200 text-ink-600',
    Paused: 'bg-rose-100 text-rose-700',
  };
  return <span className={`pill ${styles[stage]}`}>{stage}</span>;
}

export function HomeworkBadge({ status }: { status: HomeworkStatus }) {
  const styles: Record<HomeworkStatus, string> = {
    assigned: 'bg-ink-100 text-ink-600',
    submitted: 'bg-brand-100 text-brand-700',
    reviewed: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-rose-100 text-rose-700',
  };
  const label: Record<HomeworkStatus, string> = {
    assigned: 'Assigned',
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    overdue: 'Overdue',
  };
  return <span className={`pill ${styles[status]}`}>{label[status]}</span>;
}

export function AtRiskBadge({ reasons }: { reasons: number }) {
  if (reasons === 0) return null;
  return (
    <span className="pill bg-rose-100 text-rose-700">
      {reasons} flag{reasons > 1 ? 's' : ''}
    </span>
  );
}
