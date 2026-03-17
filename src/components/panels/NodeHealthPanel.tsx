'use client'
import { useState, useEffect } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import ResultCard from '@/components/ui/ResultCard'

export default function NodeHealthPanel() {
  const [nodes, setNodes] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchHealth() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/k8s/health')
      const data = await res.json()
      if (data.success) setNodes(data.nodes)
      else setError(data.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHealth() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-green-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Node Health</h2>
            <p className="text-sm text-gray-400">Cluster node status and conditions</p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && <ResultCard title="Loading..." status="loading"><div className="animate-pulse text-gray-400 text-sm">Fetching node health...</div></ResultCard>}
      {error && <ResultCard title="Error" status="error"><div className="text-red-400 text-sm">{error}</div></ResultCard>}

      {nodes && nodes.map((node, i) => (
        <ResultCard
          key={String(node.name)}
          title={String(node.name)}
          status={node.status === 'Ready' ? 'success' : 'error'}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status:</span>
                <StatusBadge status={node.status === 'Ready' ? 'success' : 'error'} label={String(node.status)} />
              </div>
              <div><span className="text-xs text-gray-500">IP:</span> <span className="text-sm text-gray-200 font-mono">{String(node.ip || '-')}</span></div>
              <div><span className="text-xs text-gray-500">Roles:</span> <span className="text-sm text-gray-200">{(node.roles as string[])?.join(', ') || 'worker'}</span></div>
              {(node.pressureConditions as string[])?.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Pressures:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(node.pressureConditions as string[]).map((p: string) => (
                      <StatusBadge key={p} status="warning" label={p} />
                    ))}
                  </div>
                </div>
              )}
              {(node.taints as string[])?.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500 block">Taints:</span>
                  {(node.taints as string[]).map((t: string) => (
                    <div key={t} className="text-xs text-yellow-400 font-mono">{t}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-xs text-gray-500 block">Capacity:</span>
              {node.capacity != null && Object.entries(node.capacity as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{k}:</span>
                  <span className="text-gray-200 font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </ResultCard>
      ))}
    </div>
  )
}
