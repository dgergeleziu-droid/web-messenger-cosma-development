import { drizzle } from 'drizzle-orm/node-postgres'
import pg, { Pool } from 'pg'
import * as schema from './schema'

// Columns are `timestamp without time zone` filled by now() (UTC on Neon).
// Read and write them as UTC regardless of the server's TZ.
pg.types.setTypeParser(1114, (value: string) => new Date(value.replace(' ', 'T') + 'Z'))
pg.defaults.parseInputDatesAsUTC = true

const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 5 })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

export const db = drizzle(pool, { schema })
