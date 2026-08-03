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
          <div className="w-full rounded-xl bg-linear-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#3b82f6] px-4 py-3.5 shadow-lg shadow-[#1d4ed8]/30">
            <Image
              src="/logo.png"
              alt="Bailmex"
              width={738}
              height={414}
              priority
              className="h-auto w-full mix-blend-screen invert"
            />
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
