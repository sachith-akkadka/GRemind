
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
    // Use a generative prompt to reason about the best tool to use.
    const llmResponse = await ai.generate({
      prompt: `You are a helpful assistant for a task management app. Your goal is to find the best real-world location for a user's task.

      Task Title: "${input.taskTitle}"
      User's Current Location: ${input.userLocation}
      
      Based on the task title, determine the most appropriate type of place to search for (e.g., for "Buy milk", search for "grocery store"; for "Get a haircut", search for "barber shop" or "salon"). Then, use the findNearbyPlacesTool to find the closest option.
      
      If you find a suitable place, output a JSON object with the details of the best place. If you cannot determine a place type or the tool returns no results, output null.`,
      tools: [findNearbyPlacesTool],
      model: 'googleai/gemini-2.0-flash',
      output: {
        schema: z.nullable(FindTaskLocationOutputSchema)
      }
    });

    const bestPlace = llmResponse.output();

    if (!bestPlace) {
      return null;
    }

    // Handle location exclusion
    if (input.locationsToExclude && input.locationsToExclude.includes(bestPlace.latlon)) {
        // This simple logic only excludes the top result.
        // A more robust implementation might re-run the search or check the next result.
        // For now, if the best place is excluded, we return null.
        return null; 
    }
    
    return bestPlace;
  }
);
