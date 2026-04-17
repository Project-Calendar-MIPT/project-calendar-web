export type ExperienceLevel = 'junior' | 'middle' | 'senior';

export interface StackItem {
  name: string;
  experience_level: ExperienceLevel;
}

export interface User {
  id: string;
  username: string;
  email: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  timezone: string;
  telegram?: string;
  phone?: string;
  contacts_visible: boolean;
  stack?: StackItem[];
  experience_level?: ExperienceLevel;
  skills?: string[];
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  timezone: string;
  telegram?: string;
  phone?: string;
  contacts_visible: boolean;
  stack: StackItem[];
  experience_level: ExperienceLevel;
  work_schedule: WorkScheduleDay[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface WorkScheduleDay {
  day_of_week: number;
  is_working_day: boolean;
  start_time?: string;
  end_time?: string;
}

export interface Task {
  id: string;
  parent_task_id: string | null;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';

  complexity?: 'low' | 'medium' | 'high';
  novelty?: 'low' | 'medium' | 'high';
  required_skills?: string[];

  is_public?: boolean;

  start_date: string;
  end_date: string;
  duration_days?: number;
  estimated_hours?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Assignment {
  id: string;
  task_id: string;
  user_id: string;
  role: 'owner' | 'supervisor' | 'executor' | 'hybrid' | 'spectator';
  allocated_hours: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
}

export interface TasksQueryParams {
  parent_task_id?: string | null;
  status?: string;
  priority?: string;
}

export interface AssignmentData {
  user_id: string;
  role: 'owner' | 'supervisor' | 'executor' | 'hybrid' | 'spectator';
  allocated_hours?: number;
}
