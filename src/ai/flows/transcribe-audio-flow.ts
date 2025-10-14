'use server';
/**
 * @fileOverview A Genkit flow to transcribe audio to text.
 *
 * - transcribeAudio - A function that takes an audio data URI and returns the transcribed text.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data as a data URI. Expected format: 'data:audio/<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcribedText: z.string().describe('The transcribed text from the audio.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const transcribeAudioPrompt = ai.definePrompt({
  name: 'transcribeAudioPrompt',
  input: {schema: TranscribeAudioInputSchema},
  output: {schema: TranscribeAudioOutputSchema},
  model: 'googleai/gemini-2.0-flash', // Using the same model as configured in genkit.ts
  prompt: `Please transcribe the following audio to text. Respond with only the transcribed text. Ensure the transcription is accurate.
Audio: {{media url=audioDataUri}}`,
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input) => {
    // Add a check for empty or very short audio data URI if needed client-side first
    if (!input.audioDataUri.includes('base64,') || input.audioDataUri.split('base64,')[1].length < 100) {
        // This is a very basic check, real validation would be more robust
        // console.warn("Potentially empty or too short audio data URI received.");
        // Potentially return empty or throw, but let model try.
    }

    const { output } = await transcribeAudioPrompt(input);
    if (!output) {
      // This case should ideally be handled by Genkit if the model truly returns nothing
      // but the schema expects a string. Zod parsing would fail if model output doesn't match.
      // If model returns e.g. { transcribedText: null } and schema doesn't allow null, it's an error.
      // If model returns empty object {} it's an error.
      // If model returns { transcribedText: "" } it's valid for the schema.
      return { transcribedText: "" }; // Return empty string if model provides no text
    }
    return output; // output already matches TranscribeAudioOutputSchema due to definePrompt
  }
);
