import { z } from "zod";

/**
 * Validates all required environment variables/secrets for the API
 * Worker. Catching a missing or malformed secret here, with a clear
 * field-level message, is far better than letting it surface later as
 * a cryptic runtime crash deep inside a service call (e.g.
 * `new OpenAI({ apiKey: undefined })`).
 *
 * Lives in @qulify/shared rather than apps/api to keep a single Zod
 * dependency and a single source of truth across the monorepo,
 * consistent with every other schema in this package.
 */
export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a valid Postgres connection string"),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email address"),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validates raw Worker bindings against envSchema. Throws immediately
 * with a clear, field-level message if anything is missing or malformed,
 * rather than letting a bad/missing secret fail silently until it's
 * used three layers deep in a service call.
 */
export const validateEnv = (rawEnv: Record<string, unknown>): ValidatedEnv => {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const details = JSON.stringify(result.error.flatten().fieldErrors);
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
};