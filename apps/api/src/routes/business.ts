import { Hono } from 'hono'
import { tenantMiddleware } from '../middleware/tenant'
import { createBusiness, updateBusiness, sanitizeBusiness } from '../services/business'
import {
  businessConfigCreateSchema,
  businessConfigUpdateSchema
} from '@qulify/shared'
import type { Business } from '../db/schema'

type Env = {
  Bindings: {
    DATABASE_URL: string
  }
  Variables: {
    business: Business
  }
}

const businessRoutes = new Hono<Env>()

businessRoutes.post('/', async (c) => {
  try {
    const rawBody = await c.req.json()
    const parseResult = businessConfigCreateSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return c.json(
        { success: false, error: 'Invalid request', details: parseResult.error.flatten() },
        400
      )
    }

    const { business: created, apiKey } = await createBusiness(c.env.DATABASE_URL, parseResult.data)

    // apiKey is shown here ONLY ONCE — it is never retrievable again after this response
    return c.json({ success: true, business: sanitizeBusiness(created), apiKey })

  } catch (error) {
    console.error('[business/create] Error:', error)
    return c.json({ success: false, error: 'Failed to create business' }, 500)
  }
})

businessRoutes.get('/', tenantMiddleware, async (c) => {
  const currentBusiness = c.get('business')
  return c.json({ success: true, business: sanitizeBusiness(currentBusiness) })
})

businessRoutes.patch('/', tenantMiddleware, async (c) => {
  try {
    const currentBusiness = c.get('business')
    const rawBody = await c.req.json()
    const parseResult = businessConfigUpdateSchema.safeParse(rawBody)

    if (!parseResult.success) {
      return c.json(
        { success: false, error: 'Invalid request', details: parseResult.error.flatten() },
        400
      )
    }

    const updated = await updateBusiness(c.env.DATABASE_URL, currentBusiness.id, parseResult.data)

    return c.json({ success: true, business: sanitizeBusiness(updated) })

  } catch (error) {
    console.error('[business/update] Error:', error)
    return c.json({ success: false, error: 'Failed to update business' }, 500)
  }
})

export default businessRoutes