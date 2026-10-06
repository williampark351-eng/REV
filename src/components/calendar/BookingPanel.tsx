import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, X } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { formatDateTimeShort } from '@/lib/format';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function datesForBooking(windowDays: number): Date[] {
  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index + 1);
    return date;
  });
}

export function BookingPanel({ onClose }: { onClose: () => void }) {
  const { student, coachById, availabilityFor, settingsFor, calls, bookCall } = useData();
  const coach = coachById(student?.coach_id ?? null);
  const settings = settingsFor(coach?.id ?? null);
  const availability = availabilityFor(coach?.id ?? null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => datesForBooking(settings?.window_days ?? 30), [settings?.window_days]);
  const selected = dates.find((date) => dateKey(date) === selectedDate);
  const slots = useMemo(() => {
    if (!selected) return [];
    const duration = settings?.duration_min ?? 60;
    const buffer = settings?.buffer_min ?? 15;
    return availability
      .filter((window) => window.weekday === selected.getDay())
      .flatMap((window) => {
        const result: string[] = [];
        const [startHour, startMinute] = window.start_time.slice(0, 5).split(':').map(Number);
        const [endHour, endMinute] = window.end_time.slice(0, 5).split(':').map(Number);
        const cursor = new Date(selected);
        cursor.setHours(startHour, startMinute, 0, 0);
        const end = new Date(selected);
        end.setHours(endHour, endMinute, 0, 0);
        while (cursor.getTime() + duration * 60000 <= end.getTime()) {
          if (cursor.getTime() > Date.now()) {
            const value = cursor.toISOString();
            const taken = calls.some((call) => call.status === 'booked' && call.coach_id === coach?.id && call.scheduled_at === value);
            if (!taken) result.push(value);
          }
          cursor.setMinutes(cursor.getMinutes() + duration + buffer);
        }
        return result;
      });
  }, [availability, calls, coach?.id, selected, settings?.buffer_min, settings?.duration_min]);

  if (!student || !coach) return null;

  const submit = async () => {
    if (!selectedSlot || !settings) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await bookCall({ studentId: student.id, coachId: coach.id, scheduledAt: selectedSlot, durationMin: settings.duration_min });
    if (result) setError(result);
    else {
      setMessage('Your 1:1 is booked. It now appears on your home screen.');
      setSelectedSlot('');
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="booking-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-ink-100 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Book a ReV 1:1</p>
            <h2 id="booking-title" className="mt-1 text-xl font-bold tracking-tight text-ink-900">Choose a time with {coach.name.split(' ')[0]}</h2>
            <p className="mt-1 text-sm text-ink-500">{settings?.duration_min ?? 60} minutes · {settings?.timezone ?? 'Coach local time'}</p>
          </div>
          <button type="button" className="btn-ghost !rounded-full !p-2" onClick={onClose} aria-label="Close booking dialog"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_1.15fr]">
          <div>
            <div className="mb-3 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" /><p className="text-sm font-bold text-ink-900">Pick a day</p></div>
            {dates.filter((date) => availability.some((window) => window.weekday === date.getDay())).length === 0 ? (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your coach has not published any booking times yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {dates.filter((date) => availability.some((window) => window.weekday === date.getDay())).map((date) => {
                  const key = dateKey(date);
                  const active = key === selectedDate;
                  return <button key={key} type="button" onClick={() => { setSelectedDate(key); setSelectedSlot(''); setError(null); }} className={`rounded-xl border px-3 py-3 text-left transition ${active ? 'border-brand-500 bg-brand-50 shadow-sm' : 'border-ink-200 hover:border-brand-300 hover:bg-brand-50/50'}`}><span className="block text-xs font-semibold text-ink-500">{dayNames[date.getDay()]}</span><span className="mt-0.5 block text-sm font-bold text-ink-900">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></button>;
                })}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" /><p className="text-sm font-bold text-ink-900">Pick a time</p></div>
            {!selected ? <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500">Choose a day to see available times.</p> : slots.length === 0 ? <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500">No open times remain on this day.</p> : <div className="grid grid-cols-2 gap-2">{slots.map((slot) => <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${selectedSlot === slot ? 'border-brand-500 bg-brand-600 text-white' : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50'}`}>{new Date(slot).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</button>)}</div>}
          </div>
        </div>

        <div className="border-t border-ink-100 px-5 py-5 sm:px-7">
          {message ? <p className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}
          {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" onClick={submit} disabled={busy || !selectedSlot || !settings}>{busy ? 'Booking…' : 'Confirm booking'}</button></div>
          {selectedSlot ? <p className="mt-3 text-right text-xs text-ink-500">{formatDateTimeShort(selectedSlot)}</p> : null}
        </div>
      </div>
    </div>
  );
}
