'use client'
import { useState } from 'react'
import { Search, Zap } from 'lucide-react'
import CopyButton from '@/components/ui/CopyButton'
import ResultCard from '@/components/ui/ResultCard'

const QUICK_TESTS = [
  'kubernetes.default',
  'kube-dns.kube-system.svc.cluster.local',
  'google.com',
]

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT']

export default function DNSPanel() {
  const [hostname, setHostname] = useState('')
  const [recordType, setRecordType] = useState('A')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  async function resolve(host?: string, type?: string) {
    const h = host || hostname
    if (!h) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/dns/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname: h, type: type || recordType }),
      })
      const data = await res.json()
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-green-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">DNS Resolver</h2>
          <p className="text-sm text-gray-400">Resolve DNS records from within the cluster</p>
        </div>
      </div>

      <ResultCard title="DNS Query">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={hostname}
              onChange={e => setHostname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && resolve()}
              placeholder="hostname or IP..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <select
              value={recordType}
              onChange={e => setRecordType(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => resolve()}
              disabled={loading || !hostname}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              Resolve
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-500 mb-2 block">Quick tests:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_TESTS.map(h => (
                <button
                  key={h}
                  onClick={() => { setHostname(h); resolve(h) }}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                >
                  <Zap className="w-3 h-3 text-yellow-400" />
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ResultCard>

      {loading && (
        <ResultCard title="Resolving..." status="loading">
          <div className="text-gray-400 text-sm animate-pulse">Querying DNS...</div>
        </ResultCard>
      )}

      {result && !loading && (
        <ResultCard title="DNS Results" status={result.success ? 'success' : 'error'}>
          {result.success ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div><span className="text-xs text-gray-500">Hostname:</span> <span className="text-sm text-gray-200 font-mono">{String(result.hostname)}</span></div>
                  <div><span className="text-xs text-gray-500">Type:</span> <span className="text-sm text-gray-200">{String(result.type)}</span></div>
                  <div><span className="text-xs text-gray-500">Duration:</span> <span className="text-sm text-green-400">{String(result.duration)}ms</span></div>
                  <div><span className="text-xs text-gray-500">Servers:</span> <span className="text-sm text-gray-200 font-mono">{(result.server as string[])?.join(', ')}</span></div>
                </div>
                <CopyButton text={JSON.stringify(result, null, 2)} />
              </div>
              <div className="bg-gray-950 rounded-lg p-3">
                <span className="text-xs text-gray-500 block mb-2">Addresses:</span>
                <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap">{JSON.stringify(result.addresses, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="text-red-400 text-sm">{String(result.error)}</div>
          )}
        </ResultCard>
      )}
    </div>
  )
}
