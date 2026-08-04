'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { User } from '@/lib/db/schema'
import { BarChart3, Shield, Ticket, Tickets } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { UserMenu } from './user-menu'

const itItems = [
  { title: 'Estadísticas', href: '/stats', icon: BarChart3 },
  { title: 'Tickets', href: '/tickets/all', icon: Tickets },
  { title: 'Mis tickets', href: '/tickets', icon: Ticket },
]

const adminItems = [
  ...itItems,
  { title: 'Administración', href: '/admin', icon: Shield },
]

const userItems = [{ title: 'Tickets', href: '/tickets', icon: Ticket }]

function navItems(role: User['role']) {
  if (role === 'admin') return adminItems
  if (role === 'it') return itItems
  return userItems
}

function getIsActive(pathname: string, href: string): boolean {
  if (href === '/tickets') {
    return (
      pathname === '/tickets' ||
      (pathname.startsWith('/tickets/') && !pathname.startsWith('/tickets/all'))
    )
  }
  if (href === '/tickets/all') {
    return pathname.startsWith('/tickets/all')
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname()
  const items = navItems(user.role)

  // ── Huevo de pascua ──────────────────────────────────────────────────────
  // A los 7 clics la placa se desprende y cae, dejando el hueco. Es puro
  // adorno: no guarda nada y vuelve a su lugar al recargar.
  const GOLPES_PARA_TUMBARLO = 7
  const [golpes, setGolpes] = useState(0)
  const [cayendo, setCayendo] = useState(false)
  const [cayo, setCayo] = useState(false)

  function golpearLogo() {
    if (cayendo || cayo) return

    const nuevos = golpes + 1
    setGolpes(nuevos)
    if (nuevos < GOLPES_PARA_TUMBARLO) return

    setCayendo(true)
    // Se espera a que termine la caída antes de destapar el hueco.
    window.setTimeout(() => {
      setCayendo(false)
      setCayo(true)
    }, 1500)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col items-center gap-2.5 px-2 py-4">
          {/*
            Placa de marca en el mismo degradado azul del icono de pestaña
            (app/icon.svg), con el logotipo en blanco encima.

            El PNG es negro sobre fondo blanco opaco, así que se invierte
            (negro → blanco) y con `screen` el fondo —ya invertido a negro— se
            funde con el degradado y desaparece. Queda el logo en blanco sin
            necesidad de una versión recortada del archivo.
          */}
          {/*
            El contenedor conserva el alto aunque la placa caiga: si no, todo
            el menú brincaría hacia arriba en plena animación.
          */}
          <div
            className={cn(
              'relative w-full rounded-xl',
              cayo && 'logo-hueco min-h-16',
            )}
          >
            <button
              type="button"
              onClick={golpearLogo}
              aria-label="Bailmex"
              className={cn(
                'block w-full rounded-xl bg-linear-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] px-4 py-3.5 shadow-lg shadow-[#1d4ed8]/30 transition-transform',
                golpes > 0 && !cayendo && 'scale-[0.97]',
                cayendo && 'logo-cae',
                cayo && 'hidden',
              )}
            >
              <Image
                src="/logo.png"
                alt="Bailmex"
                width={738}
                height={414}
                priority
                className="h-auto w-full mix-blend-screen invert"
              />
            </button>
          </div>
          {/* Tira de led: riel casi invisible con una luz que lo recorre. */}
          <div
            aria-hidden
            className="relative h-px w-full overflow-hidden rounded-full bg-white/10"
          >
            <span className="led-luz absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white to-transparent shadow-[0_0_6px_1px_rgba(255,255,255,0.5)]" />
          </div>

          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.2em] uppercase">
            Soporte interno
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={getIsActive(pathname, item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
