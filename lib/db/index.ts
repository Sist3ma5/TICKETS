import { env } from '@/lib/env'
import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

type RealDB = NeonHttpDatabase<typeof schema>

let cachedDb: RealDB | null = null

function getDatabaseUrl() {
	const url = env.DATABASE_URL?.trim()

	if (!url) {
		throw new Error('Falta DATABASE_URL en el entorno.')
	}

	try {
		new URL(url)
	} catch {
		throw new Error(
			`DATABASE_URL no es una URL válida: ${url}. Revisa el valor en Vercel.`,
		)
	}

	return url
}

function getDb(): RealDB {
	if (!cachedDb) {
		const sql = neon(getDatabaseUrl())
		cachedDb = drizzle(sql, { schema })
	}

	return cachedDb
}

export const db = new Proxy({} as RealDB, {
	get(_target, prop, receiver) {
		const realDb = getDb()
		const value = Reflect.get(realDb as object, prop, receiver)

		return typeof value === 'function' ? value.bind(realDb) : value
	},
}) as RealDB

export type DB = RealDB
