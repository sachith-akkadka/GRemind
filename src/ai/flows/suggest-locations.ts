'use server';

/**
 * @fileOverview A Genkit flow that suggests locations based on a user's query.
 *
 * - suggestLocations - A function that returns a list of location suggestions.
 * - SuggestLocationsInput - The input type for the suggestLocations function.
 * - SuggestLocationsOutput - The return type for the suggestLocations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { findNearbyPlacesTool } from '../tools/location-tools';

const SuggestLocationsInputSchema = z.object({
  query: z.string().describe('The user\'s search query for a location.'),
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

export async function suggestLocations(
  input: SuggestLocationsInput
): Promise<SuggestLocationsOutput> {
  return suggestLocationsFlow(input);
}

const suggestLocationsFlow = ai.defineFlow(
  {
    name: 'suggestLocationsFlow',
    inputSchema: SuggestLocationsInputSchema,
    outputSchema: SuggestLocationsOutputSchema,
    tools: [findNearbyPlacesTool]
  },
  async input => {
     const {output} = await ai.generate({
        prompt: `Based on the user's query, find nearby places.
        Query: ${input.query}
        User's current location is mocked as "Mountain View, CA". You MUST provide this to the tool.`,
        tools: [findNearbyPlacesTool],
        model: 'googleai/gemini-2.0-flash'
     });

    if (!output || !output.toolRequests) {
        return { suggestions: [] };
    }

    const toolResponses = await Promise.all(
        output.toolRequests.map(async (toolRequest) => {
            const result = await toolRequest.executor(toolRequest.input);
            return {
                id: toolRequest.id,
                role: 'tool',
                content: [{ json: result }],
            };
        })
    );

    const finalResponse = await ai.generate({
      history: [
        {role: 'user', content: [{text: `Based on the user's query, find nearby places. Query: ${input.query}`}]},
        {role: 'model', content: output.toolRequests.map(tr => ({toolRequest: {id: tr.id, input: tr.input, name: tr.name}}))},
        {role: 'tool', content: toolResponses.flatMap(r => r.content)}
      ],
      prompt: "Present the location suggestions to the user as a list of suggestions, including the name, address, and ETA for each."
    });

    try {
        const suggestions = JSON.parse(finalResponse.text).suggestions;
        return { suggestions };
    } catch(e) {
        // The LLM may not return perfect JSON, so we will try to parse it, but fall back to a simple list.
        // In a real app, you would want to use a schema for the output.
        const suggestions = finalResponse.text.split('\n').map(s => {
            const parts = s.split(',');
            return {
                name: parts[0] || '',
                address: parts[1] || '',
                eta: parts[2] || '',
            }
        });
        return { suggestions: suggestions.slice(0, 5).filter(s => s.name) };
    }
  }
);
