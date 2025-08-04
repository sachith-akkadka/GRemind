export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'today' | 'completed' | 'missed';
  dueDate: string;
  completedAt?: string;
  category: string;
  store?: string;
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly';
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}
