export type Role = 'coach' | 'student';

export interface Coach {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  headline: string | null;
  booking_enabled: boolean;
}

export interface CoachAvailability {
  id: string;
  coach_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
}

export interface BookingSettings {
  id: string;
  coach_id: string;
  timezone: string;
  duration_min: number;
  buffer_min: number;
  window_days: number;
}

export interface Student {
  id: string;
  coach_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  stage: Stage;
  start_date: string | null;
  location: string | null;
  current_revenue: number | null;
  goal_revenue: number | null;
  thirty_day_win: string | null;
}

export type Stage = 'Onboarding' | 'Active' | 'Offboarding' | 'Graduated' | 'Paused';
export const STAGES: Stage[] = ['Onboarding', 'Active', 'Offboarding', 'Graduated', 'Paused'];

export interface OnboardingTask {
  id: string;
  student_id: string;
  task_key: string;
  label: string;
  done: boolean;
  done_at: string | null;
}

export interface OnboardingForm {
  id: string;
  student_id: string;
  current_revenue: string | null;
  goal_revenue: string | null;
  avg_order_value: string | null;
  team_size: string | null;
  biggest_struggle: string | null;
  number_one_goal: string | null;
  services_offered: string | null;
  lead_source: string | null;
  first_break: string | null;
  quality_rating: number | null;
  website: string | null;
  booking_portal: string | null;
  instagram: string | null;
  tools: string | null;
  thirty_day_win: string | null;
  not_working: string | null;
  shipping_address: string | null;
  submitted_at: string | null;
}

export interface Roadmap {
  id: string;
  student_id: string;
  title: string | null;
  approved: boolean;
  approved_at: string | null;
}

export interface RoadmapMilestone {
  id: string;
  roadmap_id: string;
  position: number;
  title: string;
  goal: string | null;
  homework: string | null;
  status: 'done' | 'current' | 'upcoming';
}

export interface Call {
  id: string;
  student_id: string;
  coach_id: string | null;
  scheduled_at: string | null;
  duration_min: number | null;
  status: 'booked' | 'completed' | 'missed' | 'cancelled';
  meeting_link: string | null;
  recording_url: string | null;
  summary: string | null;
  topics: string[] | null;
  raw_notes: string | null;
}

export interface ActionItem {
  id: string;
  call_id: string | null;
  student_id: string;
  text: string;
  done: boolean;
  due_date: string | null;
}

export type HomeworkStatus = 'assigned' | 'submitted' | 'reviewed' | 'overdue';

export interface Homework {
  id: string;
  student_id: string;
  coach_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: HomeworkStatus;
  link: string | null;
  feedback: string | null;
  reviewed_at: string | null;
}

export interface HomeworkUpdate {
  id: string;
  homework_id: string;
  student_id: string;
  body: string | null;
  link: string | null;
  created_at: string | null;
}

export interface Note {
  id: string;
  student_id: string;
  coach_id: string | null;
  body: string;
  created_at: string | null;
}

export interface HiringItem {
  id: string;
  student_id: string;
  step_key: string;
  label: string;
  done: boolean;
  done_at: string | null;
}

export interface Activity {
  id: string;
  student_id: string;
  coach_id: string | null;
  type: string;
  message: string;
  created_at: string;
}
