export function LevelMeter({ level, active }: { level: number; active: boolean }) {
  const bars = 24;
  const lit = Math.round(Math.min(1, level * 4) * bars);
  return (
    <div className="flex h-6 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all duration-75 ${active && i < lit ? 'bg-brand-600' : 'bg-ink-200'}`}
          style={{ height: `${30 + ((i * 37) % 70)}%` }}
        />
      ))}
    </div>
  );
}
