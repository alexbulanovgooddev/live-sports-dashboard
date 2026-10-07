import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '../schema/index.ts'

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not defined')
}

export const pool = new pg.Pool({
	connectionString: process.env.DATABASE_URL
})

// без обработчика обрыв простаивающего соединения роняет процесс
pool.on('error', err => {
	console.error('Unexpected error on idle Postgres client', err)
})

export const db = drizzle(pool, { schema })
