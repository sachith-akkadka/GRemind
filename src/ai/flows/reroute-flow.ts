
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
import { firebaseConfig } from '@/lib/firebase';


export type RerouteInput = z.infer<typeof RerouteInputSchema>;
const RerouteInputSchema = z.object({
  userLocation: z.string().describe("The user's current location as a latitude,longitude pair."),
  destinations: z.array(z.string()).describe("An array of the destination latlon strings that need to be visited."),
});

export type RerouteOutput = z.infer<typeof RerouteOutputSchema>;
const RerouteOutputSchema = z.object({
  optimizedRoute: z.array(z.string()).describe("The optimized list of stops. The last item is the final destination, and the rest are waypoints."),
});

export async function reroute(input: RerouteInput): Promise<RerouteOutput> {
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
      
      // Use the Google Directions API to optimize the route.
      const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
      directionsUrl.searchParams.set('origin', input.userLocation);
      // The last destination in the unoptimized list will be the final destination
      directionsUrl.searchParams.set('destination', input.destinations[input.destinations.length - 1]);
      
      // The other destinations are waypoints. The API supports optimizing the order.
      if (input.destinations.length > 1) {
          const waypoints = input.destinations.slice(0, -1);
          directionsUrl.searchParams.set('waypoints', `optimize:true|${waypoints.join('|')}`);
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error("Google Maps API key is not configured.");
      }
      directionsUrl.searchParams.set('key', apiKey);

      try {
          const response = await fetch(directionsUrl.toString());
          const data = await response.json();

          if (data.status === 'OK' && data.routes && data.routes[0]) {
              const route = data.routes[0];
              const waypointOrder = route.waypoint_order;
              
              const unoptimizedWaypoints = input.destinations.slice(0, -1);
              const finalDestination = input.destinations[input.destinations.length - 1];

              // Reconstruct the route in the optimized order
              const optimizedWaypoints = waypointOrder.map((index: number) => unoptimizedWaypoints[index]);
              const optimizedRoute = [...optimizedWaypoints, finalDestination];

              return { optimizedRoute };
          } else {
              // Fallback to the original order if API fails
              return { optimizedRoute: input.destinations };
          }
      } catch (error) {
          console.error("Directions API error:", error);
          // Fallback in case of fetch error
          return { optimizedRoute: input.destinations };
      }
    }
  );
  return rerouteFlow(input);
}
