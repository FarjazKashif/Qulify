// apps/api/src/ai/groq-client.ts
import Groq from 'groq-sdk'

/**
 * Creates a Groq client instance using the API key from environment.
 * We create it per-request in Workers since there's no persistent state.
 */
export const createGroqClient = (apiKey: string): Groq => {
  return new Groq({ apiKey })
}

export type { Groq }