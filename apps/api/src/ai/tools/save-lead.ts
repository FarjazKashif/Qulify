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
  description: 'Saves or updates lead information whenever the visitor shares or corrects their name, phone, email, intent (buy/sell/rent), budget, location preference, property type, or timeline. Always call this again if the visitor updates or corrects previously shared information — do not assume old info is still accurate once corrected. For propertyType, use your judgment to map what the visitor actually describes to the closest matching enum value (single-family, condo, townhome, multi-family, land, commercial) based on context — a generic "house" usually means single-family unless the conversation suggests otherwise (e.g. they mention it has multiple units, or shares walls). If you genuinely cannot tell, use unknown rather than guessing.',
  inputSchema,
  execute: async (input, context) => {
    // Filter out null/undefined values — Groq sends null for fields it
    // doesn't have info on, but we shouldn't overwrite existing DB values
    // with null just because this particular message didn't mention them.
    const cleanedInput = Object.fromEntries(
      Object.entries(input).filter(([_, value]) => value !== null && value !== undefined)
    )

    const updated = await updateLeadProfile(context.databaseUrl, context.business.id, context.leadId, cleanedInput)

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