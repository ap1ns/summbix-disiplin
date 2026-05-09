export type Priority = 'low' | 'medium' | 'high';

export interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
  startDate: string; // Added to track when mission started
  deadline: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  goalId?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
}

export interface Habit {
  id: string;
  label: string;
  done?: boolean;
  completedDates?: string[]; // YYYY-MM-DD dates
  goalId?: string;
  startTime?: string;
  endTime?: string;
  date?: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: 'completed' | 'missed' | 'active' | 'upcoming';
  goalId?: string;
}

export interface FocusSession {
  id: string;
  date: string;
  duration: number; // in seconds
  goalId?: string;
  taskId?: string;
  habitId?: string;
  title?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'task' | 'goal' | 'habit' | 'system';
  createdAt?: string;
}

export interface Soundscape {
  id: string;
  name: string;
  url: string;
  type: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
}

export type AppView = 'dashboard' | 'schedule' | 'goals' | 'analytics' | 'history' | 'focus' | 'habits' | 'tasks' | 'profile';

export interface UserProfile {
  name: string;
  avatar: string;
  bio: string;
  email?: string;
  joinDate: string;
}

