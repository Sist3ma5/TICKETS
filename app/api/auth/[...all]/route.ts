import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/auth'

// Endpoint de sesión: siempre en vivo y en Node. No debe intentar
// optimizarse durante el build ni correr en Edge, porque en cada petición
// abre conexión a la base y lee cookies.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const { GET, POST } = toNextJsHandler(auth)