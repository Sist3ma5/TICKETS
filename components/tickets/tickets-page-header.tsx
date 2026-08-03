interface TicketsPageHeaderProps {
  title: string
  action?: React.ReactNode
}

export function TicketsPageHeader({ title, action }: TicketsPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {action}
    </div>
  )
}