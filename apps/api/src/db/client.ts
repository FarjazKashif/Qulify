import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a Drizzle instance from a Neon connection pool
export const createDb = (env: Env) => {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool, { schema });
};

// For convenience, we can also export the schema
export * from './schema';