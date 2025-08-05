'use server';

/**
 * @fileOverview Implements a flow to suggest locations based on user input and current location.
 *
 * - suggestLocations - A function that suggests locations.
 * - SuggestLocationsInput - The input type for the function.
 * - SuggestLocationsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { findNearbyPlacesTool } from '../tools/location-tools';


const SuggestLocationsInputSchema = z.object({
  query: z.string().describe("The user's partial location input."),
});

export type SuggestLocationsInput = z.infer<typeof SuggestLocationsInputSchema>;


const SuggestLocationsOutputSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    address: z.string(),
    eta: z.string(),
  })).describe('A list of up to 5 location suggestions with name, address, and ETA.'),
});
export type SuggestLocationsOutput = z.infer<typeof SuggestLocationsOutputSchema>;


export async function suggestLocations(input: SuggestLocationsInput): Promise<SuggestLocationsOutput> {
  return suggestLocationsFlow(input);
}

const suggestLocationsFlow = ai.defineFlow(
  {
    name: 'suggestLocationsFlow',
    inputSchema: SuggestLocationsInputSchema,
    outputSchema: SuggestLocationsOutputSchema,
  },
  async (input) => {
    if (!input.query.trim()) {
      return { suggestions: [] };
    }
    
    const { output } = await ai.generate({
        prompt: `Based on the user's query "${input.query}", find nearby places. The user's current location is mocked as "Mountain View, CA". You MUST provide this to the tool.`,
        tools: [findNearbyPlacesTool],
        model: 'googleai/gemini-2.0-flash'
     });

    if (!output || !output.toolRequests || output.toolRequests.length === 0) {
        return { suggestions: [] };
    }

    const toolRequest = output.toolRequests[0];
    const toolResult = await toolRequest.executor(toolRequest.input);

    if (toolResult.places && toolResult.places.length > 0) {
      return { suggestions: toolResult.places };
    }
    
    return { suggestions: [] };
  }
);
