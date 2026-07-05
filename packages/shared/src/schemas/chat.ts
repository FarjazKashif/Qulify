import { z } from "zod";
import { businessIdSchema, nonEmptyStringSchema, isoDateTimeSchema } from "./common";

/**
 * Validates the channel a conversation is happening on.
 * Mirrors ConversationChannel in chat.ts.
 */
export const conversationChannelSchema = z.enum(["web", "whatsapp"]);

/**
 * Validates who sent a given chat message.
 * Mirrors ChatMessageRole in chat.ts.
 */
export const chatMessageRoleSchema = z.enum(["visitor", "assistant", "system"]);

/**
 * Validates a stored chat message record.
 * Mirrors ChatMessage in chat.ts.
 */
export const chatMessageSchema = z.object({
  id: z.string().uuid("Message ID must be a valid UUID"),
  businessId: businessIdSchema,
  role: chatMessageRoleSchema,
  content: nonEmptyStringSchema(4000),
  createdAt: isoDateTimeSchema,
});

/**
 * Validates the incoming POST /chat/message request body.
 * This is the primary trust boundary for visitor-supplied input —
 * message content is bounded to prevent oversized payloads reaching
 * the Groq prompt, and conversationId (when present) must be a real UUID
 * rather than an arbitrary string that could be used to probe other
 * tenants' conversations.
 */
export const chatRequestSchema = z.object({
  businessId: businessIdSchema,
  conversationId: z.string().uuid("Conversation ID must be a valid UUID").optional(),
  message: nonEmptyStringSchema(1500),
  channel: conversationChannelSchema,
});

/**
 * Validates an outgoing chat response.
 * Lower priority than chatRequestSchema since this is server-constructed
 * data, not untrusted input — included for consistency and to catch
 * internal bugs (e.g. a malformed reply object) before it serializes.
 */
export const chatResponseSchema = z.object({
  conversationId: z.string().uuid(),
  reply: chatMessageSchema,
  qualificationComplete: z.boolean(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type ChatResponseInput = z.infer<typeof chatResponseSchema>;