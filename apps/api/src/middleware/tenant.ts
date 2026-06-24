import { HTTPException } from 'hono/http-exception';
import { Context } from 'hono';
import { db } from '../db';
import { businesses } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Middleware to validate the business_id from the request header and attach the business config to the context.
 * Expects the business_id in the 'x-business-id' header.
 */
export const tenantMiddleware = async (c: Context, next: () => Promise<void>) => {
  const businessId = c.req.header('x-business-id');
  if (!businessId) {
    throw new HTTPException(401, { message: 'Missing business ID' });
  }

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) {
    throw new HTTPException(401, { message: 'Invalid business ID' });
  }

  // Attach the business to the context for use in handlers
  c.set('business', business);

  await next();
};