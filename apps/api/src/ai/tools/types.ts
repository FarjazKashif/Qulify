import type { z, ZodSchema } from 'zod'
import type { Business } from '../../db/schema'

/**
 * Context passed to every tool's execute() function. Carries the things
 * most tools need without each tool having to redeclare them — the
 * caller (chat route) assembles this once per conversation turn.
 */
export interface ToolContext {
  databaseUrl: string
  business: Business
  leadId: string
  conversationId: string
  resendApiKey: string
  resendFromEmail: string
}

/**
 * Consistent result shape every tool returns, regardless of what it does
 * internally. Groq receives this as the "tool result" message — keeping
 * it uniform means the prompt/loop logic doesn't need per-tool handling.
 */
export interface ToolResult {
  success: boolean
  data?: unknown
  message: string // human-readable summary Groq can incorporate into its reply
}

/**
 * The contract every tool must follow. A tool never touches the DB or
 * external APIs directly — execute() calls into the existing service
 * layer (services/lead.ts, services/business.ts, etc.), keeping tools
 * as a thin orchestration layer, not a new place business logic lives.
 */
export interface Tool<TInput = unknown> {
  name: string
  description: string // what Groq reads to decide when to use this tool
  inputSchema: ZodSchema<TInput>
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult>
}

/**
 * Helper type to infer a tool's input type from its Zod schema, so tool
 * files don't need to manually write out matching TypeScript types.
 */
export type InferToolInput<T extends ZodSchema> = z.infer<T>