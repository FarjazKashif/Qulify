import { z } from "zod";

/**
 * Validates a business identifier.
 * Assumes IDs are generated as UUIDs at the database layer (Postgres `gen_random_uuid()`
 * or Drizzle's `uuid()` column type). If IDs ever switch to a different format
 * (e.g. slugs), update this schema — it is the single source of truth for BusinessId shape.
 */
export const businessIdSchema = z.string().uuid("Business ID must be a valid UUID");

/**
 * Validates an email address.
 * Used for agentEmail and any future user-facing email fields.
 */
export const emailSchema = z.string().email("Must be a valid email address");

/**
 * Validates a phone number in E.164 format (e.g. +14155551234).
 *
 * WHY E.164 now, even though WhatsApp integration (Phase 2) isn't built yet:
 * normalizing phone format at the trust boundary today avoids a painful data
 * migration later when the WhatsApp Cloud API requires this format anyway.
 * If onboarding UI collects loose input, normalize it to E.164 before it
 * reaches this schema.
 */
export const e164PhoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, "Phone must be in E.164 format (e.g. +14155551234)");

/**
 * Validates a hex color string (e.g. #1A2B3C).
 * Used for widget branding fields like primaryColor.
 */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-digit hex color (e.g. #1A2B3C)");

/**
 * Validates a non-empty trimmed string with a max length.
 * Use this instead of a bare z.string() for any user-facing text field
 * (names, messages, labels) to guard against empty submissions and
 * unbounded payload sizes hitting the database.
 */
export const nonEmptyStringSchema = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, "Field cannot be empty")
    .max(maxLength, `Field cannot exceed ${maxLength} characters`);

/**
 * Validates an ISO 8601 datetime string.
 * Used for createdAt/updatedAt style timestamp fields stored as strings.
 */
export const isoDateTimeSchema = z.string().datetime({
  message: "Must be a valid ISO 8601 datetime string",
});