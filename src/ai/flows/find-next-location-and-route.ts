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
import { firebaseConfig } from '@/lib/firebase';


const FindNextLocationAndRouteInputSchema = z.object({
  taskTitle: z.string().describe("The title of the task that was not completed."),
  userLocation: z.string().describe("The user's current location as a latitude,longitude pair."),
  locationToExclude: z.string().describe("The latlon of the location the user just left."),
  remainingDestinations: z.array(z.string()).describe("An array of the remaining destination latlon strings on the user's route."),
});

export type FindNextLocationAndRouteInput = z.infer<typeof FindNextLocationAndRouteInputSchema>;

const FindNextLocationAndRouteOutputSchema = z.object({
  newLocation: z.object({
    name: z.string(),
    address: z.string(),
  }).nullable(),
  newDestination: z.string().nullable().describe("The next primary destination latlon."),
  newWaypoints: z.array(z.string()).describe("The updated list of waypoint latlons for the optimized route."),
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
        const newDestination = remaining.length > 0 ? remaining.pop()! : null;
        const newWaypoints = remaining;
        return {
            newLocation: null,
            newDestination,
            newWaypoints,
        };
    }
    
    const allStops = [...input.remainingDestinations, newLocation.latlon];

    // 2. Use Google Directions API to optimize the route.
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.set('origin', input.userLocation);
    directionsUrl.searchParams.set('destination', allStops[allStops.length - 1]);
    
    if (allStops.length > 1) {
        const waypoints = allStops.slice(0, -1);
        directionsUrl.searchParams.set('waypoints', `optimize:true|${waypoints.join('|')}`);
    }
    
    directionsUrl.searchParams.set('key', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey);
    
    try {
        const response = await fetch(directionsUrl.toString());
        const data = await response.json();

        let optimizedRoute = allStops;
        if (data.status === 'OK' && data.routes && data.routes[0]) {
            const route = data.routes[0];
            const waypointOrder = route.waypoint_order;
            
            const unoptimizedWaypoints = allStops.slice(0, -1);
            const finalDestination = allStops[allStops.length - 1];

            const orderedWaypoints = waypointOrder.map((index: number) => unoptimizedWaypoints[index]);
            optimizedRoute = [...orderedWaypoints, finalDestination];
        }

        const newDestination = optimizedRoute.length > 0 ? optimizedRoute.pop()! : null;
        const newWaypoints = optimizedRoute;

        return {
          newLocation: { name: newLocation.name, address: newLocation.latlon },
          newDestination,
          newWaypoints,
        };
    } catch (error) {
        console.error("Error optimizing route with Directions API:", error);
        // Fallback to unoptimized route on error
        const remaining = [...allStops];
        const newDestination = remaining.length > 0 ? remaining.pop()! : null;
        return {
            newLocation: { name: newLocation.name, address: newLocation.latlon },
            newDestination,
            newWaypoints: remaining,
        };
    }
  }
);
