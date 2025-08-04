'use server';

/**
 * @fileOverview AI-powered task category suggestion flow.
 *
 * This file defines a Genkit flow that suggests a category for a task based on
 * the task title and the user's past category choices.
 *
 * @exports {
 *   suggestTaskCategory: (input: SuggestTaskCategoryInput) => Promise<SuggestTaskCategoryOutput>;
 *   SuggestTaskCategoryInput: The input type for the suggestTaskCategory function.
 *   SuggestTaskCategoryOutput: The return type for the suggestTaskCategory function.
 * }
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTaskCategoryInputSchema = z.object({
  taskTitle: z.string().describe('The title of the task.'),
  pastCategories: z
    .array(z.string())
    .describe("The user's past task categories."),
});
export type SuggestTaskCategoryInput = z.infer<typeof SuggestTaskCategoryInputSchema>;

const SuggestTaskCategoryOutputSchema = z.object({
  suggestedCategory: z
    .string()
    .describe('The AI-suggested category for the task.'),
});
export type SuggestTaskCategoryOutput = z.infer<typeof SuggestTaskCategoryOutputSchema>;

export async function suggestTaskCategory(
  input: SuggestTaskCategoryInput
): Promise<SuggestTaskCategoryOutput> {
  return suggestTaskCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTaskCategoryPrompt',
  input: {schema: SuggestTaskCategoryInputSchema},
  output: {schema: SuggestTaskCategoryOutputSchema},
  prompt: `Based on the task title and the user's past category choices, suggest a category for the task.

Task Title: {{{taskTitle}}}
Past Categories: {{#each pastCategories}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Suggest a category:`,
});

const suggestTaskCategoryFlow = ai.defineFlow(
  {
    name: 'suggestTaskCategoryFlow',
    inputSchema: SuggestTaskCategoryInputSchema,
    outputSchema: SuggestTaskCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
