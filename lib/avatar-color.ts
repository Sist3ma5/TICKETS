/**
 * Color del avatar de cada persona, derivado de su correo.
 *
 * Antes todos eran naranja, así que en una lista de comentarios o en el
 * historial todos los círculos se veían igual. Con un color por persona se
 * distingue de un vistazo quién es quién.
 *
 * Se calcula del correo, no al azar ni por posición: el mismo correo da
 * siempre el mismo color, en cualquier pantalla y sin guardarlo en la base.
 * Si dependiera del orden de una lista, la gente cambiaría de color al
 * filtrar, que es justo lo que hay que evitar.
 */

/**
 * Los ocho tonos. Todos validados con texto blanco encima: el más bajo da
 * 4.99:1 y WCAG pide 4.5:1 para texto normal. Si se agrega uno nuevo, hay que
 * medirlo antes — un tono claro dejaría las iniciales ilegibles.
 */
const PALETA = [
  '#1d4ed8', // azul     6.70:1
  '#b91c1c', // rojo     6.47:1
  '#047857', // verde    5.48:1
  '#b45309', // ámbar    5.02:1
  '#6d28d9', // violeta  7.10:1
  '#0e7490', // cian     5.36:1
  '#be185d', // magenta  6.04:1
  '#4d7c0f', // olivo    4.99:1
] as const

/** Color estable para un correo. Siempre el mismo para la misma persona. */
export function avatarColor(email: string | null | undefined): string {
  if (!email) return PALETA[0]

  // Hash sencillo y determinista. No necesita ser criptográfico: solo tiene
  // que repartir parejo y dar siempre el mismo resultado.
  let hash = 0
  const normalizado = email.trim().toLowerCase()
  for (let i = 0; i < normalizado.length; i++) {
    hash = (hash * 31 + normalizado.charCodeAt(i)) >>> 0
  }

  return PALETA[hash % PALETA.length]
}

/** Iniciales para el círculo: dos letras a partir del nombre, o del correo. */
export function avatarIniciales(
  name: string | null | undefined,
  email?: string | null,
): string {
  const limpio = name?.trim()
  if (limpio) {
    return limpio
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase()
  }
  return email?.slice(0, 2).toUpperCase() ?? '??'
}
