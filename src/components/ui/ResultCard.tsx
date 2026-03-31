import clsx from 'clsx'
import StatusBadge from './StatusBadge'

interface ResultCardProps {
  title: string
  status?: 'success' | 'error' | 'warning' | 'info' | 'loading'
  children: React.ReactNode
  className?: string
}

export default function ResultCard({ title, status, children, className }: ResultCardProps) {
  return (
    <div className={clsx('bg-gray-900 border border-gray-800 rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <h3 className="text-sm font-medium text-gray-200">{title}</h3>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
