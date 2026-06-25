// apps/api/src/services/conversation.ts
import { createDb } from '../db'
import { leads, conversations, chatMessages } from '../db/schema'
import type { Business } from '../db/schema'

/**
 * Creates a new lead and conversation record when a visitor starts chatting.
 * Returns the conversation ID to track the session.
 */
export const createConversation = async (
  databaseUrl: string,
  business: Business
): Promise<{ leadId: string; conversationId: string }> => {
  const db = createDb(databaseUrl)

  // Create a new lead record scoped to this business
  const [lead] = await db
    .insert(leads)
    .values({
      businessId: business.id,
      status: 'new'
    })
    .returning({ id: leads.id })

  // Create a conversation linked to the lead
  const [conversation] = await db
    .insert(conversations)
    .values({
      leadId: lead.id,
      businessId: business.id,
      channel: 'web'
    })
    .returning({ id: conversations.id })

  return { leadId: lead.id, conversationId: conversation.id }
}

/**
 * Saves a single message to the conversation history in DB.
 * Called after every message exchange to maintain full chat log.
 */
export const saveMessage = async (
  databaseUrl: string,
  conversationId: string,
  businessId: string,
  role: 'visitor' | 'assistant',
  content: string
): Promise<void> => {
  const db = createDb(databaseUrl)

  await db.insert(chatMessages).values({
    conversationId,
    businessId,
    role,
    content
  })
}