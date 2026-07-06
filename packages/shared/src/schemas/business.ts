import { z } from "zod";
import {
  businessIdSchema,
  e164PhoneSchema,
  emailSchema,
  hexColorSchema,
  isoDateTimeSchema,
  nonEmptyStringSchema,
} from "./common";

/**
 * Validates widget branding config shown on the embedded chat widget.
 * Mirrors the WidgetBranding interface in business.ts.
 */
export const widgetBrandingSchema = z.object({
  primaryColor: hexColorSchema,
  welcomeMessage: nonEmptyStringSchema(200),
  assistantName: nonEmptyStringSchema(50),
});

/**
 * Base object shape for BusinessConfig, with no refinements applied.
 * Kept separate so .omit() can be used on it — Zod does not allow
 * .omit() on a schema that already has a .refine() attached.
 * businessConfigSchema and businessConfigCreateSchema both build on
 * this base and reapply the priceMax > priceMin check independently.
 */
const businessConfigBaseSchema = z.object({
  id: businessIdSchema,
  name: nonEmptyStringSchema(100),
  serviceAreas: z.array(nonEmptyStringSchema(100)).min(1, "At least one service area is required"),
  priceMin: z.number().nonnegative("Price minimum cannot be negative"),
  priceMax: z.number().nonnegative("Price maximum cannot be negative"),
  agentName: nonEmptyStringSchema(100),
  agentWhatsapp: e164PhoneSchema,
  agentEmail: emailSchema,
  widgetConfig: widgetBrandingSchema,
  createdAt: isoDateTimeSchema,
});

/**
 * Validates a full BusinessConfig payload.
 * Mirrors the BusinessConfig interface in business.ts.
 *
 * Cross-field refinement: priceMax must be greater than priceMin.
 * This is a structural invariant (an inverted range is nonsensical data,
 * not a business rule), so it's enforced here rather than in a service —
 * every downstream consumer (widget rendering, lead matching, AI prompts)
 * can then trust the range without defensive checks.
 */
export const businessConfigSchema = businessConfigBaseSchema.refine(
  (data) => data.priceMax > data.priceMin,
  {
    message: "priceMax must be greater than priceMin",
    path: ["priceMax"],
  }
);

/**
 * Validates the POST /business request body — everything needed to
 * create a business except id and createdAt, which the server owns
 * (id is generated via crypto.randomUUID(), createdAt via DB default).
 * Built from businessConfigBaseSchema (not businessConfigSchema) since
 * .omit() cannot be used on an already-refined schema.
 */
export const businessConfigCreateSchema = businessConfigBaseSchema
  .omit({ id: true, createdAt: true })
  .refine((data) => data.priceMax > data.priceMin, {
    message: "priceMax must be greater than priceMin",
    path: ["priceMax"],
  });

/**
 * Validates a partial BusinessConfig update (PATCH). Built by hand rather
 * than businessConfigSchema.partial() for the same reason as above —
 * .partial() cannot be used on a refined schema either. This version
 * reapplies the price check only when both fields are present in the
 * same update — a partial update touching just one price field is fine.
 */
export const businessConfigUpdateSchema = z
  .object({
    name: nonEmptyStringSchema(100).optional(),
    serviceAreas: z.array(nonEmptyStringSchema(100)).min(1).optional(),
    priceMin: z.number().nonnegative("Price minimum cannot be negative").optional(),
    priceMax: z.number().nonnegative("Price maximum cannot be negative").optional(),
    agentName: nonEmptyStringSchema(100).optional(),
    agentWhatsapp: e164PhoneSchema.optional(),
    agentEmail: emailSchema.optional(),
    widgetConfig: widgetBrandingSchema.optional(),
  })
  .refine(
    (data) =>
      data.priceMin === undefined || data.priceMax === undefined || data.priceMax > data.priceMin,
    {
      message: "priceMax must be greater than priceMin",
      path: ["priceMax"],
    }
  );

export type BusinessConfigCreateInput = z.infer<typeof businessConfigCreateSchema>;
export type BusinessConfigUpdateInput = z.infer<typeof businessConfigUpdateSchema>;
export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;