'use client'
import { useState } from 'react'
import { Network, Play } from 'lucide-react'
import ResultCard from '@/components/ui/ResultCard'
import StatusBadge from '@/components/ui/StatusBadge'

const PROTOCOLS = ['tcp', 'http', 'https']
const QUICK_TESTS = [
  { host: '8.8.8.8', port: '53', protocol: 'tcp', label: 'Google DNS' },
  { host: 'google.com', port: '443', protocol: 'https', label: 'Google HTTPS' },
  { host: 'kubernetes.default.svc', port: '443', protocol: 'tcp', label: 'K8s API' },
]

export default function NetworkPanel() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('80')
  const [protocol, setProtocol] = useState('tcp')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  async function runTest(h?: string, p?: string, proto?: string) {
    const testHost = h || host
    if (!testHost) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/network/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: testHost, port: parseInt(p || port, 10), protocol: proto || protocol }),
      })
      setResult(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Network className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Network Connectivity</h2>
          <p className="text-sm text-gray-400">Test TCP/HTTP/HTTPS connectivity from the pod</p>
        </div>
      </div>

      <ResultCard title="Connectivity Test">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              placeholder="hostname or IP"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="port"
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <select
              value={protocol}
              onChange={e => setProtocol(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {PROTOCOLS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
            <button
              onClick={() => runTest()}
              disabled={loading || !host}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              <Play className="w-4 h-4" />
              Test
            </button>
          </div>

          <div>
            <span className="text-xs text-gray-500 mb-2 block">Quick tests:</span>
            <div className="flex flex-wrap gap-2">
              {QUICK_TESTS.map(t => (
                <button
                  key={t.label}
                  onClick={() => { setHost(t.host); setPort(t.port); setProtocol(t.protocol); runTest(t.host, t.port, t.protocol) }}
                  className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ResultCard>

      {loading && (
        <ResultCard title="Testing..." status="loading">
          <div className="text-gray-400 text-sm animate-pulse">Running connectivity test...</div>
        </ResultCard>
      )}

      {result && !loading && (
        <ResultCard title="Test Result" status={result.success ? 'success' : 'error'}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusBadge status={result.success ? 'success' : 'error'} label={result.success ? 'Connected' : 'Failed'} />
              {result.latency !== undefined && (
                <span className="text-sm text-gray-400">Latency: <span className="text-green-400">{String(result.latency)}ms</span></span>
              )}
              {result.statusCode !== undefined && (
                <span className="text-sm text-gray-400">Status: <span className="text-blue-400">{String(result.statusCode)}</span></span>
              )}
            </div>
            {result.error !== undefined && result.error !== null && <div className="text-red-400 text-sm bg-red-950 p-2 rounded">{String(result.error)}</div>}
          </div>
        </ResultCard>
      )}
    </div>
  )
}
