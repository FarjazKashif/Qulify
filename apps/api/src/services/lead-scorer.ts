// apps/api/src/services/lead-scorer.ts
import OpenAI from 'openai'
import { buildScoringPrompt } from '../ai/prompts'
import { createDb } from '../db'
import { leads } from '../db/schema'
import { eq } from 'drizzle-orm'
import { scoringResultSchema, type ScoringResultInput } from '@qulify/shared'

/**
 * Scores a lead as hot/warm/cold using GPT-4o-mini.
 * Runs async after qualification — never blocks the chat response.
 * Updates the lead record in DB with the score.
 */
export const scoreLead = async (
  databaseUrl: string,
  openAiApiKey: string,
  leadId: string,
  conversationHistory: { role: string; content: string }[]
): Promise<ScoringResultInput> => {
  try {
    const client = new OpenAI({ apiKey: openAiApiKey })

    // Build a summary of the conversation for scoring
    const conversationSummary = conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: buildScoringPrompt(conversationSummary)
        }
      ],
      // Response must be valid JSON for reliable parsing
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 100
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('No scoring response')

     const parsed = scoringResultSchema.safeParse(JSON.parse(raw))

    if (!parsed.success) {
      console.error('[lead-scorer] Invalid scoring response shape:', parsed.error.flatten())
      return { score: 'warm', reason: 'Scoring response was malformed, defaulting to warm' }
    }

    const result = parsed.data

    // Update lead score in DB
    const db = createDb(databaseUrl)
    await db
      .update(leads)
      .set({
        score: result.score,
        scoreReason: result.reason
      })
      .where(eq(leads.id, leadId))

    return result

  } catch (error) {
    console.error('[lead-scorer] Scoring failed:', error)
    // Default to warm on failure — better than losing a potential lead
    return { score: 'warm', reason: 'Scoring failed, defaulting to warm' }
  }
}