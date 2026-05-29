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
import { BarChart3, Ticket, Tickets } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './user-menu'
import Image from 'next/image'

const itItems = [
  { title: 'Stats', href: '/stats', icon: BarChart3 },
  { title: 'Tickets', href: '/tickets/all', icon: Tickets },
  { title: 'Mis tickets', href: '/tickets', icon: Ticket },
]

const userItems = [{ title: 'Tickets', href: '/tickets', icon: Ticket }]

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
  const items = user.role === 'it' ? itItems : userItems

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-center py-2">
          <Image src='/bail-logo.svg' alt='Logo' width={120} height={40} className="w-full max-w-44 h-auto" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={getIsActive(pathname, item.href)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
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
