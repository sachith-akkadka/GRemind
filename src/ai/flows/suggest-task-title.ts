'use server';

/**
 * @fileOverview AI-powered task title suggestion flow.
 * This file defines a Genkit flow that suggests a common task title.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskTitleInputSchema = z.object({});
export type SuggestTaskTitleInput = z.infer<typeof SuggestTaskTitleInputSchema>;

const SuggestTaskTitleOutputSchema = z.object({
  suggestedTitle: z.string().describe('The AI-suggested title for the task.'),
});
export type SuggestTaskTitleOutput = z.infer<typeof SuggestTaskTitleOutputSchema>;

export async function suggestTaskTitle(
  input: SuggestTaskTitleInput
): Promise<SuggestTaskTitleOutput> {
  return suggestTaskTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskTitlePrompt',
  input: {schema: SuggestTaskTitleInputSchema},
  output: {schema: SuggestTaskTitleOutputSchema},
  prompt: `You are an assistant that helps users create tasks. Suggest a single, common, and actionable task title. The suggestion should be something a user is likely to do. Examples: "Pick up dry cleaning", "Return library books", "Buy milk and eggs", "Schedule dentist appointment". Provide only one suggestion.`,
});

const suggestTaskTitleFlow = ai.defineFlow(
  {
    name: 'suggestTaskTitleFlow',
    inputSchema: SuggestTaskTitleInputSchema,
    outputSchema: SuggestTaskTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
