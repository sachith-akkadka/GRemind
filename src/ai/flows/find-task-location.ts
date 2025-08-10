
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


const findTaskLocationPrompt = ai.definePrompt(
  {
    name: 'findTaskLocationPrompt',
    input: { schema: FindTaskLocationInputSchema },
    output: { schema: z.nullable(FindTaskLocationOutputSchema) },
    tools: [findNearbyPlacesTool],
    prompt: `Based on the user's task title and current location, find the single best and most relevant nearby place for them to complete their task.
    
    Task: {{{taskTitle}}}
    User Location: {{{userLocation}}}
    {{#if locationsToExclude}}
    Do not suggest any of the following locations: {{{locationsToExclude}}}
    {{/if}}

    Only call the findNearbyPlacesTool ONE TIME with the best query. If the tool returns no results, then you must return null.
    `,
  },
);


const findTaskLocationFlow = ai.defineFlow(
  {
    name: 'findTaskLocationFlow',
    inputSchema: FindTaskLocationInputSchema,
    outputSchema: z.nullable(FindTaskLocationOutputSchema),
  },
  async (input) => {
    const llmResponse = await findTaskLocationPrompt(input);
    const toolRequest = llmResponse.toolRequest();

    if (toolRequest) {
      const toolOutput = await toolRequest.run();
      const finalResponse = await llmResponse.continue(toolOutput);
      return finalResponse.output();
    }
    
    // If no tool is called, maybe the LLM decided no location was relevant.
    return llmResponse.output();
  }
);
