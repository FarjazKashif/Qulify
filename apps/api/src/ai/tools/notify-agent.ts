import { z } from 'zod'
import type { Tool } from './types'
import { notifyAgent } from '../../services/notifier'
import { getLeadById } from '../../services/lead'

const inputSchema = z.object({
  reason: z.string()
})

/**
 * Manually triggers an agent notification, independent of the lead's
 * AI-assigned score. Used when a visitor explicitly signals urgency
 * ("call me now", "connect me to someone") — explicit intent from the
 * visitor is a stronger signal than the AI's own score estimate, so
 * this bypasses the normal hot/warm-only automatic notification.
 */
export const notifyAgentTool: Tool<z.infer<typeof inputSchema>> = {
  name: 'notify_agent_now',
  description: 'Immediately notifies the human agent, regardless of the lead\'s current score. Call this when the visitor explicitly asks to speak with a real person, requests urgent contact, or clearly signals they want immediate human follow-up — do not wait for normal qualification to finish in these cases.',
  inputSchema,
  execute: async (input, context) => {
    const lead = await getLeadById(context.databaseUrl, context.business.id, context.leadId)

    const historyNote = [
      { role: 'system', content: `Manually triggered notification. Reason: ${input.reason}` }
    ]

    try {
      await notifyAgent(
        context.databaseUrl,
        context.resendApiKey,
        context.resendFromEmail,
        context.business,
        context.leadId,
        historyNote,
        { score: lead?.score ?? 'cold', reason: input.reason },
        true // force = true, bypasses the cold check
      )

      return {
        success: true,
        message: 'Agent has been notified and will reach out shortly.'
      }
    } catch (error) {
      console.error('[notify-agent-tool] Failed:', error)
      return {
        success: false,
        message: 'Could not notify the agent right now, but the request has been logged.'
      }
    }
  }
}