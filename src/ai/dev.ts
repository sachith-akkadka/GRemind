import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-reschedule-time.ts';
import '@/ai/flows/suggest-task-category.ts';
import '@/ai/flows/suggest-locations.ts';
import '@/ai/flows/suggest-task-title.ts';
import '@/ai/flows/suggest-task-location.ts';
