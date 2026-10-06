import { useMemo, useState } from 'react';
import { ArrowLeft, Mail, Phone, MapPin, CalendarDays, ClipboardList, FileText, Users, Plus, Sparkles, Check, Briefcase, StickyNote } from 'lucide-react';
import { useData } from '@/state/DataContext';
import { STAGES } from '@/lib/types';
import type { Stage, RoadmapMilestone, OnboardingTask, HiringItem } from '@/lib/types';
import { formatDate, formatDateTimeShort, money, timeAgo } from '@/lib/format';
import { StageBadge, HomeworkBadge } from '@/components/ui/Badges';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const ONBOARDING_QUESTIONS: { key: string; label: string }[] = [
  { key: 'current_revenue', label: 'Current monthly revenue' },
  { key: 'goal_revenue', label: 'Goal monthly revenue' },
  { key: 'avg_order_value', label: 'Average order value' },
  { key: 'team_size', label: 'Team size' },
  { key: 'biggest_struggle', label: 'Biggest struggle' },
  { key: 'number_one_goal', label: '#1 thing to get from the program' },
  { key: 'services_offered', label: 'Services you offer' },
  { key: 'lead_source', label: 'How you get clients' },
  { key: 'first_break', label: 'First thing to break if you doubled' },
  { key: 'quality_rating', label: 'Quality rating out of 10' },
  { key: 'website', label: 'Website' },
  { key: 'booking_portal', label: 'Booking portal' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tools', label: 'Tools you use' },
  { key: 'thirty_day_win', label: '30-day win' },
  { key: 'not_working', label: "What hasn't been working" },
  { key: 'shipping_address', label: 'Shipping address' },
];

interface Props {
  studentId: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, onBack }: Props) {
  const data = useData();
  const { toast } = useToast();
  const {
    studentById,
    coachById,
    tasksFor,
    formFor,
    milestonesFor,
    callsFor,
    actionsFor,
    homeworkFor,
    notesFor,
    hiringFor,
    activityFor,
    riskReasons,
    toggleOnboardingTask,
    addNote,
    toggleHiringItem,
    ensureHiringItems,
    updateStudent,
    addActionItem,
  } = data;

  const student = studentById(studentId);
  const [noteText, setNoteText] = useState('');
  const [actionText, setActionText] = useState('');
  const [tab, setTab] = useState<'overview' | 'onboarding' | 'roadmap' | 'hiring' | 'form'>('overview');

  const coach = coachById(student?.coach_id ?? null);

  const sortedCalls = useMemo(
    () =>
      callsFor(studentId)
        .sort((a, b) => (b.scheduled_at ?? '').localeCompare(a.scheduled_at ?? '')),
    [callsFor, studentId],
  );

  if (!student) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-ink-500">Student not found.</p>
        <button className="btn-outline mt-4" onClick={onBack}>
          Back to clients
        </button>
      </div>
    );
  }

  const risks = riskReasons(student);
  const milestones = milestonesFor(studentId);
  const hiring = hiringFor(studentId);
  const tasks = tasksFor(studentId);
  const onSubmitNote = async () => {
    if (!noteText.trim()) return;
    await addNote(studentId, noteText.trim());
    setNoteText('');
    toast('Note saved');
  };
  const onSubmitAction = async () => {
    if (!actionText.trim()) return;
    await addActionItem(studentId, actionText.trim());
    setActionText('');
    toast('Action item added');
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="btn-ghost -ml-2 !px-2 text-sm">
        <ArrowLeft className="h-4 w-4" /> Back to clients
      </button>

      {/* header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-ink-950">{student.name}</h1>
                <StageBadge stage={student.stage} />
                {risks.length > 0 && (
                  <span className="pill bg-rose-100 text-rose-700">
                    {risks.length} flag{risks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-col gap-1 text-sm text-ink-600">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ink-400" /> {student.email}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ink-400" /> {student.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" /> {student.location ?? 'No location'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center sm:text-right">
            <HeaderStat label="Coach" value={coach?.name ?? '—'} />
            <HeaderStat label="Started" value={formatDate(student.start_date)} />
            <HeaderStat
              label="Revenue goal"
              value={`${money(student.goal_revenue)}/mo`}
            />
          </div>
        </div>

        {risks.length > 0 && (
          <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
              Flagged — why
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {risks.map((r) => (
                <span key={r.key} className="pill bg-white text-rose-700">
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-ink-100 p-1">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={tab === 'onboarding'} onClick={() => setTab('onboarding')}>
          Onboarding
        </TabButton>
        <TabButton active={tab === 'roadmap'} onClick={() => setTab('roadmap')}>
          Roadmap
        </TabButton>
        <TabButton active={tab === 'form'} onClick={() => setTab('form')}>
          Onboarding form
        </TabButton>
        <TabButton active={tab === 'hiring'} onClick={() => setTab('hiring')}>
          REVhire
        </TabButton>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* action items */}
            <ProfileCard title="Action items" icon={<ClipboardList className="h-4 w-4" />} action={
              <button className="btn-outline !py-1.5 text-xs" onClick={() => document.getElementById('action-input')?.focus()}>
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            }>
              <div className="mb-3 flex gap-2">
                <input
                  id="action-input"
                  className="field"
                  placeholder="Add an action item…"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSubmitAction()}
                />
              </div>
              <ActionList studentId={studentId} />
            </ProfileCard>

            {/* homework */}
            <ProfileCard title="Homework" icon={<FileText className="h-4 w-4" />}>
              <HomeworkSection studentId={studentId} />
            </ProfileCard>

            {/* calls */}
            <ProfileCard title="Calls & recording history" icon={<CalendarDays className="h-4 w-4" />}>
              {sortedCalls.length === 0 ? (
                <p className="text-sm text-ink-500">No calls yet.</p>
              ) : (
                <div className="space-y-3">
                  {sortedCalls.map((call) => (
                    <div key={call.id} className="rounded-xl border border-ink-100 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink-900">
                          {formatDateTimeShort(call.scheduled_at)}
                        </p>
                        <CallStatusPill status={call.status} />
                      </div>
                      {call.summary ? (
                        <p className="mt-2 text-sm text-ink-600">{call.summary}</p>
                      ) : null}
                      {call.recording_url ? (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
                        >
                          Watch recording
                        </a>
                      ) : null}
                      {call.meeting_link ? (
                        <a
                          href={call.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-3 inline-block text-xs font-semibold text-ink-500 hover:underline"
                        >
                          Open meeting link
                        </a>
                      ) : null}
                      {call.raw_notes ? (
                        <details className="mt-2 rounded-xl border border-ink-100 bg-ink-50/70 p-3">
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[0.12em] text-ink-500">
                            View transcript
                          </summary>
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">{call.raw_notes}</p>
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </ProfileCard>
          </div>

          <div className="space-y-6">
            {/* private notes */}
            <ProfileCard title="Private coach notes" icon={<StickyNote className="h-4 w-4" />}>
              <div className="mb-3 flex flex-col gap-2">
                <textarea
                  className="field min-h-[72px] resize-y"
                  placeholder="Write a private note…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button className="btn-secondary self-end !py-1.5 text-xs" onClick={onSubmitNote}>
                  Save note
                </button>
              </div>
              <div className="space-y-2.5">
                {notesFor(studentId).map((n) => (
                  <div key={n.id} className="rounded-xl bg-amber-50 p-3">
                    <p className="text-sm text-ink-700">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-400">
                      {coachById(n.coach_id)?.name ?? 'Coach'} · {timeAgo(n.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </ProfileCard>

            {/* quick actions */}
            <ProfileCard title="Manage" icon={<Users className="h-4 w-4" />}>
              <div className="space-y-3">
                <label className="block">
                  <span className="label">Stage</span>
                  <select
                    className="field"
                    value={student.stage}
                    onChange={(e) => updateStudent(studentId, { stage: e.target.value as Stage })}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">Coach</span>
                  <select
                    className="field"
                    value={student.coach_id ?? ''}
                    onChange={(e) => updateStudent(studentId, { coach_id: e.target.value })}
                  >
                    {data.coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">30-day win</span>
                  <input
                    className="field"
                    value={student.thirty_day_win ?? ''}
                    onChange={(e) => updateStudent(studentId, { thirty_day_win: e.target.value })}
                  />
                </label>
              </div>
            </ProfileCard>

            {/* activity */}
            <ProfileCard title="Recent activity" icon={<Sparkles className="h-4 w-4" />}>
              <div className="space-y-2.5">
                {activityFor(studentId)
                  .slice(0, 6)
                  .map((a) => (
                    <div key={a.id} className="flex gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      <div>
                        <p className="text-sm text-ink-700">{a.message}</p>
                        <p className="text-xs text-ink-400">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </ProfileCard>
          </div>
        </div>
      )}

      {tab === 'onboarding' && (
        <OnboardingChecklist
          studentId={studentId}
          tasks={tasks}
          onToggle={toggleOnboardingTask}
        />
      )}

      {tab === 'roadmap' && (
        <RoadmapTab studentId={studentId} milestones={milestones} />
      )}

      {tab === 'form' && <FormTab studentId={studentId} />}

      {tab === 'hiring' && (
        <HiringTab
          studentId={studentId}
          items={hiring}
          onToggle={toggleHiringItem}
          onInit={ensureHiringItems}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
        active ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px]">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function ProfileCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-ink-400">{icon}</span>
          <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CallStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    booked: 'bg-brand-100 text-brand-700',
    completed: 'bg-emerald-100 text-emerald-700',
    missed: 'bg-rose-100 text-rose-700',
    cancelled: 'bg-ink-100 text-ink-500',
  };
  return <span className={`pill ${map[status] ?? 'bg-ink-100 text-ink-500'}`}>{status}</span>;
}

function ActionList({ studentId }: { studentId: string }) {
  const { actionsFor, toggleActionItem } = useData();
  const items = actionsFor(studentId).filter((a) => !a.done);
  if (items.length === 0) return <p className="text-sm text-ink-400">No open action items.</p>;
  return (
    <div className="space-y-1.5">
      {items.map((a) => (
        <button
          key={a.id}
          onClick={() => toggleActionItem(a)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ink-50"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink-300">
            {a.done && <Check className="h-3 w-3 text-ink-400" />}
          </span>
          <span className="flex-1 text-sm text-ink-800">{a.text}</span>
          {a.due_date && <span className="text-xs text-ink-400">{formatDate(a.due_date)}</span>}
        </button>
      ))}
    </div>
  );
}

function HomeworkSection({ studentId }: { studentId: string }) {
  const { homeworkFor, studentById, coachById } = useData();
  const items = homeworkFor(studentId);
  if (items.length === 0) return <p className="text-sm text-ink-400">No homework assigned yet.</p>;
  return (
    <div className="space-y-2.5">
      {items.map((h) => (
        <div key={h.id} className="rounded-xl border border-ink-100 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-ink-900">{h.title}</p>
            <HomeworkBadge status={h.status} />
          </div>
          {h.description && <p className="mt-1 text-sm text-ink-500">{h.description}</p>}
          <p className="mt-1.5 text-xs text-ink-400">Due {formatDate(h.due_date)}</p>
        </div>
      ))}
    </div>
  );
}

function OnboardingChecklist({
  studentId,
  tasks,
  onToggle,
}: {
  studentId: string;
  tasks: OnboardingTask[];
  onToggle: (task: OnboardingTask) => Promise<void>;
}) {
  return (
    <div className="card p-5">
      <h2 className="mb-1 text-base font-semibold text-ink-900">Onboarding checklist</h2>
      <p className="mb-4 text-sm text-ink-500">Track every step of bringing this student aboard.</p>
      <div className="space-y-2">
        {['agreement_signed', 'joined_skool', 'form_completed', 'call_booked', 'call_held'].map(
          (key) => {
            const task = tasks.find((t) => t.task_key === key);
            if (!task) return null;
            return (
              <button
                key={key}
                onClick={() => onToggle(task)}
                className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  task.done
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-ink-100 hover:bg-ink-50'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    task.done ? 'border-emerald-500 bg-emerald-500' : 'border-ink-300'
                  }`}
                >
                  {task.done && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className={`flex-1 text-sm font-medium ${task.done ? 'text-ink-500 line-through' : 'text-ink-800'}`}>
                  {task.label}
                </span>
                {task.done_at && <span className="text-xs text-ink-400">{formatDate(task.done_at)}</span>}
              </button>
            );
          },
        )}
      </div>
      <p className="mt-4 text-xs text-ink-400">
        {tasks.filter((t) => t.done).length} of {tasks.length || 5} complete
      </p>
    </div>
  );
}

function RoadmapTab({
  studentId,
  milestones,
}: {
  studentId: string;
  milestones: RoadmapMilestone[];
}) {
  const { roadmapFor, approveRoadmap } = useData();
  const { toast } = useToast();
  const roadmap = roadmapFor(studentId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RoadmapMilestone[]>([]);

  const startEditing = () => {
    if (milestones.length > 0) {
      setDraft(milestones.map((m) => ({ ...m })));
    } else {
      setDraft(
        Array.from({ length: 6 }, (_, i) => ({
          id: `new-${i}`,
          roadmap_id: '',
          position: i + 1,
          title: '',
          goal: '',
          homework: '',
          status: (i === 0 ? 'current' : 'upcoming') as RoadmapMilestone['status'],
        })),
      );
    }
    setEditing(true);
  };

  const updateDraft = (idx: number, patch: Partial<RoadmapMilestone>) => {
    setDraft((d) => d.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const save = async () => {
    const clean = draft.filter((m) => m.title.trim());
    await approveRoadmap(studentId, clean);
    setEditing(false);
    toast(roadmap?.approved ? 'Roadmap updated' : 'Roadmap approved and shared with the student');
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink-900">AI 6-meeting roadmap</h2>
          <p className="text-sm text-ink-500">
            {roadmap?.approved ? 'Approved — visible to the student' : 'Draft — hidden from the student until approved'}
          </p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={startEditing}>
            <Sparkles className="h-4 w-4" /> {roadmap?.approved ? 'Edit' : 'Build & approve'}
          </button>
        )}
      </div>

      {!editing ? (
        milestones.length === 0 ? (
          <div className="rounded-xl bg-brand-50 p-6 text-center">
            <p className="text-sm font-semibold text-ink-800">No roadmap yet</p>
            <p className="mt-1 text-sm text-ink-500">
              Build a 6-meeting path from their onboarding answers, then approve it to share.
            </p>
          </div>
        ) : (
          <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-ink-200">
            {milestones.map((m) => (
              <li key={m.id} className="relative pl-10">
                <span
                  className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    m.status === 'done'
                      ? 'bg-emerald-500 text-white'
                      : m.status === 'current'
                        ? 'bg-brand-600 text-white'
                        : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {m.status === 'done' ? <Check className="h-4 w-4" /> : m.position}
                </span>
                <div className="rounded-xl border border-ink-100 p-4">
                  <p className="text-sm font-semibold text-ink-900">
                    {m.position}. {m.title}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">{m.goal}</p>
                  <p className="mt-2 rounded-lg bg-ink-50 p-2.5 text-sm text-ink-700">
                    <span className="font-semibold">Homework: </span>
                    {m.homework}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )
      ) : (
        <div className="space-y-4">
          {draft.map((m, idx) => (
            <div key={m.id} className="rounded-xl border border-ink-100 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">
                Meeting {m.position}
              </p>
              <div className="space-y-2.5">
                <input
                  className="field"
                  placeholder="Meeting title (e.g. Lead engines: cold outreach)"
                  value={m.title}
                  onChange={(e) => updateDraft(idx, { title: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Goal for this stage"
                  value={m.goal ?? ''}
                  onChange={(e) => updateDraft(idx, { goal: e.target.value })}
                />
                <textarea
                  className="field min-h-[64px] resize-y"
                  placeholder="Homework for this stage"
                  value={m.homework ?? ''}
                  onChange={(e) => updateDraft(idx, { homework: e.target.value })}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save}>
              Approve & share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormTab({ studentId }: { studentId: string }) {
  const { formFor } = useData();
  const form = formFor(studentId);
  if (!form) {
    return (
      <div className="card p-5">
        <p className="text-sm text-ink-500">Onboarding form not submitted yet.</p>
      </div>
    );
  }
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-base font-semibold text-ink-900">Onboarding form</h2>
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {ONBOARDING_QUESTIONS.map((q) => {
          const value = (form as unknown as Record<string, unknown>)[q.key];
          return (
            <div key={q.key} className="border-b border-ink-100 pb-3">
              <dt className="text-xs font-medium text-ink-400">{q.label}</dt>
              <dd className="mt-1 text-sm text-ink-800">
                {value === null || value === undefined || value === '' ? '—' : String(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function HiringTab({
  studentId,
  items,
  onToggle,
  onInit,
}: {
  studentId: string;
  items: HiringItem[];
  onToggle: (item: HiringItem) => Promise<void>;
  onInit: (studentId: string) => Promise<void>;
}) {
  const { toast } = useToast();
  if (items.length === 0) {
    return (
      <div className="card p-5">
        <p className="mb-3 text-sm text-ink-500">Track hiring a video editor for this student.</p>
        <button
          className="btn-primary"
          onClick={async () => {
            await onInit(studentId);
            toast('Hiring tracker started');
          }}
        >
          <Briefcase className="h-4 w-4" /> Start hiring tracker
        </button>
      </div>
    );
  }
  return (
    <div className="card p-5">
      <h2 className="mb-1 text-base font-semibold text-ink-900">REVhire — editor hiring</h2>
      <p className="mb-4 text-sm text-ink-500">A simple checklist for staff an editor on this student.</p>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
              item.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-ink-100 hover:bg-ink-50'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                item.done ? 'border-emerald-500 bg-emerald-500' : 'border-ink-300'
              }`}
            >
              {item.done && <Check className="h-3 w-3 text-white" />}
            </span>
            <span className={`flex-1 text-sm font-medium ${item.done ? 'text-ink-500 line-through' : 'text-ink-800'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
