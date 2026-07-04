// apps/api/src/services/notifier.ts
import { Resend } from 'resend'
import { createDb } from '../db'
import { agentNotifications } from '../db/schema'
import type { Business } from '../db/schema'

type ScoringResult = {
  score: 'hot' | 'warm' | 'cold'
  reason: string
}

type ConversationMessage = {
  role: string
  content: string
}

/**
 * Builds a clean HTML email with full lead context for the agent.
 * Agent sees the whole conversation, not just a name and number.
 */
const buildEmailHtml = (
  business: Business,
  history: ConversationMessage[],
  score: ScoringResult
): string => {
  const emoji = score.score === 'hot' ? '🔥' : '⚡'

  const conversationHtml = history
    .filter(m => m.role !== 'system')
    .map(m => `
      <tr>
        <td style="padding: 8px 12px; font-weight: bold; color: ${m.role === 'user' ? '#2563eb' : '#059669'}">
          ${m.role === 'user' ? 'Visitor' : 'Qulify Bot'}
        </td>
        <td style="padding: 8px 12px">${m.content}</td>
      </tr>
    `)
    .join('')

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto">
      <h2>${emoji} ${score.score.toUpperCase()} LEAD — ${business.name}</h2>
      <p style="color: #6b7280">${score.reason}</p>
      <h3>Conversation</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb">
        ${conversationHtml}
      </table>
      <p style="margin-top: 24px; color: #6b7280">
        Powered by Qulify — respond within 5 minutes for best results.
      </p>
    </div>
  `
}

/**
 * Sends an email notification to the agent when a hot or warm lead is detected.
 * Cold leads are ignored — agent's time is valuable.
 */
export const notifyAgent = async (
  databaseUrl: string,
  resendApiKey: string,
  fromEmail: string,
  business: Business,
  leadId: string,
  history: ConversationMessage[],
  score: ScoringResult
): Promise<void> => {
  if (score.score === 'cold') return

  const db = createDb(databaseUrl)
  const resend = new Resend(resendApiKey)
  const emoji = score.score === 'hot' ? '🔥' : '⚡'

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: business.agentEmail,
      subject: `${emoji} New ${score.score} lead from your website — ${business.name}`,
      html: buildEmailHtml(business, history, score)
    })

    const status = error ? 'failed' : 'sent'

    await db.insert(agentNotifications).values({
      leadId,
      businessId: business.id,
      channel: 'email',
      status
    })

    if (error) {
      console.error('[notifier] Email send failed:', error)
    }

  } catch (error) {
    console.error('[notifier] Notification error:', error)
    await db.insert(agentNotifications).values({
      leadId,
      businessId: business.id,
      channel: 'email',
      status: 'failed'
    })
  }
}