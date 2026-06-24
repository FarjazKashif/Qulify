// apps/api/src/middleware/tenant.ts
import { HTTPException } from 'hono/http-exception'
import { createMiddleware } from 'hono/factory'
import { createDb } from '../db'
import { businesses } from '../db/schema'
import { eq } from 'drizzle-orm'
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
 * Middleware to validate the business_id from the request header
 * and attach the verified business config to the Hono context.
 * Every route behind this middleware is tenant-scoped automatically.
 */
export const tenantMiddleware = createMiddleware<Env>(async (c, next) => {
  const businessId = c.req.header('x-business-id')

  if (!businessId) {
    throw new HTTPException(401, { message: 'Missing business ID' })
  }

  // Create DB instance using the Workers environment variable
  const db = createDb(c.env.DATABASE_URL)

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!business) {
    throw new HTTPException(401, { message: 'Invalid business ID' })
  }

  // Attach verified business to context for use in all route handlers
  c.set('business', business)

  await next()
})