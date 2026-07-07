// apps/api/src/routes/chat.ts
import { Hono } from 'hono'
import { createGroqClient } from '../ai/groq-client'
import { buildSystemPrompt } from '../ai/prompts'
import { createConversation, saveMessage, scoreLead, notifyAgent } from '../services'
import type { Business } from '../db/schema'
import { chatMessageRequestSchema, MAX_MESSAGES } from '@qulify/shared'
import { checkRateLimit } from '../services/rate-limit'

type ChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

type Env = {
  Bindings: {
    DATABASE_URL: string
    GROQ_API_KEY: string
    GEMINI_API_KEY: string
    RESEND_API_KEY: string
    RESEND_FROM_EMAIL: string
    RATE_LIMIT_KV: KVNamespace
  }
  Variables: {
    business: Business
  }
}

const chat = new Hono<Env>()

/**
 * POST /chat/start
 * Called when a visitor opens the chat bubble for the first time.
 * Creates a lead + conversation record in DB and returns IDs for the session.
 */
chat.post('/start', async (c) => {
  try {
    const business = c.get('business')

    const { leadId, conversationId } = await createConversation(
      c.env.DATABASE_URL,
      business
    )

    return c.json({ success: true, leadId, conversationId })

  } catch (error) {
    console.error('[chat/start] Error:', error)
    return c.json({ success: false, error: 'Failed to start conversation' }, 500)
  }
})

/**
 * POST /chat/message
 * Main chat endpoint. Receives visitor message, returns AI reply.
 * Saves messages to DB and triggers async scoring after each turn.
 * Expects: { message, history, conversationId, leadId }
 */
chat.post('/message', async (c) => {
  try {
    const business = c.get('business')
    const rawBody = await c.req.json()
    const parseResult = chatMessageRequestSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return c.json(
        { success: false, error: 'Invalid request', details: parseResult.error.flatten() },
        400
      )
    }

    const { message, history, conversationId, leadId } = parseResult.data

    const allowed = await checkRateLimit(c.env.RATE_LIMIT_KV, conversationId)

    if (!allowed) {
      return c.json(
        { success: false, error: 'Too many messages. Please slow down.' },
        429
      )
    }

    const groq = createGroqClient(c.env.GROQ_API_KEY)
    const systemPrompt = buildSystemPrompt(business)
    const recentHistory = history.slice(-MAX_MESSAGES)

    // Get AI reply from Groq
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

    // Save both messages to DB (visitor + assistant)
    await saveMessage(c.env.DATABASE_URL, conversationId, business.id, 'visitor', message)
    await saveMessage(c.env.DATABASE_URL, conversationId, business.id, 'assistant', reply)

    // Score the lead async after every message — don't await, don't block the reply
    // We use waitUntil so Cloudflare Workers doesn't kill the async task early
    const fullHistory = [...recentHistory, { role: 'user', content: message }, { role: 'assistant', content: reply }]

    c.executionCtx.waitUntil(
      scoreLead(c.env.DATABASE_URL, c.env.GEMINI_API_KEY, leadId, fullHistory)
        .then(async (score) => {
          // Only notify agent if lead is hot or warm
          if (score.score !== 'cold') {
            await notifyAgent(
              c.env.DATABASE_URL,
              c.env.RESEND_API_KEY,
              c.env.RESEND_FROM_EMAIL,
              business,
              leadId,
              fullHistory,
              score
            )
          }
        })
        .catch((err) => console.error('[chat/message] Async scoring failed:', err))
    )

    return c.json({ success: true, reply })

  } catch (error) {
    console.error('[chat/message] Error:', error)
    return c.json({ success: false, error: 'Something went wrong' }, 500)
  }
})

export default chat