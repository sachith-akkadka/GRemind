
'use server';

/**
 * @fileOverview This file contains a Genkit flow that suggests optimal times to reschedule missed tasks.
 *
 * - suggestRescheduleTime - A function that suggests an optimal reschedule time for a given task.
 * - SuggestRescheduleTimeInput - The input type for the suggestRescheduleTime function.
 * - SuggestRescheduleTimeOutput - The return type for the suggestRescheduleTime function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRescheduleTimeInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task to reschedule.'),
  originalDueDate: z.string().describe('The original due date and time of the task in ISO format.'),
  userSchedule: z.string().describe('The user schedule and typical task completion times.'),
});
export type SuggestRescheduleTimeInput = z.infer<typeof SuggestRescheduleTimeInputSchema>;

const SuggestRescheduleTimeOutputSchema = z.object({
  suggestedRescheduleTime: z.string().describe('The suggested reschedule time in ISO format.'),
  reasoning: z.string().describe('The reasoning behind the suggested reschedule time.'),
});
export type SuggestRescheduleTimeOutput = z.infer<typeof SuggestRescheduleTimeOutputSchema>;

export async function suggestRescheduleTime(
  input: SuggestRescheduleTimeInput
): Promise<SuggestRescheduleTimeOutput> {
  return suggestRescheduleTimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRescheduleTimePrompt',
  input: {schema: SuggestRescheduleTimeInputSchema},
  output: {schema: SuggestRescheduleTimeOutputSchema},
  prompt: `You are a time management expert. A user missed a task and wants to reschedule it.
  Based on the task title, original due date, and user's typical schedule, suggest an optimal time to reschedule the task.
  Provide the suggested reschedule time in ISO format and explain your reasoning.

  IMPORTANT: The suggested reschedule time MUST be in the future, AFTER the original due date.
  Current Date for context: ${new Date().toISOString()}

  Task Title: {{{taskTitle}}}
  Original Due Date: {{{originalDueDate}}}
  User Schedule: {{{userSchedule}}}

  Consider the user's schedule and suggest a time when they are most likely to complete the task.
  The suggested time should be within the next 24-48 hours.
  Format the suggested reschedule time in ISO format, such as 2024-01-01T10:00:00Z.
  `,
});

const suggestRescheduleTimeFlow = ai.defineFlow(
  {
    name: 'suggestRescheduleTimeFlow',
    inputSchema: SuggestRescheduleTimeInputSchema,
    outputSchema: SuggestRescheduleTimeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Add a fallback to ensure the date is in the future
    if (output && new Date(output.suggestedRescheduleTime) < new Date()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      output.suggestedRescheduleTime = tomorrow.toISOString();
      output.reasoning = "The initial suggestion was in the past, so I've suggested tomorrow morning as a safe default.";
    }
    return output!;
  }
);
