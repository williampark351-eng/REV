import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { newMeetingLink } from '@/lib/ai';
import type { CallDrafts } from '@/lib/ai';
import type {
  ActionItem,
  Activity,
  BookingSettings,
  Call,
  Coach,
  CoachAvailability,
  HiringItem,
  Homework,
  HomeworkUpdate,
  Note,
  OnboardingForm,
  OnboardingTask,
  Roadmap,
  RoadmapMilestone,
  Role,
  Stage,
  Student,
} from '@/lib/types';

const COACH_COLS = 'id,name,email,phone,headline,booking_enabled';
const STUDENT_COLS =
  'id,coach_id,name,email,phone,stage,start_date,location,current_revenue,goal_revenue,thirty_day_win';

export type CallPatch = Partial<
  Pick<Call, 'status' | 'meeting_link' | 'recording_url' | 'summary' | 'topics' | 'raw_notes' | 'duration_min'>
>;

export interface RiskReason {
  key: 'missed_call' | 'overdue_homework' | 'inactive' | 'no_call_booked';
  label: string;
}

export interface Session {
  role: Role;
  id: string;
}

interface DataState {
  loading: boolean;
  error: string | null;
  session: Session | null;
  coach: Coach | null;
  student: Student | null;
  coaches: Coach[];
  students: Student[];
  onboardingTasks: OnboardingTask[];
  onboardingForms: OnboardingForm[];
  roadmaps: Roadmap[];
  milestones: RoadmapMilestone[];
  calls: Call[];
  actionItems: ActionItem[];
  homework: Homework[];
  homeworkUpdates: HomeworkUpdate[];
  notes: Note[];
  hiringItems: HiringItem[];
  activity: Activity[];
  availability: CoachAvailability[];
  bookingSettings: BookingSettings[];
}

