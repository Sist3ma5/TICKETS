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
        <div className="flex flex-col items-center gap-2 px-2 py-4">
          {/*
            Marca dibujada, no imagen: un PNG aquí dependía del optimizador de
            Next, y este va por el archivo sin cookie de sesión, así que el
            middleware lo mandaba al login y la imagen salía rota.
          */}
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#ea580c] shadow-lg shadow-[#ea580c]/30">
            <Ticket className="size-7 text-white" aria-hidden />
          </div>
          <div className="space-y-0.5 text-center">
            <p className="text-sm leading-none font-semibold">Bailmex</p>
            <p className="text-muted-foreground text-[10px] font-medium tracking-[0.2em] uppercase">
              Soporte interno
            </p>
          </div>
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
