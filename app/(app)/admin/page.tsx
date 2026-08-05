import { Mail, Shield } from 'lucide-react'

import { CategoriesManager } from '@/components/admin/categories-manager'
import { getCategoriesMeta } from '@/lib/db/queries/categories'
import { CategoryRouting } from '@/components/admin/category-routing'
import { UsersManager } from '@/components/admin/users-manager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { requireAdminUser } from '@/lib/auth'
import {
  CATEGORY_COLORS,
  CATEGORY_PREFIXES,
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
} from '@/lib/constants'
import { getAllUsersForAdmin } from '@/lib/db/queries/tickets'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  await requireAdminUser()

  const users = await getAllUsersForAdmin()

  // Del catálogo en la base, no de la lista fija: si no, una categoría
  // retirada seguiría apareciendo aquí.
  const categories = (await getCategoriesMeta()).map((c) => ({
    key: c.key,
    label: c.label,
    prefix: c.prefix,
    color: c.color,
    active: c.active,
  }))

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-primary flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase">
          <Shield className="size-3.5" />
          Administración
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de admin</h1>
        <p className="text-muted-foreground text-sm">
          Gestiona los roles del equipo, quién atiende cada categoría y el
          catálogo de categorías.
        </p>
      </header>

      {/* Aviso de enrutamiento por categoría + correo */}
      <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-4">
        <Mail className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Enrutamiento automático por categoría</p>
          <p className="text-muted-foreground">
            Cuando se crea un ticket, se asigna al técnico responsable de esa
            categoría y se le envía un correo de aviso (mismo mecanismo que el
            cambio de estado). El correo requiere Resend + base de datos
            conectados.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="routing">Asignaciones</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Asigna el rol de cada persona y, a los de IT, las categorías que
            atienden.
          </p>
          <UsersManager users={users} />
        </TabsContent>

        <TabsContent value="routing" className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Define qué técnico recibe automáticamente los tickets de cada
            categoría.
          </p>
          <CategoryRouting
            itUsers={users.filter(
              (u) => u.role === 'it' || u.role === 'admin',
            )}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-3">
          <p className="text-muted-foreground text-sm">
            Agrega, edita o quita categorías del catálogo.
          </p>
          <CategoriesManager categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
