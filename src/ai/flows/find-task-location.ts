'use server';

/**
 * @fileOverview Implements a flow to find a single, best-guess location for a given task.
 *
 * - findTaskLocation - A function that suggests a single location for a task.
 * - FindTaskLocationInput - The input type for the function.
 * - FindTaskLocationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findNearbyPlacesTool } from '../tools/location-tools';


const FindTaskLocationInputSchema = z.object({
  taskTitle: z.string().describe("The title of the task, e.g., 'Buy groceries'."),
  userLocation: z.string().describe("The user's current location as a string, e.g., 'Mountain View, CA' or a latitude,longitude pair."),
});

export type FindTaskLocationInput = z.infer<typeof FindTaskLocationInputSchema>;

const FindTaskLocationOutputSchema = z.object({
    name: z.string(),
    address: z.string(),
    eta: z.string(),
}).describe('The single best suggested location for the task.');

export type FindTaskLocationOutput = z.infer<typeof FindTaskLocationOutputSchema>;

export async function findTaskLocation(input: FindTaskLocationInput): Promise<FindTaskLocationOutput | null> {
  return findTaskLocationFlow(input);
}

const findTaskLocationFlow = ai.defineFlow(
  {
    name: 'findTaskLocationFlow',
    inputSchema: FindTaskLocationInputSchema,
    outputSchema: z.nullable(FindTaskLocationOutputSchema),
  },
  async (input) => {
    
    const { output } = await ai.generate({
        prompt: `Based on the user's task "${input.taskTitle}", find the single most relevant nearby place. The user's current location is "${input.userLocation}". You MUST provide this to the tool.`,
        tools: [findNearbyPlacesTool],
        model: 'googleai/gemini-2.0-flash'
     });

    if (!output || !output.toolRequests || output.toolRequests.length === 0) {
        return null;
    }

    // Since the prompt asks the LLM to call the tool for us, we can get the result from the tool call it made.
    const toolRequest = output.toolRequests[0];
    const toolResult = await toolRequest.executor(toolRequest.input);

    if (toolResult.places && toolResult.places.length > 0) {
      // Return only the first, most relevant result
      return toolResult.places[0];
    }
    
    return null;
  }
);
