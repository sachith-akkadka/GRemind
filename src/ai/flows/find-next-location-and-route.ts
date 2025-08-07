'use server';
/**
 * @fileOverview Implements a flow to re-optimize a route when a task is not completed.
 * It finds a new location for the missed task and calculates a new route.
 *
 * - findNextLocationAndRoute - A function that re-optimizes the route.
 * - FindNextLocationAndRouteInput - The input type for the function.
 * - FindNextLocationAndRouteOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { findTaskLocation } from './find-task-location';


const FindNextLocationAndRouteInputSchema = z.object({
  taskTitle: z.string().describe("The title of the task that was not completed."),
  userLocation: z.string().describe("The user's current location as a latitude,longitude pair."),
  locationToExclude: z.string().describe("The address of the location the user just left (lat,lon)."),
  remainingDestinations: z.array(z.string()).describe("An array of the remaining destination addresses (lat,lon strings) on the user's route."),
});

export type FindNextLocationAndRouteInput = z.infer<typeof FindNextLocationAndRouteInputSchema>;

const FindNextLocationAndRouteOutputSchema = z.object({
  newLocation: z.object({
    name: z.string(),
    address: z.string(),
  }).nullable(),
  newDestination: z.string().nullable().describe("The next primary destination address (lat,lon)."),
  newWaypoints: z.array(z.string()).describe("The updated list of waypoint addresses for the optimized route."),
});

export type FindNextLocationAndRouteOutput = z.infer<typeof FindNextLocationAndRouteOutputSchema>;

export async function findNextLocationAndRoute(input: FindNextLocationAndRouteInput): Promise<FindNextLocationAndRouteOutput> {
  return findNextLocationAndRouteFlow(input);
}


const findNextLocationAndRouteFlow = ai.defineFlow(
  {
    name: 'findNextLocationAndRouteFlow',
    inputSchema: FindNextLocationAndRouteInputSchema,
    outputSchema: FindNextLocationAndRouteOutputSchema,
  },
  async (input) => {
    // 1. Find a new location for the missed task.
    const newLocation = await findTaskLocation({
      taskTitle: input.taskTitle,
      userLocation: input.userLocation,
      locationsToExclude: [input.locationToExclude],
    });

    if (!newLocation) {
        // Could not find an alternative, so just route to the next available stop.
        const remaining = [...input.remainingDestinations];
        const newDestination = remaining.pop() || null;
        return {
            newLocation: null,
            newDestination,
            newWaypoints: remaining,
        };
    }
    
    const allStops = [...input.remainingDestinations, newLocation.address];

    // 2. Ask the LLM to re-optimize the route.
    // This is a simplified approach. A real-world app would use a Directions Matrix API.
    const { output } = await ai.generate({
        prompt: `You are a route optimization expert. Given a user's current location and a list of stops they need to make, determine the most efficient order to visit them. The last stop in your optimized list will be the final destination.

User's Current Location: ${input.userLocation}
List of Stops (in no particular order): ${allStops.join(', ')}

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
    
    const optimizedRoute = output?.optimizedRoute || allStops;
    
    const newDestination = optimizedRoute.pop() || null;
    const newWaypoints = optimizedRoute;

    return {
      newLocation: { name: newLocation.name, address: newLocation.address },
      newDestination,
      newWaypoints,
    };
  }
);
