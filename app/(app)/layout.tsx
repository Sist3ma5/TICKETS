import { AppSidebar } from '@/components/shared/app-sidebar'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

// La app es 100% autenticada y con datos en vivo: nada se pre-renderiza en build.
export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="bg-transparent">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            {/* Naranja: acento de "usuario" sobre el azul de la marca. */}
            <span className="flex size-8 items-center justify-center rounded-full bg-[#ea580c] text-xs font-semibold text-white">
              {(user.name ?? user.email)
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          </div>
        </header>
        {/* Menos aire en celular: 24px por lado se comen la pantalla. */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
      {modal}
    </SidebarProvider>
  )
}
