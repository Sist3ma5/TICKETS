import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth']

export function proxy(request: NextRequest) {
  // ⚠️ Solo desarrollo: sin sesión requerida. NUNCA se activa en producción.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_BYPASS_AUTH === 'true'
  ) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // Rutas públicas y archivos estáticos pasan siempre
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ??
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}