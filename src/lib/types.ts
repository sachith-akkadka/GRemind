
import type { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'today' | 'completed' | 'missed';
  dueDate: string; // Storing as ISO string
  completedAt?: string; // Storing as ISO string
  category: string;
  store?: string;
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly';
  userId: string;
}

export interface FirestoreTask {
  title: string;
  description?: string;
  status: 'pending' | 'today' | 'completed' | 'missed';
  dueDate: Timestamp;
  completedAt?: Timestamp;
  category: string;
  store?: string;
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly';
  userId: string;
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
