'use client'
import { useState, useEffect } from 'react'
import { Shield, RefreshCw } from 'lucide-react'
import ResultCard from '@/components/ui/ResultCard'

export default function RBACPanel() {
  const [rbac, setRbac] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRBAC() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/k8s/rbac')
      const data = await res.json()
      if (data.success) setRbac(data)
      else setError(data.error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRBAC() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-yellow-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">RBAC Info</h2>
            <p className="text-sm text-gray-400">Kubernetes Role-Based Access Control</p>
          </div>
        </div>
        <button onClick={fetchRBAC} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && <ResultCard title="Loading..." status="loading"><div className="animate-pulse text-gray-400 text-sm">Fetching RBAC info...</div></ResultCard>}
      {error && <ResultCard title="Error" status="error"><div className="text-red-400 text-sm">{error}</div></ResultCard>}

      {rbac && (
        <>
          <ResultCard title="Current Context">
            <div className="grid grid-cols-2 gap-3">
              {([
                ['Context', rbac.currentContext],
                ['User', rbac.currentUser],
                ['Service Account', rbac.serviceAccount],
                ['Namespace', rbac.namespace],
              ] as [string, unknown][]).map(([label, val]) => (
                <div key={label}>
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="text-sm text-gray-200 font-mono">{String(val || '-')}</div>
                </div>
              ))}
            </div>
          </ResultCard>

          <ResultCard title={`ClusterRoles (${(rbac.clusterRoles as unknown[])?.length || 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Rules</th>
                  </tr>
                </thead>
                <tbody>
                  {(rbac.clusterRoles as Record<string, unknown>[])?.map((cr) => (
                    <tr key={String(cr.name)} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(cr.name)}</td>
                      <td className="py-2 pr-4 text-gray-400">{String(cr.rules)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultCard>

          <ResultCard title={`ClusterRoleBindings (${(rbac.clusterRoleBindings as unknown[])?.length || 0})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Role Ref</th>
                    <th className="pb-2 pr-4">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {(rbac.clusterRoleBindings as Record<string, unknown>[])?.map((crb) => (
                    <tr key={String(crb.name)} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(crb.name)}</td>
                      <td className="py-2 pr-4 text-blue-400 text-xs">{String(crb.roleRef)}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{(crb.subjects as string[])?.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ResultCard>
        </>
      )}
    </div>
  )
}
