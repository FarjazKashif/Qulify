import { z } from "zod";
import { leadProfileSchema } from "./lead";

/** Mirrors QualificationStep in qualification.ts */
export const qualificationStepSchema = z.enum([
  "intent",
  "property-location",
  "budget",
  "timeline",
  "contact",
  "complete",
  "closed",
]);

/**
 * Constrains missingFields to actual LeadProfile keys rather than
 * arbitrary strings. This is internal conversation state, not free text
 * from a user, so there's no cost to being strict — it catches a typo'd
 * field name (e.g. "emial") instead of silently letting it through.
 */
const leadProfileFieldSchema = z.enum([
  "name",
  "phone",
  "email",
  "intent",
  "budgetRange",
  "locationPreference",
  "propertyType",
  "timeline",
]);

/**
 * Validates the in-progress qualification state tracked per conversation.
 * Mirrors QualificationState in qualification.ts.
 */
export const qualificationStateSchema = z.object({
  currentStep: qualificationStepSchema,
  leadProfile: leadProfileSchema,
  missingFields: z.array(leadProfileFieldSchema),
  isServiceMatch: z.boolean(),
  isPriceMatch: z.boolean(),
});

export type QualificationStateInput = z.infer<typeof qualificationStateSchema>;