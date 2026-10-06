import type { ReactNode } from 'react';

export function SectionTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
        {sub ? <p className="mt-0.5 text-sm text-ink-500">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {sub ? <p className="mt-1 max-w-sm text-sm text-ink-500">{sub}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
