// apps/api/src/db/seed.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import * as dotenv from 'dotenv'

dotenv.config()

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

/**
 * Seeds a test business into the database for local development.
 * Run with: pnpm db:seed
 */
async function seed() {
  console.log('Seeding test business...')

  await db.insert(schema.businesses).values({
    id: 'test-business',
    name: 'Austin Realty Group',
    serviceAreas: ['Austin', 'Round Rock', 'Cedar Park', 'Georgetown'],
    priceMin: 200000,
    priceMax: 800000,
    agentName: 'John Smith',
    agentWhatsapp: '+15551234567',
    agentEmail: 'john@austinrealty.com',
    widgetConfig: {
      primaryColor: '#2563eb',
      welcomeMessage: 'Hi! Looking to buy or sell in Austin?',
      assistantName: 'Qulify'
    }
  }).onConflictDoNothing()

  console.log('Done! Test business seeded.')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})