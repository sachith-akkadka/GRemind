'use server';

/**
 * @fileOverview A Genkit flow that suggests a relevant location for a task.
 *
 * - suggestTaskLocation - A function that returns a single location suggestion for a task.
 * - SuggestTaskLocationInput - The input type for the suggestTaskLocation function.
 * - SuggestTaskLocationOutput - The return type for the suggestTaskLocation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskLocationInputSchema = z.object({
  taskTitle: z.string().describe("The title of the user's task."),
});
export type SuggestTaskLocationInput = z.infer<typeof SuggestTaskLocationInputSchema>;

const SuggestTaskLocationOutputSchema = z.object({
  suggestedLocation: z.string().describe('A single, relevant, real-world business name or landmark for the task. Example: "Home Depot" or "Walgreens".'),
});
export type SuggestTaskLocationOutput = z.infer<typeof SuggestTaskLocationOutputSchema>;

export async function suggestTaskLocation(
  input: SuggestTaskLocationInput
): Promise<SuggestTaskLocationOutput> {
  return suggestTaskLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskLocationPrompt',
  input: {schema: SuggestTaskLocationInputSchema},
  output: {schema: SuggestTaskLocationOutputSchema},
  prompt: `You are an expert at understanding tasks and suggesting relevant, real-world locations.
  Based on the task title, suggest a single, highly relevant business name or landmark where the user could complete the task.
  For example, if the task is "Return library books", you should suggest "Anytown Public Library".
  If the task is "Buy nails and a hammer", you should suggest "Home Depot" or "Lowe's".
  If the task is "Pick up prescription", you should suggest "CVS Pharmacy" or "Walgreens".
  If the task is "Get coffee", you should suggest "Starbucks" or "Peet's Coffee".

  Do not include a city or state. Just provide the name of the business or place. Be specific and realistic.

  Task Title: {{{taskTitle}}}
  `,
});

const suggestTaskLocationFlow = ai.defineFlow(
  {
    name: 'suggestTaskLocationFlow',
    inputSchema: SuggestTaskLocationInputSchema,
    outputSchema: SuggestTaskLocationOutputSchema,
  },
  async input => {
    // In a real app, you could use a tool here to call a Maps API and find the *nearest* relevant location.
    // For this prototype, we'll use an LLM to generate a plausible type of location.
    const {output} = await prompt(input);
    return output!;
  }
);
