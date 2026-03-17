'use client'
import { useState } from 'react'
import { Database, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

const SERVICES = [
  { id: 's3', name: 'S3', description: 'Simple Storage Service' },
  { id: 'dynamodb', name: 'DynamoDB', description: 'NoSQL Database' },
  { id: 'secretsmanager', name: 'Secrets Manager', description: 'Secrets storage' },
  { id: 'ssm', name: 'SSM', description: 'Systems Manager' },
  { id: 'sts', name: 'STS', description: 'Security Token Service' },
  { id: 'ecr', name: 'ECR', description: 'Elastic Container Registry' },
]

type ServiceStatus = { success: boolean; latency?: number; error?: string; testing?: boolean }

export default function AWSServicesPanel() {
  const [results, setResults] = useState<Record<string, ServiceStatus>>({})
  const [testingAll, setTestingAll] = useState(false)

  async function testService(serviceId: string) {
    setResults(prev => ({ ...prev, [serviceId]: { success: false, testing: true } }))
    try {
      const res = await fetch('/api/aws/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId }),
      })
      const data = await res.json()
      setResults(prev => ({ ...prev, [serviceId]: { success: data.success, latency: data.latency, error: data.error } }))
    } catch {
      setResults(prev => ({ ...prev, [serviceId]: { success: false, error: 'Request failed' } }))
    }
  }

  async function testAll() {
    setTestingAll(true)
    await Promise.all(SERVICES.map(s => testService(s.id)))
    setTestingAll(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">AWS Services</h2>
            <p className="text-sm text-gray-400">Test connectivity to AWS services</p>
          </div>
        </div>
        <button
          onClick={testAll}
          disabled={testingAll}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
          Test All
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SERVICES.map(service => {
          const result = results[service.id]
          return (
            <div key={service.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-white text-sm">{service.name}</div>
                  <div className="text-xs text-gray-500">{service.description}</div>
                </div>
                {result && !result.testing && (
                  result.success
                    ? <CheckCircle className="w-5 h-5 text-green-400" />
                    : <XCircle className="w-5 h-5 text-red-400" />
                )}
                {result?.testing && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
              </div>
              {result && !result.testing && (
                <div className={`text-xs p-2 rounded mt-2 ${result.success ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}>
                  {result.success
                    ? `✓ Connected${result.latency ? ` (${result.latency}ms)` : ''}`
                    : `✗ ${result.error || 'Failed'}`
                  }
                </div>
              )}
              <button
                onClick={() => testService(service.id)}
                disabled={result?.testing}
                className="mt-2 w-full px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded text-xs transition-colors"
              >
                {result?.testing ? 'Testing...' : 'Test'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
