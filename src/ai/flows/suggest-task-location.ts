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
import { findNearbyPlacesTool } from '../tools/location-tools';

const SuggestTaskLocationInputSchema = z.object({
  taskTitle: z.string().describe("The title of the user's task."),
});
export type SuggestTaskLocationInput = z.infer<typeof SuggestTaskLocationInputSchema>;

const SuggestTaskLocationOutputSchema = z.object({
  suggestedLocation: z.string().describe('A single, relevant, real-world business name and its address for the task. Example: "Home Depot, 123 Main St, Anytown".'),
});
export type SuggestTaskLocationOutput = z.infer<typeof SuggestTaskLocationOutputSchema>;

export async function suggestTaskLocation(
  input: SuggestTaskLocationInput
): Promise<SuggestTaskLocationOutput> {
  return suggestTaskLocationFlow(input);
}

const suggestTaskLocationFlow = ai.defineFlow(
  {
    name: 'suggestTaskLocationFlow',
    inputSchema: SuggestTaskLocationInputSchema,
    outputSchema: SuggestTaskLocationOutputSchema,
    tools: [findNearbyPlacesTool],
  },
  async (input) => {
    const prompt = `You are an expert at understanding tasks and suggesting relevant, real-world locations.
      Based on the task title "${input.taskTitle}", determine the type of place the user might need to go (e.g., "hardware store", "coffee shop", "library").
      Then, use the findNearbyPlacesTool to find a specific, relevant business or landmark. The user's location is "Mountain View, CA".
      From the tool's output, select the TOP suggestion and return its name and address as the suggestedLocation.
      For example, if the task is "Return library books", you should suggest a specific library address.
      If the task is "Buy nails and a hammer", you should suggest a specific hardware store.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      tools: [findNearbyPlacesTool],
      model: 'googleai/gemini-2.0-flash'
    });

    if (!output || !output.toolRequests?.length) {
      // If the model doesn't use the tool, fall back to a simple suggestion
      return { suggestedLocation: 'Could not determine a specific location.' };
    }

    // Execute the tool call
    const toolRequest = output.toolRequests[0];
    const toolResult = await toolRequest.executor(toolRequest.input);

    if (toolResult.places && toolResult.places.length > 0) {
      const bestPlace = toolResult.places[0];
      return { suggestedLocation: `${bestPlace.name}, ${bestPlace.address}` };
    }

    return { suggestedLocation: 'No specific locations found.' };
  }
);
