'use client'
import { useState } from 'react'
import { Server, RefreshCw } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import ResultCard from '@/components/ui/ResultCard'

const RESOURCE_KINDS = ['pods', 'nodes', 'services', 'deployments', 'events']

export default function K8sResourcePanel() {
  const [kind, setKind] = useState('pods')
  const [namespace, setNamespace] = useState('default')
  const [resources, setResources] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPod, setSelectedPod] = useState<string | null>(null)
  const [logs, setLogs] = useState<string | null>(null)
  const [logsLoading, setLogsLoading] = useState(false)

  async function fetchResources() {
    setLoading(true)
    setError(null)
    setResources(null)
    setSelectedPod(null)
    setLogs(null)
    try {
      const res = await fetch(`/api/k8s/resources?kind=${kind}&namespace=${namespace}`)
      const data = await res.json()
      if (data.success) setResources(data.items)
      else setError(data.error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLogs(podName: string) {
    setSelectedPod(podName)
    setLogsLoading(true)
    try {
      const res = await fetch(`/api/k8s/pod-logs?namespace=${namespace}&pod=${podName}&tail=100`)
      const data = await res.json()
      if (data.success) setLogs(data.logs)
      else setLogs(`Error: ${data.error}`)
    } finally {
      setLogsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Server className="w-6 h-6 text-purple-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">K8s Resources</h2>
          <p className="text-sm text-gray-400">Browse Kubernetes resources in the cluster</p>
        </div>
      </div>

      <ResultCard title="Query Resources">
        <div className="flex gap-3">
          <select
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {RESOURCE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          {kind !== 'nodes' && (
            <input
              type="text"
              value={namespace}
              onChange={e => setNamespace(e.target.value)}
              placeholder="namespace"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500 w-40"
            />
          )}
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Fetch
          </button>
        </div>
      </ResultCard>

      {error && <ResultCard title="Error" status="error"><div className="text-red-400 text-sm">{error}</div></ResultCard>}

      {resources && (
        <ResultCard title={`${kind} (${resources.length})`} status="success">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                  {kind === 'pods' && ['Name', 'Status', 'Ready', 'Restarts', 'Node'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                  {kind === 'nodes' && ['Name', 'Status', 'Roles', 'Version', 'IP'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                  {kind === 'services' && ['Name', 'Type', 'Cluster IP', 'Ports'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                  {kind === 'deployments' && ['Name', 'Ready', 'Available'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                  {kind === 'events' && ['Type', 'Reason', 'Object', 'Message', 'Count'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {resources.map((r, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    {kind === 'pods' && <>
                      <td className="py-2 pr-4">
                        <button onClick={() => fetchLogs(String(r.name))} className="text-blue-400 hover:underline font-mono text-xs">{String(r.name)}</button>
                      </td>
                      <td className="py-2 pr-4"><StatusBadge status={r.status === 'Running' ? 'success' : r.status === 'Pending' ? 'warning' : 'error'} label={String(r.status)} /></td>
                      <td className="py-2 pr-4"><StatusBadge status={r.ready ? 'success' : 'error'} label={r.ready ? 'Yes' : 'No'} /></td>
                      <td className="py-2 pr-4 text-gray-300">{String(r.restarts)}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{String(r.nodeName || '-')}</td>
                    </>}
                    {kind === 'nodes' && <>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(r.name)}</td>
                      <td className="py-2 pr-4"><StatusBadge status={r.status === 'Ready' ? 'success' : 'error'} label={String(r.status)} /></td>
                      <td className="py-2 pr-4 text-gray-300">{(r.roles as string[])?.join(', ') || '-'}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{String(r.version || '-')}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{String(r.ip || '-')}</td>
                    </>}
                    {kind === 'services' && <>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(r.name)}</td>
                      <td className="py-2 pr-4 text-gray-300">{String(r.type)}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{String(r.clusterIP)}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs">{(r.ports as string[])?.join(', ')}</td>
                    </>}
                    {kind === 'deployments' && <>
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(r.name)}</td>
                      <td className="py-2 pr-4 text-gray-300">{String(r.ready)}</td>
                      <td className="py-2 pr-4 text-gray-400">{String(r.available ?? '-')}</td>
                    </>}
                    {kind === 'events' && <>
                      <td className="py-2 pr-4"><StatusBadge status={r.type === 'Warning' ? 'warning' : 'info'} label={String(r.type)} /></td>
                      <td className="py-2 pr-4 text-gray-300 text-xs">{String(r.reason)}</td>
                      <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{String(r.regarding)}</td>
                      <td className="py-2 pr-4 text-gray-400 text-xs max-w-xs truncate">{String(r.message)}</td>
                      <td className="py-2 pr-4 text-gray-400">{String(r.count)}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResultCard>
      )}

      {selectedPod && (
        <ResultCard title={`Logs: ${selectedPod}`} status={logsLoading ? 'loading' : 'info'}>
          {logsLoading ? (
            <div className="text-gray-400 text-sm animate-pulse">Loading logs...</div>
          ) : (
            <pre className="text-xs text-green-300 font-mono bg-gray-950 p-3 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">{logs}</pre>
          )}
        </ResultCard>
      )}
    </div>
  )
}
