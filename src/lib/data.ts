import type { Task, Category } from './types';

export const categories: Category[] = [
  { id: 'cat1', name: 'Groceries' },
  { id: 'cat2', name: 'Work' },
  { id: 'cat3', name: 'Personal' },
  { id: 'cat4', name: 'Health' },
  { id: 'cat5', name: 'Home' },
];

export const tasks: Task[] = [
  {
    id: 'task1',
    title: 'Buy milk and eggs',
    status: 'pending',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
    category: 'Groceries',
    store: 'SuperMart',
    subtasks: [
      { id: 'sub1', title: '1 Gallon Whole Milk', completed: false },
      { id: 'sub2', title: 'Dozen large eggs', completed: false },
    ],
  },
  {
    id: 'task2',
    title: 'Finish project proposal',
    status: 'today',
    dueDate: new Date().toISOString(),
    category: 'Work',
  },
  {
    id: 'task3',
    title: 'Call the dentist',
    status: 'completed',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    completedAt: new Date().toISOString(),
    category: 'Health',
  },
  {
    id: 'task4',
    title: 'Schedule team meeting',
    status: 'today',
    dueDate: new Date().toISOString(),
    category: 'Work',
  },
  {
    id: 'task5',
    title: 'Pick up prescription',
    status: 'pending',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
    category: 'Health',
    store: 'Pharmacy',
  },
  {
    id: 'task6',
    title: 'Clean the garage',
    status: 'pending',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    category: 'Home',
  },
  {
    id: 'task7',
    title: 'Pay electricity bill',
    status: 'completed',
    dueDate: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
    completedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    category: 'Home',
  },
  {
    id: 'task8',
    title: 'Go for a 30-min run',
    status: 'today',
    dueDate: new Date().toISOString(),
    category: 'Personal'
  }
];
