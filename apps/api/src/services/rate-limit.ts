const RATE_LIMIT_MAX = 20 // max messages allowed
const RATE_LIMIT_WINDOW_SECONDS = 60 // per this many seconds

/**
 * Checks and increments a per-conversation message counter in KV.
 * Scoped by conversationId (not businessId) so that many different
 * visitors chatting with the same business widget each get their own
 * independent limit — one visitor spamming doesn't block anyone else.
 * Returns true if the request should be allowed, false if the limit
 * has been exceeded.
 */
export const checkRateLimit = async (
  kv: KVNamespace,
  conversationId: string
): Promise<boolean> => {
  const key = `ratelimit:${conversationId}`

  const current = await kv.get(key)
  const count = current ? parseInt(current, 10) : 0

  if (count >= RATE_LIMIT_MAX) {
    return false
  }

  await kv.put(key, String(count + 1), {
    expirationTtl: RATE_LIMIT_WINDOW_SECONDS
  })

  return true
}