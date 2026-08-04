'use client'

import { LogOut, Volume2, VolumeX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { ROLE_LABELS } from '@/lib/constants'
import { authClient } from '@/lib/auth-client'
import { avatarColor, avatarIniciales } from '@/lib/avatar-color'
import {
  activarSonido,
  playSound,
  sonidoActivado,
  sonidoActivadoServidor,
  suscribirSonido,
} from '@/lib/sounds'
import type { UserRole } from '@/lib/db/schema'

interface UserMenuProps {
  user: {
    name: string | null
    email: string
    image?: string | null
    role?: UserRole
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()

  // La preferencia vive en localStorage, que React no observa. Con
  // useSyncExternalStore se lee sin efectos que sincronicen estado y sin
  // desajuste al hidratar: en el servidor se asume activado.
  const sonido = useSyncExternalStore(
    suscribirSonido,
    sonidoActivado,
    sonidoActivadoServidor,
  )

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push('/login'),
      },
    })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback
                  className="rounded-lg font-semibold text-white"
                  style={{ backgroundColor: avatarColor(user.email) }}
                >
                  {avatarIniciales(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.role ? ROLE_LABELS[user.role] : user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="font-medium">{user.name ?? user.email}</span>
                <span className="text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Preferencias de la cuenta. Viven aquí porque este menú es
                ahora el único lugar del usuario: el avatar de la esquina
                superior se quitó para no tener dos. */}
            <DropdownMenuItem
              onClick={(e) => {
                // Sin esto el menú se cierra y no alcanza a oírse el tono
                // de prueba que confirma el cambio.
                e.preventDefault()
                const nuevo = !sonido
                activarSonido(nuevo)
                if (nuevo) playSound('comentario')
              }}
              className="cursor-pointer gap-2"
            >
              {sonido ? (
                <Volume2 className="size-4" />
              ) : (
                <VolumeX className="text-muted-foreground size-4" />
              )}
              Sonidos
              <span className="text-muted-foreground ml-auto text-xs">
                {sonido ? 'Activados' : 'Apagados'}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}