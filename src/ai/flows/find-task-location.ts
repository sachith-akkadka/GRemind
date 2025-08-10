
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
    tools: [findNearbyPlacesTool],
  },
  async (input) => {
    // Use a generative prompt to reason about the best tool to use.
    const llmResponse = await ai.generate({
      prompt: `You are a helpful assistant for a task management app. Your goal is to find the best real-world location for a user's task.

      Task Title: "${input.taskTitle}"
      User's Current Location: ${input.userLocation}
      
      Based on the task title, determine the most appropriate type of place to search for (e.g., for "Buy milk", search for "grocery store"; for "Get a haircut", search for "barber shop" or "salon"). Then, use the findNearbyPlacesTool to find the closest option.
      
      If you find a suitable place, respond with just the output of the tool. If you cannot determine a place type or the tool returns no results, say you could not find a location.`,
      tools: [findNearbyPlacesTool],
      model: 'googleai/gemini-2.0-flash'
    });

    const toolRequest = llmResponse.toolRequest();
    if (!toolRequest) {
      // LLM couldn't determine a tool to call.
      return null;
    }

    // Execute the tool call requested by the LLM.
    const toolResponse = await toolRequest.run();
    
    // If the tool returns places, return the first (closest) one.
    if (toolResponse?.places && toolResponse.places.length > 0) {
      const bestPlace = toolResponse.places[0];

      // Handle location exclusion
      if (input.locationsToExclude && input.locationsToExclude.includes(bestPlace.latlon)) {
        if (toolResponse.places.length > 1) {
          return toolResponse.places[1]; // Return the second best if the first is excluded
        }
        return null; // No other options available
      }
      return bestPlace;
    }
    
    // If the tool returns no places, return null.
    return null;
  }
);
