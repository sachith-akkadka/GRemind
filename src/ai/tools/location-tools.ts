
'use server';
/**
 * @fileOverview A location services tool for Genkit that uses the Google Maps Places API.
 *
 * This file defines a Genkit tool that fetches real nearby places and
 * calculates ETAs using the Google Maps Platform.
 *
 * - findNearbyPlacesTool - A tool that finds nearby places based on a query and location.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for the tool's input
const NearbyPlacesInputSchema = z.object({
  query: z
    .string()
    .describe(
      'The type of place to search for (e.g., "coffee shop", "hardware store", "grocery store").'
    ),
  userLocation: z
    .string()
    .describe(
      "The user's current location, as a latitude,longitude pair (e.g., '12.9716,77.5946')."
    ),
});

// Define the schema for the tool's output
const NearbyPlacesOutputSchema = z.object({
  places: z.array(
    z.object({
      name: z.string().describe('The name of the business or landmark.'),
      address: z.string().describe('The human-readable address of the location.'),
      latlon: z.string().describe('The latitude,longitude pair of the location.'),
      eta: z
        .string()
        .describe('The estimated time of arrival (e.g., "5 mins", "12 mins").'),
    })
  ),
});

// Define the tool using ai.defineTool
export const findNearbyPlacesTool = ai.defineTool(
  {
    name: 'findNearbyPlacesTool',
    description:
      "Finds nearby places like businesses or landmarks using the Google Places API based on a user's query and current location. It provides an estimated time of arrival (ETA) for each, ordered from closest to farthest.",
    inputSchema: NearbyPlacesInputSchema,
    outputSchema: NearbyPlacesOutputSchema,
  },
  async (input) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        throw new Error("Google Maps API key is not configured.");
    }

    // 1. Find Nearby Places using Places API
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', input.userLocation);
    placesUrl.searchParams.set('rankby', 'distance');
    placesUrl.searchParams.set('keyword', input.query);
    placesUrl.searchParams.set('key', apiKey);

    const placesResponse = await fetch(placesUrl.toString());
    const placesData = await placesResponse.json();

    if (placesData.status !== 'OK' || !placesData.results || placesData.results.length === 0) {
      return { places: [] };
    }

    // Take top 5 results
    const nearbyPlaces = placesData.results.slice(0, 5).map((place: any) => ({
      name: place.name,
      address: place.vicinity,
      latlon: `${place.geometry.location.lat},${place.geometry.location.lng}`,
    }));
    
    // 2. Get ETAs using Distance Matrix API
    const matrixUrl = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    matrixUrl.searchParams.set('origins', input.userLocation);
    matrixUrl.searchParams.set('destinations', nearbyPlaces.map((p: any) => p.latlon).join('|'));
    matrixUrl.searchParams.set('key', apiKey);
    
    const matrixResponse = await fetch(matrixUrl.toString());
    const matrixData = await matrixResponse.json();

    if (matrixData.status !== 'OK') {
        // If distance matrix fails, return places without ETA
        return {
            places: nearbyPlaces.map((p: any) => ({ ...p, eta: 'N/A' }))
        };
    }

    const finalPlaces = nearbyPlaces.map((place: any, index: number) => {
        const element = matrixData.rows[0].elements[index];
        const eta = element.status === 'OK' ? element.duration.text : 'N/A';
        return {
            ...place,
            eta,
        };
    });

    return { places: finalPlaces };
  }
);