interface DataContextValue extends DataState {
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  refresh: () => Promise<void>;
  coachById: (id: string | null) => Coach | undefined;
  studentById: (id: string | null) => Student | undefined;
  tasksFor: (studentId: string) => OnboardingTask[];
  formFor: (studentId: string) => OnboardingForm | undefined;
  roadmapFor: (studentId: string) => Roadmap | undefined;
  milestonesFor: (studentId: string) => RoadmapMilestone[];
  callsFor: (studentId: string) => Call[];
  actionsFor: (studentId: string) => ActionItem[];
  homeworkFor: (studentId: string) => Homework[];
  notesFor: (studentId: string) => Note[];
  hiringFor: (studentId: string) => HiringItem[];
  activityFor: (studentId: string) => Activity[];
  availabilityFor: (coachId: string | null) => CoachAvailability[];
  settingsFor: (coachId: string | null) => BookingSettings | undefined;
  riskReasons: (student: Student) => RiskReason[];
  upcomingCall: (studentId: string) => Call | undefined;
  nextHomework: (studentId: string) => Homework | undefined;
  // mutations
  addStudent: (input: {
    name: string;
    email: string;
    phone: string;
    coach_id: string;
    start_date: string;
  }) => Promise<{ student_id: string; temp_password: string } | string>;
  toggleOnboardingTask: (task: OnboardingTask) => Promise<void>;
  saveOnboardingForm: (studentId: string, values: Partial<OnboardingForm>) => Promise<void>;
  toggleHiringItem: (item: HiringItem) => Promise<void>;
  addNote: (studentId: string, body: string) => Promise<void>;
  assignHomework: (input: {
    studentId: string;
    title: string;
    description: string;
    due_date: string;
    link?: string;
  }) => Promise<void>;
  submitHomework: (homeworkId: string, studentId: string, body: string, link: string) => Promise<void>;
  reviewHomework: (homeworkId: string, feedback: string) => Promise<void>;
  toggleActionItem: (item: ActionItem) => Promise<void>;
  approveRoadmap: (studentId: string, milestones: RoadmapMilestone[]) => Promise<void>;
  markCallCompleted: (callId: string, summary: string) => Promise<void>;
  bookCall: (input: { studentId: string; coachId: string; scheduledAt: string; durationMin: number }) => Promise<string | null>;
  saveAvailability: (input: Omit<CoachAvailability, 'id'> & { id?: string }) => Promise<void>;
  saveBookingSettings: (input: Omit<BookingSettings, 'id'> & { id?: string }) => Promise<void>;
  updateCall: (callId: string, patch: CallPatch) => Promise<void>;
  startCall: (studentId: string, coachId: string | null) => Promise<string>;
  applyCallDrafts: (call: Call, drafts: CallDrafts) => Promise<void>;
  updateStudent: (studentId: string, patch: Partial<Pick<Student, 'stage' | 'coach_id' | 'thirty_day_win' | 'location'>>) => Promise<void>;
  ensureHiringItems: (studentId: string) => Promise<void>;
  addActionItem: (studentId: string, text: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const HIRING_ORDER = ['job_posted', 'interviewing', 'test_edit', 'hired'];

function upsertLocal<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((r) => r.id === item.id);
  if (idx === -1) return [item, ...list];
  const next = [...list];
  next[idx] = item;
  return next;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    loading: true,
    error: null,
    session: null,
    coach: null,
    student: null,
    coaches: [],
    students: [],
    onboardingTasks: [],
    onboardingForms: [],
    roadmaps: [],
    milestones: [],
    calls: [],
    actionItems: [],
    homework: [],
    homeworkUpdates: [],
    notes: [],
    hiringItems: [],
    activity: [],
    availability: [],
    bookingSettings: [],
  });

  const loadAll = useCallback(async (): Promise<void> => {
    const [
      coachesRes,
      studentsRes,
      tasksRes,
      formsRes,
      roadmapsRes,
      milestonesRes,
      callsRes,
      actionsRes,
      homeworkRes,
      updatesRes,
      notesRes,
      hiringRes,
      activityRes,
      availabilityRes,
      bookingSettingsRes,
    ] = await Promise.all([
      supabase.from('coaches').select(COACH_COLS).order('name'),
      supabase.from('students').select(STUDENT_COLS).order('name'),
      supabase.from('onboarding_tasks').select('*'),
      supabase.from('onboarding_forms').select('*'),
      supabase.from('roadmaps').select('*'),
      supabase.from('roadmap_milestones').select('*').order('position'),
      supabase.from('calls').select('*').order('scheduled_at'),
      supabase.from('action_items').select('*').order('created_at'),
      supabase.from('homework').select('*').order('due_date'),
      supabase.from('homework_updates').select('*').order('created_at'),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('hiring_items').select('*'),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }),
      supabase.from('coach_availability').select('*').order('weekday').order('start_time'),
      supabase.from('booking_settings').select('*'),
    ]);

    if (coachesRes.error) throw coachesRes.error;

    setState((prev) => ({
      ...prev,
      loading: false,
      coaches: (coachesRes.data ?? []) as Coach[],
      students: (studentsRes.data ?? []) as Student[],
      onboardingTasks: (tasksRes.data ?? []) as OnboardingTask[],
      onboardingForms: (formsRes.data ?? []) as OnboardingForm[],
      roadmaps: (roadmapsRes.data ?? []) as Roadmap[],
      milestones: (milestonesRes.data ?? []) as RoadmapMilestone[],
      calls: (callsRes.data ?? []) as Call[],
      actionItems: (actionsRes.data ?? []) as ActionItem[],
      homework: (homeworkRes.data ?? []) as Homework[],
      homeworkUpdates: (updatesRes.data ?? []) as HomeworkUpdate[],
      notes: (notesRes.data ?? []) as Note[],
      hiringItems: (hiringRes.data ?? []) as HiringItem[],
      activity: (activityRes.data ?? []) as Activity[],
      availability: (availabilityRes.data ?? []) as CoachAvailability[],
      bookingSettings: (bookingSettingsRes.data ?? []) as BookingSettings[],
    }));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      loadAll().catch((err: unknown) => {
        setState((prev) => ({ ...prev, loading: false, error: (err as Error).message }));
      });
    }, 300);
    return () => clearTimeout(t);
  }, [loadAll]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      await loadAll();
      setState((prev) => ({ ...prev, error: null }));
    } catch (err) {
      setState((prev) => ({ ...prev, error: (err as Error).message }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [loadAll]);

  const login = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc('login', { p_email: email, p_password: password });
      if (error) return error.message;
      const row = (data as { user_id: string; role: Role }[] | null)?.[0];
      if (!row) return 'Incorrect email or password.';
      await loadAll();
      setState((prev) => {
        const coach = row.role === 'coach' ? (prev.coaches.find((c) => c.id === row.user_id) ?? null) : null;
        const student =
          row.role === 'student' ? (prev.students.find((s) => s.id === row.user_id) ?? null) : null;
        return { ...prev, session: { role: row.role, id: row.user_id }, coach, student };
      });
      return null;
    },
    [loadAll],
  );

  const logout = useCallback(() => {
    setState((prev) => ({ ...prev, session: null, coach: null, student: null }));
  }, []);

  const coachById = useCallback(
    (id: string | null) => state.coaches.find((c) => c.id === id),
    [state.coaches],
  );
  const studentById = useCallback(
    (id: string | null) => state.students.find((s) => s.id === id),
    [state.students],
  );
  const tasksFor = useCallback(
    (studentId: string) => state.onboardingTasks.filter((t) => t.student_id === studentId),
    [state.onboardingTasks],
  );
  const formFor = useCallback(
    (studentId: string) => state.onboardingForms.find((f) => f.student_id === studentId),
    [state.onboardingForms],
  );
  const roadmapFor = useCallback(
    (studentId: string) => state.roadmaps.find((r) => r.student_id === studentId),
    [state.roadmaps],
  );
  const milestonesFor = useCallback(
    (studentId: string) => {
      const roadmap = state.roadmaps.find((r) => r.student_id === studentId);
      if (!roadmap) return [];
      return state.milestones.filter((m) => m.roadmap_id === roadmap.id);
    },
    [state.roadmaps, state.milestones],
  );
  const callsFor = useCallback(
    (studentId: string) => state.calls.filter((c) => c.student_id === studentId),
    [state.calls],
  );
  const actionsFor = useCallback(
    (studentId: string) => state.actionItems.filter((a) => a.student_id === studentId),
    [state.actionItems],
  );
  const homeworkFor = useCallback(
    (studentId: string) => state.homework.filter((h) => h.student_id === studentId),
    [state.homework],
  );
  const notesFor = useCallback(
    (studentId: string) => state.notes.filter((n) => n.student_id === studentId),
    [state.notes],
  );
  const hiringFor = useCallback(
    (studentId: string) =>
      state.hiringItems
        .filter((h) => h.student_id === studentId)
        .sort((a, b) => HIRING_ORDER.indexOf(a.step_key) - HIRING_ORDER.indexOf(b.step_key)),
    [state.hiringItems],
  );
  const activityFor = useCallback(
    (studentId: string) => state.activity.filter((a) => a.student_id === studentId),
    [state.activity],
  );

  const availabilityFor = useCallback(
    (coachId: string | null) => state.availability.filter((row) => row.coach_id === coachId && row.active),
    [state.availability],
  );
  const settingsFor = useCallback(
    (coachId: string | null) => state.bookingSettings.find((settings) => settings.coach_id === coachId),
    [state.bookingSettings],
  );

  const riskReasons = useCallback(
    (student: Student): RiskReason[] => {
      const reasons: RiskReason[] = [];
      const calls = state.calls.filter((c) => c.student_id === student.id);
      if (calls.some((c) => c.status === 'missed')) {
        reasons.push({ key: 'missed_call', label: 'Missed a call' });
      }
      const homework = state.homework.filter((h) => h.student_id === student.id);
      if (homework.some((h) => h.status === 'overdue')) {
        reasons.push({ key: 'overdue_homework', label: 'Overdue homework' });
      }
      if (homework.some((h) => h.status === 'submitted')) {
        reasons.push({ key: 'overdue_homework', label: 'Homework needs review' });
      }
      const hasUpcoming = calls.some(
        (c) => c.status === 'booked' && isFuture(c.scheduled_at),
      );
      if (!hasUpcoming && student.stage !== 'Graduated' && student.stage !== 'Offboarding') {
        reasons.push({ key: 'no_call_booked', label: 'No upcoming call booked' });
      }
      const acts = state.activity
        .filter((a) => a.student_id === student.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (acts.length === 0) {
        if (student.start_date && daysSince(student.start_date) >= 10) {
          reasons.push({ key: 'inactive', label: 'No activity in 10+ days' });
        }
      } else if (daysSince(acts[0].created_at) >= 10) {
        reasons.push({ key: 'inactive', label: 'No activity in 10+ days' });
      }
      return reasons;
    },
    [state.calls, state.homework, state.activity],
  );

  const upcomingCall = useCallback(
    (studentId: string) =>
      state.calls
        .filter((c) => c.student_id === studentId && c.status === 'booked' && isFuture(c.scheduled_at))
        .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))[0],
    [state.calls],
  );

  const nextHomework = useCallback(
    (studentId: string) =>
      state.homework
        .filter((h) => h.student_id === studentId && h.status !== 'reviewed')
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0],
    [state.homework],
  );

  // ---- mutations ----

  const addStudent = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      coach_id: string;
      start_date: string;
    }): Promise<{ student_id: string; temp_password: string } | string> => {
      const { data, error } = await supabase.rpc('create_student', {
        p_name: input.name,
        p_email: input.email,
        p_phone: input.phone,
        p_coach_id: input.coach_id,
        p_start_date: input.start_date,
      });
      if (error) return error.message;
      await loadAll();
      return (data as { student_id: string; temp_password: string }[] | null)?.[0] ?? 'Something went wrong.';
    },
    [loadAll],
  );

  const toggleOnboardingTask = useCallback(
    async (task: OnboardingTask) => {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({ done: !task.done, done_at: !task.done ? new Date().toISOString() : null })
        .eq('id', task.id);
      if (error) return;
      logActivity(task.student_id, !task.done ? 'task_completed' : 'task_reopened', `Onboarding: ${task.label}`);
      await loadAll();
    },
    [loadAll],
  );

  const saveOnboardingForm = useCallback(
    async (studentId: string, values: Partial<OnboardingForm>) => {
      const payload = { ...values, student_id: studentId, submitted_at: new Date().toISOString() };
      const existing = state.onboardingForms.find((f) => f.student_id === studentId);
      let error;
      if (existing) {
        ({ error } = await supabase.from('onboarding_forms').update(payload).eq('student_id', studentId));
      } else {
        ({ error } = await supabase.from('onboarding_forms').insert(payload));
      }
      if (error) return;
      const task = state.onboardingTasks.find(
        (t) => t.student_id === studentId && t.task_key === 'form_completed',
      );
      if (task && !task.done) {
        await supabase
          .from('onboarding_tasks')
          .update({ done: true, done_at: new Date().toISOString() })
          .eq('id', task.id);
      }
      await loadAll();
    },
    [state.onboardingForms, state.onboardingTasks, loadAll],
  );

  const toggleHiringItem = useCallback(
    async (item: HiringItem) => {
      const { error } = await supabase
        .from('hiring_items')
        .update({ done: !item.done, done_at: !item.done ? new Date().toISOString() : null })
        .eq('id', item.id);
      if (error) return;
      await loadAll();
    },
    [loadAll],
  );

  const addNote = useCallback(
    async (studentId: string, body: string) => {
      const { error } = await supabase
        .from('notes')
        .insert({ student_id: studentId, coach_id: state.coach?.id ?? null, body });
      if (error) return;
      setState((prev) => ({
        ...prev,
        notes: [
          {
            id: `tmp-${Date.now()}`,
            student_id: studentId,
            coach_id: state.coach?.id ?? null,
            body,
            created_at: new Date().toISOString(),
          },
          ...prev.notes,
        ],
      }));
    },
    [state.coach],
  );

  const assignHomework = useCallback(
    async (input: { studentId: string; title: string; description: string; due_date: string; link?: string }) => {
      const { error } = await supabase.from('homework').insert({
        student_id: input.studentId,
        coach_id: state.coach?.id ?? null,
        title: input.title,
        description: input.description,
        due_date: input.due_date,
        link: input.link || null,
        status: 'assigned',
      });
      if (error) return;
      logActivity(input.studentId, 'homework_assigned', `New homework: "${input.title}"`);
      await loadAll();
    },
    [state.coach, loadAll],
  );

  const submitHomework = useCallback(
    async (homeworkId: string, studentId: string, body: string, link: string) => {
      const { error } = await supabase.from('homework_updates').insert({
        homework_id: homeworkId,
        student_id: studentId,
        body: body || null,
        link: link || null,
      });
      if (error) return;
      await supabase.from('homework').update({ status: 'submitted' }).eq('id', homeworkId);
      logActivity(studentId, 'homework_submitted', 'Submitted a homework update');
      await loadAll();
    },
    [loadAll],
  );

  const reviewHomework = useCallback(
    async (homeworkId: string, feedback: string) => {
      const { error } = await supabase
        .from('homework')
        .update({ status: 'reviewed', feedback: feedback || null, reviewed_at: new Date().toISOString() })
        .eq('id', homeworkId);
      if (error) return;
      await loadAll();
    },
    [loadAll],
  );

  const toggleActionItem = useCallback(
    async (item: ActionItem) => {
      const { error } = await supabase.from('action_items').update({ done: !item.done }).eq('id', item.id);
      if (error) return;
      setState((prev) => ({
        ...prev,
        actionItems: upsertLocal(prev.actionItems, { ...item, done: !item.done }),
      }));
    },
    [],
  );

  const approveRoadmap = useCallback(
    async (studentId: string, milestones: RoadmapMilestone[]) => {
      const existing = state.roadmaps.find((r) => r.student_id === studentId);
      let roadmapId = existing?.id;
      if (existing) {
        await supabase.from('roadmaps').update({ approved: true, approved_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        const { data } = await supabase
          .from('roadmaps')
          .insert({ student_id: studentId, title: '6-Month Roadmap', approved: true, approved_at: new Date().toISOString() })
          .select('id')
          .single();
        roadmapId = (data as Roadmap | null)?.id;
      }
      if (!roadmapId) return;
      await supabase.from('roadmap_milestones').delete().eq('roadmap_id', roadmapId);
      await supabase.from('roadmap_milestones').insert(
        milestones.map((m) => ({
          roadmap_id: roadmapId,
          position: m.position,
          title: m.title,
          goal: m.goal,
          homework: m.homework,
          status: m.status,
        })),
      );
      logActivity(studentId, 'roadmap_approved', 'Your 6-meeting roadmap was approved');
      await loadAll();
    },
    [state.roadmaps, loadAll],
  );

  const markCallCompleted = useCallback(
    async (callId: string, summary: string) => {
      const { error } = await supabase
        .from('calls')
        .update({ status: 'completed', summary: summary || null })
        .eq('id', callId);
      if (error) return;
      await loadAll();
    },
    [loadAll],
  );

  const bookCall = useCallback(
    async (input: { studentId: string; coachId: string; scheduledAt: string; durationMin: number }): Promise<string | null> => {
      const { error } = await supabase.from('calls').insert({
        student_id: input.studentId,
        coach_id: input.coachId,
        scheduled_at: input.scheduledAt,
        duration_min: input.durationMin,
        status: 'booked',
        meeting_link: newMeetingLink(),
      });
      if (error) return 'That time was just booked. Choose another slot.';
      await loadAll();
      return null;
    },
    [loadAll],
  );

  const saveAvailability = useCallback(
    async (input: Omit<CoachAvailability, 'id'> & { id?: string }) => {
      const payload = { coach_id: input.coach_id, weekday: input.weekday, start_time: input.start_time, end_time: input.end_time, active: input.active };
      const result = input.id
        ? await supabase.from('coach_availability').update(payload).eq('id', input.id)
        : await supabase.from('coach_availability').insert(payload);
      if (result.error) throw new Error('Could not save availability');
      await loadAll();
    },
    [loadAll],
  );

  const saveBookingSettings = useCallback(
    async (input: Omit<BookingSettings, 'id'> & { id?: string }) => {
      const payload = { coach_id: input.coach_id, timezone: input.timezone, duration_min: input.duration_min, buffer_min: input.buffer_min, window_days: input.window_days };
      const result = input.id
        ? await supabase.from('booking_settings').update(payload).eq('id', input.id)
        : await supabase.from('booking_settings').insert(payload);
      if (result.error) throw new Error('Could not save booking settings');
      await loadAll();
    },
    [loadAll],
  );

  const updateCall = useCallback(
    async (callId: string, patch: CallPatch) => {
      const { error } = await supabase.from('calls').update(patch).eq('id', callId);
      if (error) throw new Error('Could not save the call');
      await loadAll();
    },
    [loadAll],
  );

  const startCall = useCallback(
    async (studentId: string, coachId: string | null): Promise<string> => {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          student_id: studentId,
          coach_id: coachId,
          scheduled_at: new Date().toISOString(),
          duration_min: 60,
          status: 'booked',
          meeting_link: newMeetingLink(),
        })
        .select('id')
        .maybeSingle();
      if (error || !data) throw new Error('Could not start a new call');
      await loadAll();
      return (data as { id: string }).id;
    },
    [loadAll],
  );

  const applyCallDrafts = useCallback(
    async (call: Call, drafts: CallDrafts) => {
      const callUpdate = await supabase
        .from('calls')
        .update({ summary: drafts.summary || null, topics: drafts.topics.length ? drafts.topics : null })
        .eq('id', call.id);
      if (callUpdate.error) throw new Error('Could not save the summary');
      if (drafts.action_items.length) {
        const { error } = await supabase
          .from('action_items')
          .insert(drafts.action_items.map((text) => ({ student_id: call.student_id, call_id: call.id, text })));
        if (error) throw new Error('Could not save the action items');
      }
      if (drafts.homework.length) {
        const { error } = await supabase.from('homework').insert(
          drafts.homework.map((h) => ({
            student_id: call.student_id,
            coach_id: call.coach_id,
            title: h.title,
            description: h.description || null,
            due_date: new Date(Date.now() + h.due_in_days * 86400000).toISOString().slice(0, 10),
            status: 'assigned',
          })),
        );
        if (error) throw new Error('Could not assign the homework');
      }
      logActivity(call.student_id, 'call_notes', 'New call notes and next steps were added');
      await loadAll();
    },
    [loadAll],
  );

  const updateStudent = useCallback(
    async (
      studentId: string,
      patch: Partial<Pick<Student, 'stage' | 'coach_id' | 'thirty_day_win' | 'location'>>,
    ) => {
      const { error } = await supabase.from('students').update(patch).eq('id', studentId);
      if (error) return;
      const student = state.students.find((s) => s.id === studentId);
      if (student && patch.stage && patch.stage !== student.stage) {
        logActivity(studentId, 'stage_changed', `Moved to ${patch.stage}`);
      }
      await loadAll();
    },
    [state.students, loadAll],
  );

  const ensureHiringItems = useCallback(
    async (studentId: string) => {
      const existing = state.hiringItems.filter((h) => h.student_id === studentId);
      if (existing.length > 0) return;
      const steps = [
        { step_key: 'job_posted', label: 'Job posted' },
        { step_key: 'interviewing', label: 'Interviewing' },
        { step_key: 'test_edit', label: 'Test edit' },
        { step_key: 'hired', label: 'Hired' },
      ];
      await supabase.from('hiring_items').insert(
        steps.map((s) => ({ student_id: studentId, ...s })),
      );
      await loadAll();
    },
    [state.hiringItems, loadAll],
  );

  const addActionItem = useCallback(
    async (studentId: string, text: string) => {
      const { error } = await supabase
        .from('action_items')
        .insert({ student_id: studentId, text });
      if (error) return;
      logActivity(studentId, 'action_item_added', `New action item: "${text}"`);
      await loadAll();
    },
    [loadAll],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      ...state,
      login,
      logout,
      refresh,
      coachById,
      studentById,
      tasksFor,
      formFor,
      roadmapFor,
      milestonesFor,
      callsFor,
      actionsFor,
      homeworkFor,
      notesFor,
      hiringFor,
      activityFor,
      availabilityFor,
      settingsFor,
      riskReasons,
      upcomingCall,
      nextHomework,
      addStudent,
      toggleOnboardingTask,
      saveOnboardingForm,
      toggleHiringItem,
      addNote,
      assignHomework,
      submitHomework,
      reviewHomework,
      toggleActionItem,
      approveRoadmap,
      markCallCompleted,
      bookCall,
      saveAvailability,
      saveBookingSettings,
      updateCall,
      startCall,
      applyCallDrafts,
      updateStudent,
      ensureHiringItems,
      addActionItem,
    }),
    [
      state,
      login,
      logout,
      refresh,
      coachById,
      studentById,
      tasksFor,
      formFor,
      roadmapFor,
      milestonesFor,
      callsFor,
      actionsFor,
      homeworkFor,
      notesFor,
      hiringFor,
      activityFor,
      availabilityFor,
      settingsFor,
      riskReasons,
      upcomingCall,
      nextHomework,
      addStudent,
      toggleOnboardingTask,
      saveOnboardingForm,
      toggleHiringItem,
      addNote,
      assignHomework,
      submitHomework,
      reviewHomework,
      toggleActionItem,
      approveRoadmap,
      markCallCompleted,
      bookCall,
      saveAvailability,
      saveBookingSettings,
      updateCall,
      startCall,
      applyCallDrafts,
      updateStudent,
      ensureHiringItems,
      addActionItem,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function isFuture(date: string | null): boolean {
  if (!date) return false;
  return new Date(date).getTime() > Date.now();
}

function daysSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

async function logActivity(studentId: string, type: string, message: string) {
  await supabase.from('activity_log').insert({ student_id: studentId, type, message });
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
