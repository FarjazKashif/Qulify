import { z } from 'zod'
import type { Tool } from './types'

const inputSchema = z.object({}) // no input needed — just returns static hours

/**
 * Returns the business's operating hours. Currently static/hardcoded —
 * a future version could pull this from a businessHours field on the
 * business config if agents need custom hours per business.
 */
export const businessHoursTool: Tool<z.infer<typeof inputSchema>> = {
  name: 'get_business_hours',
  description: 'Returns the business hours when a visitor asks when the business is open, available, or when someone can reach them.',
  inputSchema,
  execute: async (_input, context) => {
    return {
      success: true,
      data: {
        hours: 'Monday to Friday, 9 AM to 6 PM',
        timezone: 'Central Time'
      },
      message: `${context.business.name} is open Monday to Friday, 9 AM to 6 PM Central Time.`
    }
  }
}