import clsx from 'clsx'

type Status = 'success' | 'error' | 'warning' | 'info' | 'loading'

interface StatusBadgeProps {
  status: Status
  label?: string
}

const statusConfig: Record<Status, { className: string; defaultLabel: string }> = {
  success: { className: 'bg-green-900 text-green-300 border-green-700', defaultLabel: 'Success' },
  error: { className: 'bg-red-900 text-red-300 border-red-700', defaultLabel: 'Error' },
  warning: { className: 'bg-yellow-900 text-yellow-300 border-yellow-700', defaultLabel: 'Warning' },
  info: { className: 'bg-blue-900 text-blue-300 border-blue-700', defaultLabel: 'Info' },
  loading: { className: 'bg-gray-800 text-gray-300 border-gray-600 animate-pulse', defaultLabel: 'Loading...' },
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', config.className)}>
      {label || config.defaultLabel}
    </span>
  )
}
