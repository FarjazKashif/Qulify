import type { BusinessId } from './business'

export type ConversationChannel = 'web' | 'whatsapp'

export type ChatMessageRole = 'visitor' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  businessId: BusinessId
  role: ChatMessageRole
  content: string
  createdAt: string
}

export interface ChatRequest {
  businessId: BusinessId
  conversationId?: string
  message: string
  channel: ConversationChannel
}

export interface ChatResponse {
  conversationId: string
  reply: ChatMessage
  qualificationComplete: boolean
}