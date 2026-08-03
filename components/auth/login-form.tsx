'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/tickets'
  const error = searchParams.get('error')
  const [isPending, setIsPending] = useState(false)

  async function handleSignIn() {
    setIsPending(true)
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: callbackUrl,
        errorCallbackURL: '/login?error=unauthorized',
      })

      // Si no hubo redirección, algo falló: hay que decirlo. Antes el error
      // se tragaba en silencio y el botón parecía no hacer nada.
      if (result?.error) {
        console.error('[login] Better Auth devolvió error:', result.error)
        toast.error(
          result.error.message ?? 'No se pudo iniciar sesión con Google.',
        )
        setIsPending(false)
      }
    } catch (err) {
      console.error('[login] No se pudo contactar al servidor:', err)
      toast.error(
        'No se pudo contactar al servidor. Revisa tu conexión e intenta de nuevo.',
      )
      setIsPending(false)
    }
  }

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-10">
      {/* Logo + título */}
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Bailmex IT Tickets
          </h1>
          <p className="text-sm text-muted-foreground">
            Accede con tu cuenta corporativa
          </p>
        </div>
      </div>

      {/* Acción */}
      <div className="w-full space-y-3">
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error === 'unauthorized'
              ? 'Solo cuentas @bailmex.com.mx pueden acceder.'
              : 'Ocurrió un error. Intenta de nuevo.'}
          </p>
        )}
        <Button
          onClick={handleSignIn}
          disabled={isPending}
          variant="outline"
          className="w-full gap-3"
          size="lg"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          {isPending ? 'Redirigiendo a Google...' : 'Continuar con Google'}
        </Button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}