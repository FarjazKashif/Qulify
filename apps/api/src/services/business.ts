import { eq } from 'drizzle-orm'
import { createDb } from '../db'
import { businesses } from '../db/schema'
import type { Business } from '../db/schema'
import type { BusinessConfigCreateInput, BusinessConfigUpdateInput } from '@qulify/shared'

/**
 * Generates a new API key in the format qlfy_<32 hex chars>.
 * The prefix makes keys recognizable in logs, error messages, or
 * accidentally-committed .env files without needing to decode anything.
 */
const generateApiKey = (): string => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  const hex = Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `qlfy_${hex}`
}

/**
 * Removes apiKeyHash before sending business data to a client.
 * The hash itself isn't a security risk (it's not the real key), but
 * there's no reason for a client to ever see it.
 */
export const sanitizeBusiness = (business: Business): Omit<Business, 'apiKeyHash'> => {
  const { apiKeyHash, ...safe } = business
  return safe
}

/**
 * Hashes an API key using SHA-256 via the Web Crypto API (native to
 * Cloudflare Workers, no extra dependency needed). SHA-256 without a
 * slow KDF is acceptable here specifically because API keys are long,
 * high-entropy random strings — unlike passwords, they aren't
 * guessable via brute force at any practical rate.
 */
const hashApiKey = async (key: string): Promise<string> => {
  const encoded = new TextEncoder().encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Creates a new business record along with a freshly generated API key.
 * The plaintext key is returned ONLY here, at creation time — it is
 * never stored or retrievable again, only its hash is kept in the DB.
 * The caller (route handler) is responsible for surfacing the plaintext
 * key to the client exactly once.
 */
export const createBusiness = async (
  databaseUrl: string,
  input: BusinessConfigCreateInput
): Promise<{ business: Business; apiKey: string }> => {
  const db = createDb(databaseUrl)

  const apiKey = generateApiKey()
  const apiKeyHash = await hashApiKey(apiKey)

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
      widgetConfig: input.widgetConfig,
      apiKeyHash
    })
    .returning()

  return { business, apiKey }
}

/**
 * Verifies a plaintext API key against a business's stored hash.
 * Used by tenant middleware on every request to prove the caller
 * actually owns the business they claim to (via x-business-id),
 * not just that the business ID is a real row in the DB.
 */
export const verifyApiKey = async (
  databaseUrl: string,
  businessId: string,
  providedKey: string
): Promise<Business | null> => {
  const db = createDb(databaseUrl)

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!business) return null

  const providedHash = await hashApiKey(providedKey)
  const isValid = providedHash === business.apiKeyHash

  return isValid ? business : null
}

/**
 * Updates an existing business record with partial fields.
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