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
  locationsToExclude: z.array(z.string()).optional().describe("A list of location addresses (lat,lon strings) to exclude from the search results."),
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
    // This is a more direct and reliable approach. Instead of asking an LLM
    // to call the tool for us, we call the tool directly with the task title as the query.
    // This mirrors the logic in `suggest-locations` which is known to work.
    const toolResult = await findNearbyPlacesTool({ query: input.taskTitle, userLocation: input.userLocation });

    const filteredPlaces = toolResult.places?.filter(place => 
      !input.locationsToExclude?.includes(place.address)
    );

    // If the tool returns any places, we return the first one, which is the most relevant/closest.
    if (filteredPlaces && filteredPlaces.length > 0) {
      return filteredPlaces[0];
    }
    
    // If no places are found, return null.
    return null;
  }
);
