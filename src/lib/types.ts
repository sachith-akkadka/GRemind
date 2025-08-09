
import type { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'today' | 'completed' | 'missed' | 'tomorrow';
  dueDate: string; // Storing as ISO string
  completedAt?: string; // Storing as ISO string
  category: string;
  store?: string; // This will store the lat,lon string
  storeName?: string; // This will store the readable name of the location
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly';
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface FirestoreTask {
  title: string;
  description?: string;
  status: 'pending' | 'today' | 'completed' | 'missed' | 'tomorrow';
  dueDate: Timestamp;
  completedAt?: Timestamp;
  category: string;
  store?: string;
  storeName?: string;
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly';
  userId: string;
  priority?: 'low' | 'medium' | 'high';
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
}
