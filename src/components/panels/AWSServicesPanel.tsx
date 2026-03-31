'use client'
import { useState } from 'react'
import { Database, RefreshCw, CheckCircle, XCircle, ChevronDown, Play } from 'lucide-react'
import CopyButton from '@/components/ui/CopyButton'

interface ServiceConfig {
  id: string
  name: string
  description: string
  actions: { value: string; label: string; needsArn: boolean; arnPlaceholder?: string }[]
}

const SERVICES: ServiceConfig[] = [
  {
    id: 's3',
    name: 'S3',
    description: 'Simple Storage Service',
    actions: [
      { value: 'ListBuckets', label: 'List Buckets', needsArn: false },
      { value: 'ListObjects', label: 'List Objects', needsArn: true, arnPlaceholder: 'bucket-name or arn:aws:s3:::bucket-name' },
      { value: 'GetBucketLocation', label: 'Get Bucket Location', needsArn: true, arnPlaceholder: 'bucket-name or ARN' },
      { value: 'HeadBucket', label: 'Head Bucket (exists check)', needsArn: true, arnPlaceholder: 'bucket-name or ARN' },
    ],
  },
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    description: 'NoSQL Database',
    actions: [
      { value: 'ListTables', label: 'List Tables', needsArn: false },
      { value: 'DescribeTable', label: 'Describe Table', needsArn: true, arnPlaceholder: 'table-name or arn:aws:dynamodb:region:account:table/name' },
      { value: 'Scan', label: 'Scan (first 10 items)', needsArn: true, arnPlaceholder: 'table-name or ARN' },
    ],
  },
  {
    id: 'secretsmanager',
    name: 'Secrets Manager',
    description: 'Secrets storage',
    actions: [
      { value: 'ListSecrets', label: 'List Secrets', needsArn: false },
      { value: 'DescribeSecret', label: 'Describe Secret', needsArn: true, arnPlaceholder: 'secret-name or arn:aws:secretsmanager:...' },
      { value: 'GetSecretValue', label: 'Get Secret Value', needsArn: true, arnPlaceholder: 'secret-name or ARN' },
    ],
  },
  {
    id: 'ssm',
    name: 'SSM',
    description: 'Systems Manager',
    actions: [
      { value: 'DescribeParameters', label: 'Describe Parameters', needsArn: false },
      { value: 'GetParameter', label: 'Get Parameter', needsArn: true, arnPlaceholder: '/my/parameter/name or ARN' },
      { value: 'GetParametersByPath', label: 'Get Parameters by Path', needsArn: true, arnPlaceholder: '/my/path/' },
    ],
  },
  {
    id: 'sts',
    name: 'STS',
    description: 'Security Token Service',
    actions: [
      { value: 'GetCallerIdentity', label: 'Get Caller Identity', needsArn: false },
      { value: 'GetSessionToken', label: 'Get Session Token', needsArn: false },
    ],
  },
  {
    id: 'ecr',
    name: 'ECR',
    description: 'Elastic Container Registry',
    actions: [
      { value: 'DescribeRepositories', label: 'Describe Repositories', needsArn: false },
      { value: 'ListImages', label: 'List Images', needsArn: true, arnPlaceholder: 'repository-name or ARN' },
      { value: 'GetAuthorizationToken', label: 'Get Auth Token', needsArn: false },
    ],
  },
]

type ServiceResult = {
  success: boolean
  latency?: number
  error?: string
  data?: unknown
  testing?: boolean
}

export default function AWSServicesPanel() {
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({})
  const [arns, setArns] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, ServiceResult>>({})
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [testingAll, setTestingAll] = useState(false)

  async function testService(serviceId: string) {
    const service = SERVICES.find((s) => s.id === serviceId)
    if (!service) return
    const action = selectedActions[serviceId] || service.actions[0].value
    const arn = arns[serviceId] || ''

    setResults((prev) => ({ ...prev, [serviceId]: { success: false, testing: true } }))
    try {
      const res = await fetch('/api/aws/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceId, action, arn: arn || undefined }),
      })
      const data = await res.json()
      setResults((prev) => ({
        ...prev,
        [serviceId]: { success: data.success, latency: data.latency, error: data.error, data: data.data },
      }))
    } catch {
      setResults((prev) => ({ ...prev, [serviceId]: { success: false, error: 'Request failed' } }))
    }
  }

  async function testAll() {
    setTestingAll(true)
    await Promise.all(SERVICES.map((s) => testService(s.id)))
    setTestingAll(false)
  }

  function getSelectedAction(serviceId: string) {
    const service = SERVICES.find((s) => s.id === serviceId)!
    const actionValue = selectedActions[serviceId] || service.actions[0].value
    return service.actions.find((a) => a.value === actionValue) || service.actions[0]
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">AWS Services</h2>
            <p className="text-sm text-gray-400">Test connectivity and perform actions on AWS services</p>
          </div>
        </div>
        <button
          onClick={testAll}
          disabled={testingAll}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${testingAll ? 'animate-spin' : ''}`} />
          Test All Services
        </button>
      </div>

      <div className="space-y-3">
        {SERVICES.map((service) => {
          const result = results[service.id]
          const isExpanded = expandedService === service.id
          const currentAction = getSelectedAction(service.id)

          return (
            <div key={service.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              {/* Service header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedService(isExpanded ? null : service.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800 text-orange-400 font-bold text-xs">
                    {service.name}
                  </div>
                  <div>
                    <div className="font-medium text-white text-sm">{service.name}</div>
                    <div className="text-xs text-gray-500">{service.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result && !result.testing && (
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                      {result.latency && (
                        <span className="text-xs text-gray-500">{result.latency}ms</span>
                      )}
                    </div>
                  )}
                  {result?.testing && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-gray-800 p-4 space-y-4">
                  {/* Action selector */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Action</label>
                    <select
                      value={selectedActions[service.id] || service.actions[0].value}
                      onChange={(e) =>
                        setSelectedActions((prev) => ({ ...prev, [service.id]: e.target.value }))
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {service.actions.map((action) => (
                        <option key={action.value} value={action.value}>
                          {action.label}
                          {action.needsArn ? ' (requires ARN/name)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ARN input */}
                  {currentAction.needsArn && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">ARN / Resource Name</label>
                      <input
                        type="text"
                        value={arns[service.id] || ''}
                        onChange={(e) => setArns((prev) => ({ ...prev, [service.id]: e.target.value }))}
                        placeholder={currentAction.arnPlaceholder || 'Enter ARN or resource name'}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  )}

                  {/* Execute button */}
                  <button
                    onClick={() => testService(service.id)}
                    disabled={result?.testing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                  >
                    {result?.testing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {result?.testing ? 'Executing...' : 'Execute Action'}
                  </button>

                  {/* Result display */}
                  {result && !result.testing && (
                    <div className="space-y-2">
                      <div
                        className={`text-xs p-2 rounded ${result.success ? 'bg-green-950 text-green-300' : 'bg-red-950 text-red-300'}`}
                      >
                        {result.success
                          ? `✓ Success${result.latency ? ` (${result.latency}ms)` : ''}`
                          : `✗ ${result.error || 'Failed'}`}
                      </div>
                      {result.data !== undefined && result.data !== null && (
                        <div className="relative">
                          <div className="absolute top-2 right-2">
                            <CopyButton text={JSON.stringify(result.data, null, 2)} />
                          </div>
                          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-gray-300 overflow-auto max-h-96 font-mono">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
