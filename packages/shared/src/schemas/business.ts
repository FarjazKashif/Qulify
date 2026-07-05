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
 * Validates a full BusinessConfig payload.
 * Mirrors the BusinessConfig interface in business.ts.
 *
 * Cross-field refinement: priceMax must be greater than priceMin.
 * This is a structural invariant (an inverted range is nonsensical data,
 * not a business rule), so it's enforced here rather than in a service —
 * every downstream consumer (widget rendering, lead matching, AI prompts)
 * can then trust the range without defensive checks.
 */
export const businessConfigSchema = z
  .object({
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
  })
  .refine((data) => data.priceMax > data.priceMin, {
    message: "priceMax must be greater than priceMin",
    path: ["priceMax"],
  });

export type BusinessConfigInput = z.infer<typeof businessConfigSchema>;