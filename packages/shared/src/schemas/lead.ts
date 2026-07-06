import { z } from "zod";
import { businessIdSchema, nonEmptyStringSchema, isoDateTimeSchema } from "./common";

/** Mirrors LeadIntent in lead.ts */
export const leadIntentSchema = z.enum(["buy", "sell", "rent"]);

/** Mirrors LeadScore in lead.ts */
export const leadScoreSchema = z.enum(["hot", "warm", "cold"]);

/** Mirrors LeadStatus in lead.ts */
export const leadStatusSchema = z.enum(["new", "contacted", "qualified", "closed"]);

/** Mirrors PropertyType in lead.ts */
export const propertyTypeSchema = z.enum([
  "single-family",
  "condo",
  "townhome",
  "multi-family",
  "land",
  "commercial",
  "unknown",
]);

/** Mirrors Timeline in lead.ts */
export const timelineSchema = z.enum([
  "this-week",
  "this-month",
  "three-months",
  "six-months-plus",
  "just-browsing",
  "unknown",
]);

/**
 * Validates a LeadProfile — typically produced by GPT-4o-mini's async
 * scoring step parsing freeform visitor chat into structured data.
 *
 * Contact fields (phone, email) are intentionally loose here rather than
 * strict e164/email format: this is AI-extracted data from conversational
 * text, and it may not already be clean (e.g. "call me at 555-1234").
 * Rejecting the whole lead over one messy contact field would lose real
 * leads. Strict format is enforced later, only where it's actually needed
 * (e.g. right before dispatching a WhatsApp message).
 */
export const leadProfileSchema = z.object({
  businessId: businessIdSchema,
  name: nonEmptyStringSchema(100).optional(),
  phone: nonEmptyStringSchema(30).optional(),
  email: nonEmptyStringSchema(150).optional(),
  intent: leadIntentSchema.optional(),
  budgetRange: nonEmptyStringSchema(100).optional(),
  locationPreference: nonEmptyStringSchema(200).optional(),
  propertyType: propertyTypeSchema.optional(),
  timeline: timelineSchema.optional(),
});

/**
 * Validates a fully qualified lead record — a LeadProfile plus scoring
 * output. score and scoreReason come from the AI scoring step, so this
 * is the same "AI JSON response" trust boundary as leadProfileSchema,
 * just after scoring has been applied.
 */
export const qualifiedLeadSchema = leadProfileSchema.extend({
  id: z.string().uuid("Lead ID must be a valid UUID"),
  score: leadScoreSchema,
  scoreReason: nonEmptyStringSchema(500),
  status: leadStatusSchema,
  createdAt: isoDateTimeSchema,
});

/**
 * Validates the raw JSON response from GPT-4o-mini's lead scoring call.
 * This is an AI JSON response trust boundary, same category as
 * leadProfileSchema — but unlike lead capture (where partial data is
 * still useful), a malformed scoring result has no safe partial use,
 * so on failure the caller should fall back to a default score rather
 * than write unvalidated data to the DB.
 */
export const scoringResultSchema = z.object({
  score: leadScoreSchema,
  reason: nonEmptyStringSchema(500),
});

/**
 * Validates the PATCH /leads/:id/status request body. Deliberately
 * scoped to status only — score stays AI-owned via scoreLead, and
 * broader edits (contact info corrections, manual score override)
 * are a separate future concern, not bundled into this endpoint.
 */
export const leadStatusUpdateSchema = z.object({
  status: leadStatusSchema,
});

export type LeadStatusUpdateInput = z.infer<typeof leadStatusUpdateSchema>;
export type ScoringResultInput = z.infer<typeof scoringResultSchema>;
export type LeadProfileInput = z.infer<typeof leadProfileSchema>;
export type QualifiedLeadInput = z.infer<typeof qualifiedLeadSchema>;