import { useMemo, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useData } from '@/state/DataContext';
import type { CoachAvailability } from '@/lib/types';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London'];

type DraftWindow = Omit<CoachAvailability, 'id'> & { id?: string };

export function CoachCalendar() {
  const { coach, availabilityFor, settingsFor, saveAvailability, saveBookingSettings } = useData();
  const existing = availabilityFor(coach?.id ?? null);
  const settings = settingsFor(coach?.id ?? null);
  const [draft, setDraft] = useState<DraftWindow[]>(existing);
  const [timezone, setTimezone] = useState(settings?.timezone ?? 'America/New_York');
  const [duration, setDuration] = useState(settings?.duration_min ?? 60);
  const [buffer, setBuffer] = useState(settings?.buffer_min ?? 15);
  const [windowDays, setWindowDays] = useState(settings?.window_days ?? 30);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const grouped = useMemo(() => dayNames.map((name, weekday) => ({ name, weekday, windows: draft.filter((row) => row.weekday === weekday) })), [draft]);

  if (!coach) return null;

  const addWindow = (weekday: number) => setDraft((rows) => [...rows, { coach_id: coach.id, weekday, start_time: '09:00', end_time: '10:00', active: true }]);
  const updateWindow = (row: DraftWindow, patch: Partial<DraftWindow>) => setDraft((rows) => rows.map((item) => item === row ? { ...item, ...patch } : item));
  const removeWindow = (row: DraftWindow) => setDraft((rows) => rows.map((item) => item === row ? { ...item, active: false } : item));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    for (const row of draft) await saveAvailability(row);
    await saveBookingSettings({ id: settings?.id, coach_id: coach.id, timezone, duration_min: duration, buffer_min: buffer, window_days: windowDays });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-600">Your booking page</p>
        <h1 className="page-title mt-2">Availability & scheduling</h1>
        <p className="page-sub">Publish the hours students can book. REV will create call records automatically and keep every slot in sync with your coaching hub.</p>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div><h2 className="text-base font-bold text-ink-900">Weekly availability</h2><p className="mt-0.5 text-sm text-ink-500">Add one or more bookable windows for each day.</p></div></div>
        <div className="space-y-3">
          {grouped.map(({ name, weekday, windows }) => <div key={name} className="rounded-2xl border border-ink-100 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-ink-900">{name}</p><button type="button" className="btn-ghost !px-2.5 !py-1.5 text-xs text-brand-700" onClick={() => addWindow(weekday)}><Plus className="h-3.5 w-3.5" /> Add time</button></div>{windows.filter((row) => row.active).length === 0 ? <p className="mt-2 text-sm text-ink-400">Not available</p> : <div className="mt-3 space-y-2">{windows.filter((row) => row.active).map((row) => <div key={row.id ?? `${row.weekday}-${row.start_time}-${row.end_time}`} className="flex flex-wrap items-center gap-2"><input aria-label={`${name} start time`} type="time" className="field w-auto" value={row.start_time.slice(0, 5)} onChange={(event) => updateWindow(row, { start_time: event.target.value })} /><span className="text-sm text-ink-400">to</span><input aria-label={`${name} end time`} type="time" className="field w-auto" value={row.end_time.slice(0, 5)} onChange={(event) => updateWindow(row, { end_time: event.target.value })} /><button type="button" className="btn-ghost !p-2 text-ink-400 hover:text-rose-600" onClick={() => removeWindow(row)} aria-label={`Remove ${name} time`}><Trash2 className="h-4 w-4" /></button></div>)}</div>}</div>)}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><div><h2 className="text-base font-bold text-ink-900">Booking rules</h2><p className="mt-0.5 text-sm text-ink-500">Control how your ReV booking page behaves.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="label">Timezone</span><select className="field" value={timezone} onChange={(event) => setTimezone(event.target.value)}>{timezones.map((zone) => <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>)}</select></label><label className="block"><span className="label">Call length</span><select className="field" value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={30}>30 minutes</option><option value={45}>45 minutes</option><option value={60}>60 minutes</option><option value={90}>90 minutes</option></select></label><label className="block"><span className="label">Buffer between calls</span><select className="field" value={buffer} onChange={(event) => setBuffer(Number(event.target.value))}><option value={0}>No buffer</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option></select></label><label className="block"><span className="label">Booking window</span><select className="field" value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}><option value={14}>Next 14 days</option><option value={30}>Next 30 days</option><option value={60}>Next 60 days</option><option value={90}>Next 90 days</option></select></label></div>
        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-ink-500">Students will only see times inside your published windows.</p><button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save booking page'}</button></div>
      </section>
    </div>
  );
}
