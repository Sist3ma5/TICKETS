/**
 * Efectos de sonido de la aplicación.
 *
 * Son archivos reales en /public/sounds. Se cargan en cuanto se necesitan por
 * primera vez y se quedan en caché: el de crear ticket pesa 845 KB, así que
 * traerlo de entrada, para alguien que quizá no cree ninguno, sería regalar
 * ancho de banda —sobre todo en celular.
 */

export type Sonido = 'entrada' | 'comentario' | 'ticket'

const ARCHIVOS: Record<Sonido, string> = {
  entrada: '/sounds/entrada.mp3',
  comentario: '/sounds/comentario.wav',
  ticket: '/sounds/ticket.wav',
}

/** Volumen por sonido. El de entrada es un acorde largo y se siente fuerte. */
const VOLUMEN: Record<Sonido, number> = {
  entrada: 0.35,
  comentario: 0.55,
  ticket: 0.5,
}

const PREFERENCIA = 'bailmex-sonido'

// ── Preferencia del usuario ───────────────────────────────────────────────

export function sonidoActivado(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PREFERENCIA) !== 'off'
}

/** Valor en el servidor: ahí no hay localStorage, se asume activado. */
export function sonidoActivadoServidor(): boolean {
  return true
}

const oyentes = new Set<() => void>()

export function suscribirSonido(cb: () => void): () => void {
  oyentes.add(cb)
  return () => {
    oyentes.delete(cb)
  }
}

export function activarSonido(activado: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREFERENCIA, activado ? 'on' : 'off')
  for (const cb of oyentes) cb()
}

// ── Reproducción ──────────────────────────────────────────────────────────

const cache = new Map<Sonido, HTMLAudioElement>()

function obtener(sonido: Sonido): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  let audio = cache.get(sonido)
  if (!audio) {
    audio = new Audio(ARCHIVOS[sonido])
    audio.preload = 'auto'
    audio.volume = VOLUMEN[sonido]
    cache.set(sonido, audio)
  }
  return audio
}

/**
 * Reproduce un efecto. Devuelve si logró sonar.
 *
 * Nunca lanza. Los navegadores bloquean el audio hasta que la persona
 * interactúa con la página, así que `play()` puede ser rechazado; en ese caso
 * simplemente no suena y la acción que lo disparó sigue su curso.
 */
export async function playSound(sonido: Sonido): Promise<boolean> {
  if (!sonidoActivado()) return false

  const audio = obtener(sonido)
  if (!audio) return false

  try {
    // Se reinicia para que dos acciones seguidas suenen las dos, en vez de
    // que la segunda se ignore porque la primera sigue reproduciéndose.
    audio.currentTime = 0
    await audio.play()
    return true
  } catch {
    return false
  }
}

/**
 * Deja el archivo listo en caché sin reproducirlo.
 *
 * Se usa para el sonido de comentario: así el primer envío suena al
 * instante en vez de esperar la descarga.
 */
export function precargarSonido(sonido: Sonido) {
  obtener(sonido)
}
