'use server';
/**
 * @fileOverview Implements a flow to re-optimize a route from the user's current location.
 *
 * - reroute - A function that re-optimizes the route.
 * - RerouteInput - The input type for the function.
 * - RerouteOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const RerouteInputSchema = z.object({
  userLocation: z.string().describe("The user's current location as a latitude,longitude pair."),
  destinations: z.array(z.string()).describe("An array of the destination latlon strings that need to be visited."),
});
export type RerouteInput = z.infer<typeof RerouteInputSchema>;

export const RerouteOutputSchema = z.object({
  optimizedRoute: z.array(z.string()).describe("The optimized list of stops. The last item is the final destination, and the rest are waypoints."),
});
export type RerouteOutput = z.infer<typeof RerouteOutputSchema>;

export async function reroute(input: RerouteInput): Promise<RerouteOutput> {
  return rerouteFlow(input);
}

const rerouteFlow = ai.defineFlow(
  {
    name: 'rerouteFlow',
    inputSchema: RerouteInputSchema,
    outputSchema: RerouteOutputSchema,
  },
  async (input) => {
    if (input.destinations.length === 0) {
        return { optimizedRoute: [] };
    }

    if (input.destinations.length === 1) {
        return { optimizedRoute: input.destinations };
    }
    
    // Ask the LLM to re-optimize the route from the new current location.
    // This is a simplified approach. A real-world app would use a Directions Matrix API
    // for more accurate and robust route optimization.
    const { output } = await ai.generate({
        prompt: `You are a route optimization expert. Given a user's current location and a list of stops (as lat,lon pairs) they need to make, determine the most efficient order to visit them. The last stop in your optimized list will be the final destination.

User's Current Location: ${input.userLocation}
List of Stops to Visit (in no particular order): ${input.destinations.join('; ')}

Please provide the optimized list of stops as a simple array of strings in a JSON object. The last item in the array is the final destination, and the rest are waypoints.
Example Response: { "optimizedRoute": ["lat1,lon1", "lat2,lon2", "lat3,lon3"] }
`,
        output: {
            format: 'json',
            schema: z.object({
                optimizedRoute: z.array(z.string()),
            }),
        }
    });
    
    // Fallback in case the LLM fails to return a valid route
    const optimizedRoute = output?.optimizedRoute || input.destinations;
    
    return {
      optimizedRoute,
    };
  }
);
