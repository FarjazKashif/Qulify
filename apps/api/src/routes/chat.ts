// apps/api/src/routes/chat.ts
import { Hono } from 'hono'
import { createGroqClient } from '../ai/groq-client'
import { buildSystemPrompt } from '../ai/prompts'
import { createDb } from '../db'
import type { Business } from '../db/schema'

// Groq has a 4096 token limit — we keep last 10 messages
// to stay within limits while maintaining conversation flow
const MAX_MESSAGES = 10

type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type Env = {
  DATABASE_URL: string
  GROQ_API_KEY: string
}

const chat = new Hono<{ Bindings: Env; Variables: { business: Business } }>()

/**
 * POST /chat
 * Receives a visitor message and returns an AI response.
 * Expects: { message: string, history: ChatMessage[] }
 * Returns: { reply: string }
 */
chat.post('/', async (c) => {
  try {
    const business = c.get('business')
    const { message, history = [] } = await c.req.json<{
      message: string
      history: ChatMessage[]
    }>()

    if (!message?.trim()) {
      return c.json({ success: false, error: 'Message is required' }, 400)
    }

    const groq = createGroqClient(c.env.GROQ_API_KEY)
    const systemPrompt = buildSystemPrompt(business)

    // Keep only recent messages to stay within token limits
    const recentHistory = history.slice(-MAX_MESSAGES)

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 300
    })

    const reply = response.choices[0]?.message?.content
    if (!reply) {
      return c.json({ success: false, error: 'No response from AI' }, 500)
    }

    return c.json({ success: true, reply })

  } catch (error) {
    console.error('[chat] Error:', error)
    return c.json({ success: false, error: 'Something went wrong' }, 500)
  }
})

export default chat