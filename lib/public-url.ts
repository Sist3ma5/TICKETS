/**
 * URL pública de la aplicación.
 *
 * De aquí salen dos cosas que tienen que apuntar al servidor real: el
 * `redirect_uri` que se le manda a Google al iniciar sesión, y los enlaces
 * de los correos de aviso.
 *
 * Se resuelve en este orden:
 *   1. `BETTER_AUTH_URL`, salvo que apunte a localhost estando en producción.
 *   2. `RENDER_EXTERNAL_URL`, que Render publica sola con la URL del servicio.
 *
 * El caso de localhost no es hipotético: al copiar el `.env.local` al
 * servidor se sube `http://localhost:3000`, y entonces Google recibe
 * `http://localhost:3000/api/auth/callback/google` y responde
 * `redirect_uri_mismatch`. Como una URL de localhost jamás es correcta en
 * producción, conviene descartarla y dejar que gane la real.
 */

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i

export function normalizePublicUrl(
  value: string | undefined,
): string | undefined {
  // Una diagonal sobrante produce `//api/auth/callback/google`, que para
  // Google es otra URL distinta y también rechaza.
  const trimmed = value?.trim().replace(/\/+$/, '')
  if (!trimmed) return undefined

  if (process.env.NODE_ENV === 'production' && LOCALHOST.test(trimmed)) {
    console.warn(
      `[url] Se ignora "${trimmed}" porque apunta a localhost y esto es ` +
        'producción. Define BETTER_AUTH_URL con la URL real del servicio.',
    )
    return undefined
  }

  return trimmed
}

/** Render expone el host pelón en su propia variable; se le antepone https. */
function fromRenderHostname(): string | undefined {
  const host = process.env.RENDER_EXTERNAL_HOSTNAME?.trim()
  return host ? `https://${host}` : undefined
}

export const PUBLIC_URL =
  normalizePublicUrl(process.env.BETTER_AUTH_URL) ??
  normalizePublicUrl(process.env.RENDER_EXTERNAL_URL) ??
  normalizePublicUrl(fromRenderHostname())

// Se anuncia una vez al arrancar: sin esto, diagnosticar un
// redirect_uri_mismatch obliga a adivinar qué URL terminó usando el servidor.
if (process.env.NODE_ENV === 'production') {
  console.log(
    `[url] URL pública en uso: ${PUBLIC_URL ?? '(ninguna — Better Auth la deducirá del servidor, probablemente mal)'}`,
  )
}
