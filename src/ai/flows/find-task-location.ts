
'use server';

/**
 * @fileOverview Implements a flow to find a single, best-guess location for a given task.
 *
 * - findTaskLocation - A function that suggests a single location for a task.
 * - FindTaskLocationInput - The input type for the function.
 * - FindTaskLocationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { findNearbyPlacesTool } from '../tools/location-tools';


const FindTaskLocationInputSchema = z.object({
  taskTitle: z.string().describe("The title of the task, e.g., 'Buy groceries'."),
  userLocation: z.string().describe("The user's current location as a latitude,longitude pair."),
  locationsToExclude: z.array(z.string()).optional().describe("A list of location latlon strings to exclude from the search results."),
});

export type FindTaskLocationInput = z.infer<typeof FindTaskLocationInputSchema>;

const FindTaskLocationOutputSchema = z.object({
    name: z.string(),
    address: z.string(),
    latlon: z.string(),
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
    // Directly call the robust tool to find places.
    const toolResult = await findNearbyPlacesTool({ query: input.taskTitle, userLocation: input.userLocation });
    
    // If the tool returns places, return the first (closest) one.
    if (toolResult.places && toolResult.places.length > 0) {
      const bestPlace = toolResult.places[0];
      // Exclude locations if they are in the exclusion list
      if (input.locationsToExclude && input.locationsToExclude.includes(bestPlace.latlon)) {
        // Return the second best if the first is excluded
        if (toolResult.places.length > 1) {
          return toolResult.places[1];
        }
        return null;
      }
      return bestPlace;
    }
    
    // If the tool returns no places, return null.
    return null;
  }
);
