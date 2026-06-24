// apps/api/src/db/client.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * Creates a Drizzle database instance using Neon's HTTP driver.
 * We use the HTTP driver (not Pool) because Cloudflare Workers
 * don't support persistent TCP connections — HTTP works everywhere.
 */
export const createDb = (databaseUrl: string) => {
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

export type DbInstance = ReturnType<typeof createDb>