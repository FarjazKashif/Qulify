import { z } from 'zod'
import type { Tool } from './types'
import { updateLeadProfile } from '../../services/lead'

const inputSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  intent: z.enum(['buy', 'sell', 'rent']).optional(),
  budgetRange: z.string().optional(),
  locationPreference: z.string().optional(),
  propertyType: z.enum(['single-family', 'condo', 'townhome', 'multi-family', 'land', 'commercial', 'unknown']).optional(),
  timeline: z.enum(['this-week', 'this-month', 'three-months', 'six-months-plus', 'just-browsing', 'unknown']).optional()
})

/**
 * Saves whatever lead information has been gathered so far in the
 * conversation (name, contact info, intent, budget, location, timeline).
 * Call this whenever the visitor shares a new piece of qualifying
 * information — not just at the end of the conversation.
 */
export const saveLeadTool: Tool<z.infer<typeof inputSchema>> = {
  name: 'save_lead_info',
  description: 'Saves or updates lead information whenever the visitor shares or corrects their name, phone, email, intent (buy/sell/rent), budget, location preference, property type, or timeline. Always call this again if the visitor updates or corrects previously shared information — do not assume old info is still accurate once corrected.',
  inputSchema,
  execute: async (input, context) => {
    const updated = await updateLeadProfile(context.databaseUrl, context.business.id, context.leadId, input)

    if (!updated) {
      return { success: false, message: 'Failed to save lead information.' }
    }

    return {
      success: true,
      data: updated,
      message: 'Lead information saved successfully.'
    }
  }
}