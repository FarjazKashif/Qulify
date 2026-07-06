import { HTTPException } from 'hono/http-exception'
import { createMiddleware } from 'hono/factory'
import { verifyApiKey } from '../services/business'
import type { Business } from '../db/schema'

type Env = {
  Bindings: {
    DATABASE_URL: string
    GROQ_API_KEY: string
  }
  Variables: {
    business: Business
  }
}

/**
 * Validates the business_id AND api_key from request headers.
 * Requiring both proves the caller actually owns the business they
 * claim to — business_id alone is guessable/public, api_key is the
 * actual secret only the real owner has.
 */
export const tenantMiddleware = createMiddleware<Env>(async (c, next) => {
  const businessId = c.req.header('x-business-id')
  const apiKey = c.req.header('x-api-key')

  if (!businessId) {
    throw new HTTPException(401, { message: 'Missing business ID' })
  }

  if (!apiKey) {
    throw new HTTPException(401, { message: 'Missing API key' })
  }

  const business = await verifyApiKey(c.env.DATABASE_URL, businessId, apiKey)

  if (!business) {
    throw new HTTPException(401, { message: 'Invalid business ID or API key' })
  }

  c.set('business', business)
  await next()
})