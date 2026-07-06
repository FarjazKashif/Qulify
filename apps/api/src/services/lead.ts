import { eq, and } from 'drizzle-orm'
import { createDb } from '../db'
import { leads } from '../db/schema'
import type { LeadStatusUpdateInput } from '@qulify/shared'

/**
 * Returns all leads for a given business. No pagination/filtering yet —
 * added when actual lead volume makes it necessary.
 */
export const getLeads = async (databaseUrl: string, businessId: string) => {
  const db = createDb(databaseUrl)

  return db
    .select()
    .from(leads)
    .where(eq(leads.businessId, businessId))
}

/**
 * Returns a single lead by ID, scoped to the given business so one
 * tenant can never fetch another tenant's lead by guessing an ID.
 */
export const getLeadById = async (databaseUrl: string, businessId: string, leadId: string) => {
  const db = createDb(databaseUrl)

  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.businessId, businessId)))
    .limit(1)

  return lead
}

/**
 * Updates only the status field of a lead, scoped to the given business
 * for the same cross-tenant protection as getLeadById.
 */
export const updateLeadStatus = async (
  databaseUrl: string,
  businessId: string,
  leadId: string,
  input: LeadStatusUpdateInput
) => {
  const db = createDb(databaseUrl)

  const [updated] = await db
    .update(leads)
    .set({ status: input.status })
    .where(and(eq(leads.id, leadId), eq(leads.businessId, businessId)))
    .returning()

  return updated
}