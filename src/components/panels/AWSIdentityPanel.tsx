'use client'
import { useState } from 'react'
import { Cloud, RefreshCw } from 'lucide-react'
import CopyButton from '@/components/ui/CopyButton'
import ResultCard from '@/components/ui/ResultCard'

export default function AWSIdentityPanel() {
  const [identity, setIdentity] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [roleArn, setRoleArn] = useState('')
  const [externalId, setExternalId] = useState('')
  const [sessionName, setSessionName] = useState('k8s-debug-session')
  const [assumeResult, setAssumeResult] = useState<Record<string, unknown> | null>(null)
  const [assumeLoading, setAssumeLoading] = useState(false)

  async function fetchIdentity() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/aws/identity')
      const data = await res.json()
      if (data.success) setIdentity(data)
      else setError(data.error)
    } catch {
      setError('Failed to fetch identity')
    } finally {
      setLoading(false)
    }
  }

  async function testAssumeRole() {
    setAssumeLoading(true)
    try {
      const res = await fetch('/api/aws/assume-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleArn, externalId, sessionName }),
      })
      const data = await res.json()
      setAssumeResult(data)
    } catch {
      setAssumeResult({ success: false, error: 'Request failed' })
    } finally {
      setAssumeLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Cloud className="w-6 h-6 text-orange-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">AWS Identity</h2>
          <p className="text-sm text-gray-400">Verify AWS credentials and IAM identity</p>
        </div>
      </div>

      <ResultCard title="Caller Identity" status={loading ? 'loading' : error ? 'error' : identity ? 'success' : 'info'}>
        <button
          onClick={fetchIdentity}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors mb-4"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Get AWS Identity
        </button>
        {error && <div className="text-red-400 text-sm bg-red-950 p-3 rounded">{error}</div>}
        {identity && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Results</span>
              <CopyButton text={JSON.stringify(identity, null, 2)} />
            </div>
            <div className="bg-gray-950 rounded-lg p-3 space-y-2">
              {([['Account', identity.Account], ['ARN', identity.Arn], ['User ID', identity.UserId]] as [string, string][]).map(([label, val]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">{label}</span>
                  <span className="text-sm text-gray-200 break-all font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ResultCard>

      <ResultCard title="Assume Role Test">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Role ARN</label>
            <input
              type="text"
              value={roleArn}
              onChange={e => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789:role/MyRole"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">External ID (optional)</label>
              <input
                type="text"
                value={externalId}
                onChange={e => setExternalId(e.target.value)}
                placeholder="external-id"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Session Name</label>
              <input
                type="text"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="session-name"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={testAssumeRole}
            disabled={assumeLoading || !roleArn}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${assumeLoading ? 'animate-spin' : ''}`} />
            Test Assume Role
          </button>
          {assumeResult && (
            <div className={`p-3 rounded-lg text-sm ${assumeResult.success ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}>
              {assumeResult.success ? (
                <div>
                  <div>✓ Role assumed successfully</div>
                  <div className="font-mono text-xs mt-1">
                    Expiry: {String((assumeResult.credentials as Record<string, unknown>)?.expiration ?? '')}
                  </div>
                </div>
              ) : (
                <div>✗ {String(assumeResult.error)}</div>
              )}
            </div>
          )}
        </div>
      </ResultCard>
    </div>
  )
}
