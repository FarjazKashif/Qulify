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
 * Maximum number of prior messages kept in conversation history sent
 * to Groq. Single source of truth — shared between the route (which
 * slices history before building the AI prompt) and this schema
 * (which caps the incoming array length) so they can't drift apart.
 */
export const MAX_MESSAGES = 10;

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

/**
 * Validates a single message in the conversation history array sent
 * with each POST /chat/message request. Leaner than chatMessageSchema
 * (no id/businessId/createdAt) since this is the wire format the
 * frontend sends, not a stored DB record.
 */
export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: nonEmptyStringSchema(4000),
});

/**
 * Validates the actual POST /chat/message request body as implemented
 * in apps/api/src/routes/chat.ts. businessId is intentionally absent —
 * it comes from tenant middleware via c.get('business'), not the body.
 * message is capped at 1500 chars for the same reason as chatRequestSchema:
 * generous for real chat input, tight enough to block abuse payloads
 * before they reach Groq.
 */
export const chatMessageRequestSchema = z.object({
  message: nonEmptyStringSchema(1500),
  history: z.array(historyMessageSchema).max(MAX_MESSAGES),
  conversationId: z.string().uuid("conversationId must be a valid UUID"),
  leadId: z.string().uuid("leadId must be a valid UUID"),
});

export type ChatMessageRequestInput = z.infer<typeof chatMessageRequestSchema>;

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type ChatResponseInput = z.infer<typeof chatResponseSchema>;