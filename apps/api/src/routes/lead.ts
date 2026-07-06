import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/tenant'
import { getLeads, getLeadById, updateLeadStatus } from '../services/lead'
import { leadStatusUpdateSchema } from '@qulify/shared'
import type { Business } from '../db/schema'

type Env = {
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    business: Business
  }
}

const leadRoutes = new Hono<Env>()

// All lead routes require a verified business — no lead data is ever
// accessible without proving which tenant is asking.
leadRoutes.use('*', tenantMiddleware)

/**
 * GET /leads
 * Returns all leads for the current business. No pagination/filtering
 * yet — deferred until real lead volume makes it necessary.
 */
leadRoutes.get('/', async (c) => {
  try {
    const business = c.get('business')
    const results = await getLeads(c.env.DATABASE_URL, business.id)

    return c.json({ success: true, leads: results })

  } catch (error) {
    console.error('[leads/list] Error:', error)
    return c.json({ success: false, error: 'Failed to fetch leads' }, 500)
  }
})

/**
 * GET /leads/:id
 * Returns a single lead, scoped to the current business so one tenant
 * can never fetch another tenant's lead by guessing an ID.
 */
leadRoutes.get('/:id', async (c) => {
  try {
    const business = c.get('business')
    const leadId = c.req.param('id')

    const lead = await getLeadById(c.env.DATABASE_URL, business.id, leadId)

    if (!lead) {
      return c.json({ success: false, error: 'Lead not found' }, 404)
    }

    return c.json({ success: true, lead })

  } catch (error) {
    console.error('[leads/get] Error:', error)
    return c.json({ success: false, error: 'Failed to fetch lead' }, 500)
  }
})

/**
 * PATCH /leads/:id/status
 * Updates only the status field of a lead (new/contacted/qualified/closed).
 * Deliberately scoped to status only — see leadStatusUpdateSchema.
 */
leadRoutes.patch('/:id/status', async (c) => {
  try {
    const business = c.get('business')
    const leadId = c.req.param('id')

    const rawBody = await c.req.json()
    const parseResult = leadStatusUpdateSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return c.json(
        { success: false, error: 'Invalid request', details: parseResult.error.flatten() },
        400
      )
    }

    const updated = await updateLeadStatus(c.env.DATABASE_URL, business.id, leadId, parseResult.data)

    if (!updated) {
      return c.json({ success: false, error: 'Lead not found' }, 404)
    }

    return c.json({ success: true, lead: updated })

  } catch (error) {
    console.error('[leads/update-status] Error:', error)
    return c.json({ success: false, error: 'Failed to update lead status' }, 500)
  }
})

export default leadRoutes