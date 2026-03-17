'use client'
import { useState } from 'react'
import { Globe, RefreshCw, Search } from 'lucide-react'
import ResultCard from '@/components/ui/ResultCard'

export default function Route53Panel() {
  const [zones, setZones] = useState<Record<string, unknown>[] | null>(null)
  const [records, setRecords] = useState<Record<string, unknown>[] | null>(null)
  const [selectedZone, setSelectedZone] = useState('')
  const [recordName, setRecordName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function listZones() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/route53/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.success) setZones(data.hostedZones)
      else setError(data.error)
    } finally {
      setLoading(false)
    }
  }

  async function queryRecords() {
    if (!selectedZone) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/route53/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostedZoneId: selectedZone, recordName }),
      })
      const data = await res.json()
      if (data.success) setRecords(data.records)
      else setError(data.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Route53</h2>
          <p className="text-sm text-gray-400">Manage and query Route53 DNS records</p>
        </div>
      </div>

      <ResultCard title="Hosted Zones">
        <div className="flex gap-3 mb-4">
          <button
            onClick={listZones}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            List Hosted Zones
          </button>
        </div>
        {error && <div className="text-red-400 text-sm bg-red-950 p-3 rounded">{error}</div>}
        {zones && (
          <div className="space-y-2">
            {zones.map((zone, i) => (
              <div
                key={String(zone.id)}
                onClick={() => setSelectedZone(String(zone.id))}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedZone === String(zone.id) ? 'bg-blue-900 border border-blue-700' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                <div>
                  <div className="text-sm text-white font-mono">{String(zone.name)}</div>
                  <div className="text-xs text-gray-400">{String(zone.id)} · {String(zone.recordCount)} records</div>
                </div>
                {zone.private === true && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Private</span>}
              </div>
            ))}
          </div>
        )}
      </ResultCard>

      {selectedZone && (
        <ResultCard title="Query DNS Records">
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={recordName}
              onChange={e => setRecordName(e.target.value)}
              placeholder="Record name (optional filter)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={queryRecords}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              <Search className="w-4 h-4" />
              Query
            </button>
          </div>
          {records && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase border-b border-gray-800">
                    {['Name', 'Type', 'TTL', 'Values'].map(h => <th key={h} className="pb-2 pr-4">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 font-mono text-xs text-gray-200">{String(r.name)}</td>
                      <td className="py-2 pr-4 text-blue-400">{String(r.type)}</td>
                      <td className="py-2 pr-4 text-gray-400">{String(r.ttl || '-')}</td>
                      <td className="py-2 pr-4 text-gray-300 font-mono text-xs">{(r.values as string[])?.join(', ') || String(r.aliasTarget || '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ResultCard>
      )}
    </div>
  )
}
