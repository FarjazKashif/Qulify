import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { businesses } from '../db/schema'
import type { Business } from '../db/schema'
import type { BusinessConfigCreateInput, BusinessConfigUpdateInput } from '@qulify/shared'

/**
 * Creates a new business record. Generates the ID in application code
 * since the businesses.id column has no DB-side default — see schema.ts.
 * Uses the Web Crypto API (crypto.randomUUID), available natively as a
 * global in Cloudflare Workers, no Node import needed.
 */
export const createBusiness = async (
  databaseUrl: string,
  input: BusinessConfigCreateInput
): Promise<Business> => {
  const db = createDb(databaseUrl)

  const [business] = await db
    .insert(businesses)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      serviceAreas: input.serviceAreas,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      agentName: input.agentName,
      agentWhatsapp: input.agentWhatsapp,
      agentEmail: input.agentEmail,
      widgetConfig: input.widgetConfig
    })
    .returning()

  return business
}

/**
 * Updates an existing business record with partial fields.
 * Only fields present in the input are updated — Drizzle's .set()
 * ignores undefined keys, matching the "partial update" semantics
 * of businessConfigUpdateSchema.
 */
export const updateBusiness = async (
  databaseUrl: string,
  businessId: string,
  input: BusinessConfigUpdateInput
): Promise<Business> => {
  const db = createDb(databaseUrl)

  const [business] = await db
    .update(businesses)
    .set(input)
    .where(eq(businesses.id, businessId))
    .returning()

  return business
}