'use client'

import { useEffect } from 'react'

import { playSound, precargarSonido } from '@/lib/sounds'

/** Marca de sesión: el acorde es de bienvenida, no de cada navegación. */
const YA_SONO = 'bailmex-entrada-sonada'

/**
 * Acorde de bienvenida al entrar a la aplicación.
 *
 * Suena UNA vez por sesión del navegador, no en cada carga. Sin eso se
 * repetiría en cada F5 y acabaría molestando.
 *
 * El detalle fino son las políticas de autoplay: el navegador bloquea el
 * audio hasta que la persona interactúa con la página, y al llegar aquí
 * recién redirigido desde Google no hubo ningún clic todavía. Así que si el
 * intento se rechaza, se deja armado para el primer clic o tecla — y ahí sí
 * suena, un momento después.
 */
export function EntranceSound() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(YA_SONO) === '1') return

    // El de comentario es el que más se usa; se deja listo desde ahora para
    // que el primer envío no espere la descarga.
    precargarSonido('comentario')

    let cancelado = false

    const marcar = () => window.sessionStorage.setItem(YA_SONO, '1')

    const alPrimerGesto = () => {
      if (cancelado) return
      void playSound('entrada')
      marcar()
      quitar()
    }

    const quitar = () => {
      window.removeEventListener('pointerdown', alPrimerGesto)
      window.removeEventListener('keydown', alPrimerGesto)
    }

    void playSound('entrada').then((sono) => {
      if (cancelado) return
      if (sono) {
        marcar()
        return
      }
      // Bloqueado por el navegador: se espera al primer gesto.
      window.addEventListener('pointerdown', alPrimerGesto, { once: true })
      window.addEventListener('keydown', alPrimerGesto, { once: true })
    })

    return () => {
      cancelado = true
      quitar()
    }
  }, [])

  return null
}
