
'use server';
/**
 * @fileOverview A simulated location services tool for Genkit.
 *
 * This file defines a Genkit tool that simulates fetching nearby places and
 * calculating ETAs, mimicking a real-world Maps API for the prototype.
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
      address: z.string().describe('A plausible street address for the location (e.g., "123 Main St, Anytown, State, ZIP").'),
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
      "Finds nearby places like businesses or landmarks based on a user's query and current location. It provides an estimated time of arrival (ETA) for each, ordered from closest to farthest.",
    inputSchema: NearbyPlacesInputSchema,
    outputSchema: NearbyPlacesOutputSchema,
  },
  async (input) => {
    // In a real application, this is where you would call a real Maps API.
    // For this prototype, we'll use another LLM call to generate
    // plausible, realistic-looking data based on the query.

    const { output } = await ai.generate({
      prompt: `You are a simulated Maps API. Your most important instruction is to generate realistic-looking places that are geographically very close to the user's provided location. Your primary goal is to find the absolute closest options.

      The user's location is: "${input.userLocation}".
      The search query is: "${input.query}".

      Generate a list of 3 to 5 plausible, real-world business names that match the query.

      **CRITICAL RULES:**
      1.  **HYPER-LOCAL:** The results MUST be in the same town or city as the user's location. For example, if the user is in "Puttur, India", do NOT suggest places in "Sullia, India". All generated addresses and lat/lon pairs must be extremely close to the user's provided coordinates.
      2.  **SORT BY PROXIMITY (MOST IMPORTANT):** The results MUST be sorted from the closest location to the farthest. The ETAs must reflect this, starting with very short times (e.g., "4 mins", "7 mins") and increasing for subsequent results (e.g., "12 mins", "18 mins"). Prioritize the absolute nearest options, even if they are less well-known.
      3.  **VALID LAT/LON:** The "latlon" field for each result MUST be a valid latitude,longitude pair, slightly different for each result and plausibly near the input location.
      4.  **REALISTIC ADDRESS:** The "address" field must be a human-readable street address, including the city and state to confirm its location.

      Example for a query "coffee shop" near "12.9716,77.5946" (Bangalore):
      {
        "places": [
          { "name": "Starbucks", "address": "101 MG Road, Bangalore", "latlon": "12.9720,77.5950", "eta": "4 mins" },
          { "name": "Third Wave Coffee", "address": "45 Commercial St, Bangalore", "latlon": "12.9700,77.5980", "eta": "6 mins" },
          { "name": "Blue Tokai Coffee", "address": "78 Richmond Rd, Bangalore", "latlon": "12.9695,77.6001", "eta": "11 mins" }
        ]
      }

      Return ONLY the valid JSON object with a "places" array. Do not add any commentary.`,
      model: 'googleai/gemini-2.0-flash',
      output: {
        format: 'json',
        schema: NearbyPlacesOutputSchema,
      },
    });

    return output ?? { places: [] };
  }
);
