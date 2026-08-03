import { createAuthClient } from 'better-auth/client'

/**
 * Cliente de sesión para el navegador.
 *
 * A propósito NO se le fija `baseURL`: la API de sesión vive en esta misma
 * aplicación, así que el valor correcto siempre es el origen desde el que se
 * cargó la página, y eso es justo lo que usa por defecto.
 *
 * Antes tomaba `NEXT_PUBLIC_BETTER_AUTH_URL`, que se incrusta al compilar. Si
 * ese valor quedaba mal —la URL con un typo, o `localhost` en producción— el
 * botón de "Continuar con Google" mandaba la petición a un servidor que no
 * existe y fallaba en silencio. Al no fijarlo, ese error ya no es posible.
 */
export const authClient = createAuthClient()