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
      "The user's current location, as an address or landmark (e.g., 'Mountain View, CA')."
    ),
});

// Define the schema for the tool's output
const NearbyPlacesOutputSchema = z.object({
  places: z.array(
    z.object({
      name: z.string().describe('The name of the business or landmark.'),
      address: z.string().describe('The full address of the location.'),
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
      prompt: `You are a simulated Maps API. Based on the search query "${input.query}" near "${input.userLocation}", generate a list of 3 to 5 plausible, real-world business names with realistic-looking street addresses and estimated travel times (ETAs).

      IMPORTANT: The results MUST be sorted by proximity, from the closest location to the farthest. The ETAs should reflect this, starting with shorter times (e.g., "5 mins", "8 mins") and increasing for subsequent results (e.g., "15 mins", "20 mins").

      For example, if the query is "coffee shop" near "Palo Alto, CA", a good response would be a JSON object like:
      {
        "places": [
          { "name": "Philz Coffee", "address": "101 Forest Ave, Palo Alto, CA 94301", "eta": "6 mins" },
          { "name": "Verve Coffee Roasters", "address": "162 University Ave, Palo Alto, CA 94301", "eta": "9 mins" },
          { "name": "Blue Bottle Coffee", "address": "456 University Ave, Palo Alto, CA 94301", "eta": "14 mins" }
        ]
      }

      Return the data as a valid JSON object with a "places" array. Do not add any commentary.`,
      model: 'googleai/gemini-2.0-flash',
      output: {
        format: 'json',
        schema: NearbyPlacesOutputSchema,
      },
    });

    return output ?? { places: [] };
  }
);
