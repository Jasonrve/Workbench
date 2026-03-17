'use client'
import { useState, useEffect } from 'react'
import { Globe, RefreshCw } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import ResultCard from '@/components/ui/ResultCard'

export default function VPCPanel() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchInfo() {
    setLoading(true)
    try {
      const res = await fetch('/api/vpc/info')
      setInfo(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchInfo() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">VPC &amp; Networking</h2>
            <p className="text-sm text-gray-400">Pod and node network information</p>
          </div>
        </div>
        <button onClick={fetchInfo} disabled={loading} className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading && <ResultCard title="Loading..." status="loading"><div className="animate-pulse text-gray-400 text-sm">Fetching network info...</div></ResultCard>}

      {info && (
        <>
          <ResultCard title="Pod Information" status="info">
            <div className="grid grid-cols-2 gap-3">
              {([
                ['Pod Name', info.podName],
                ['Pod IP', info.podIP],
                ['Node IP', info.nodeIP],
                ['Namespace', info.namespace],
                ['AWS Region', info.awsRegion],
              ] as [string, unknown][]).map(([label, val]) => (
                <div key={label}>
                  <span className="text-xs text-gray-500">{label}</span>
                  <div className="text-sm text-gray-200 font-mono">{String(val)}</div>
                </div>
              ))}
            </div>
          </ResultCard>

          <ResultCard title="EC2 Metadata" status={info.ec2MetadataAvailable ? 'success' : 'warning'}>
            <div className="flex items-center gap-2 mb-3">
              <StatusBadge status={info.ec2MetadataAvailable ? 'success' : 'warning'} label={info.ec2MetadataAvailable ? 'IMDS Available' : 'IMDS Not Available'} />
            </div>
            {info.ec2MetadataAvailable === true && info.ec2Metadata != null && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(info.ec2Metadata as Record<string, string>).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-gray-500">{k}</span>
                    <div className="text-sm text-gray-200 font-mono">{v}</div>
                  </div>
                ))}
              </div>
            )}
            {!info.ec2MetadataAvailable && (
              <p className="text-sm text-gray-400">EC2 instance metadata service (169.254.169.254) is not accessible. This may indicate the pod is not running on EC2 or IMDS access is restricted.</p>
            )}
          </ResultCard>
        </>
      )}
    </div>
  )
}
