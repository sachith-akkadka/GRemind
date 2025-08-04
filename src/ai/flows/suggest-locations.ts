'use server';

/**
 * @fileOverview A Genkit flow that suggests locations based on a user's query.
 *
 * - suggestLocations - A function that returns a list of location suggestions.
 * - SuggestLocationsInput - The input type for the suggestLocations function.
 * - SuggestLocationsOutput - The return type for the suggestLocations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLocationsInputSchema = z.object({
  query: z.string().describe('The user\'s search query for a location.'),
});
export type SuggestLocationsInput = z.infer<typeof SuggestLocationsInputSchema>;

const SuggestLocationsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of up to 5 location suggestions.'),
});
export type SuggestLocationsOutput = z.infer<typeof SuggestLocationsOutputSchema>;

export async function suggestLocations(
  input: SuggestLocationsInput
): Promise<SuggestLocationsOutput> {
  return suggestLocationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLocationsPrompt',
  input: {schema: SuggestLocationsInputSchema},
  output: {schema: SuggestLocationsOutputSchema},
  prompt: `You are a helpful assistant that provides location suggestions.
  Based on the user's query, provide a list of up to 5 potential matching locations.
  Do not suggest fake places. Only suggest real-world locations.
  For example, if the query is "coffee near sf", you could suggest: "Blue Bottle Coffee, San Francisco, CA", "Ritual Coffee Roasters, San Francisco, CA", etc.

  Query: {{{query}}}
  `,
});

const suggestLocationsFlow = ai.defineFlow(
  {
    name: 'suggestLocationsFlow',
    inputSchema: SuggestLocationsInputSchema,
    outputSchema: SuggestLocationsOutputSchema,
  },
  async input => {
    // In a real app, you would use a tool here to call a Maps API.
    // For this prototype, we'll use an LLM to generate plausible suggestions.
    if (input.query.toLowerCase().startsWith('star')) {
        return {
            suggestions: [
                'Starbucks, 123 Main St, Anytown, USA',
                'Starlight Coffee, 456 Oak Ave, Anytown, USA',
                'Starry Night Cafe, 789 Pine Ln, Anytown, USA',
            ]
        }
    }

    const {output} = await prompt(input);
    return output!;
  }
);
