import { GoogleGenAI, Type } from '@google/genai'
import { buildScoringPrompt } from '../ai/prompts'
import { createDb } from '../db'
import { leads } from '../db/schema'
import { eq } from 'drizzle-orm'
import { scoringResultSchema, type ScoringResultInput } from '@qulify/shared'

/**
 * Scores a lead as hot/warm/cold using Gemini (gemini-flash-latest).
 * Runs async after qualification — never blocks the chat response.
 * Updates the lead record in DB with the score.
 */
export const scoreLead = async (
  databaseUrl: string,
  geminiApiKey: string,
  leadId: string,
  conversationHistory: { role: string; content: string }[]
): Promise<ScoringResultInput> => {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    const conversationSummary = conversationHistory
      .filter(m => m.role !== 'system')
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: buildScoringPrompt(conversationSummary),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.STRING, enum: ['hot', 'warm', 'cold'] },
            reason: { type: Type.STRING }
          },
          required: ['score', 'reason']
        },
        thinkingConfig: {
          thinkingBudget: 0
        },
        temperature: 0,
        maxOutputTokens: 300
      }
    })

    const raw = response.text
    if (!raw) throw new Error('No scoring response')

    // Even with responseSchema set, gemini-flash-latest sometimes adds a
    // conversational preamble ("Here is the JSON:") before the actual
    // object. Extract just the {...} block as a defensive fallback.
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON object found in Gemini response: ' + raw)

    const parsed = scoringResultSchema.safeParse(JSON.parse(jsonMatch[0]))

    if (!parsed.success) {
      console.error('[lead-scorer] Invalid scoring response shape:', parsed.error.flatten())
      return { score: 'warm', reason: 'Scoring response was malformed, defaulting to warm' }
    }

    const scoringResult = parsed.data

    const db = createDb(databaseUrl)
    await db
      .update(leads)
      .set({
        score: scoringResult.score,
        scoreReason: scoringResult.reason
      })
      .where(eq(leads.id, leadId))

    return scoringResult

  } catch (error) {
    console.error('[lead-scorer] Scoring failed:', error)
    return { score: 'warm', reason: 'Scoring failed, defaulting to warm' }
  }
}