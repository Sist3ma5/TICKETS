import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ITLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user || (user.role !== 'it' && user.role !== 'admin')) {
    redirect('/tickets')
  }

  return <>{children}</>
}
