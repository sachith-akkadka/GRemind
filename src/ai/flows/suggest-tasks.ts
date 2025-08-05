'use server';

/**
 * @fileOverview Implements a flow to suggest tasks based on user input.
 *
 * - suggestTasks - A function that suggests tasks.
 * - SuggestTasksInput - The input type for the function.
 * - SuggestTasksOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestTasksInputSchema = z.object({
  query: z.string().describe("The user's partial task input."),
});

const SuggestTasksOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested task names.'),
});

export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const suggestTasksPrompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: { schema: SuggestTasksInputSchema },
  output: { schema: SuggestTasksOutputSchema },
  prompt: `You are a helpful assistant. Based on the user's input, suggest a few common tasks or errands that they might be trying to type. Provide up to 3 suggestions. Keep them short and actionable.

  User Input: {{{query}}}
  
  Return the suggestions as a JSON object with a "suggestions" array.
  `,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async (input) => {
    // If query is empty, return no suggestions.
    if (input.query.trim().length < 3) {
      return { suggestions: [] };
    }
    const { output } = await suggestTasksPrompt(input);
    return output!;
  }
);
