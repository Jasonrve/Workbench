'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Webhook, Plus, Trash2, Copy, Check, RefreshCw, ArrowRight, Settings, Globe, Shield, ShieldOff } from 'lucide-react'
import CopyButton from '@/components/ui/CopyButton'

interface CapturedRequest {
  id: string
  endpointId: string
  timestamp: number
  method: string
  url: string
  path: string
  headers: Record<string, string>
  query: Record<string, string>
  body: string
  contentType: string
  ip: string
  size: number
  forwardedResponse?: {
    statusCode: number
    headers: Record<string, string>
    body: string
    latency: number
  }
}

interface EndpointConfig {
  id: string
  createdAt: number
  forwardUrl: string
  skipTls: boolean
  proxyMode: boolean
  requestCount?: number
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-900 text-green-300',
  POST: 'bg-blue-900 text-blue-300',
  PUT: 'bg-yellow-900 text-yellow-300',
  PATCH: 'bg-purple-900 text-purple-300',
  DELETE: 'bg-red-900 text-red-300',
  HEAD: 'bg-gray-700 text-gray-300',
  OPTIONS: 'bg-gray-700 text-gray-300',
}

export default function WebhookPanel() {
  const [endpoint, setEndpoint] = useState<EndpointConfig | null>(null)
  const [requests, setRequests] = useState<CapturedRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [forwardUrl, setForwardUrl] = useState('')
  const [skipTls, setSkipTls] = useState(false)
  const [proxyMode, setProxyMode] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'query' | 'response'>('headers')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const webhookUrl = endpoint
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/endpoint/${endpoint.id}`
    : ''

  const fetchRequests = useCallback(async (endpointId: string) => {
    try {
      const res = await fetch(`/api/webhook/requests?endpointId=${endpointId}`)
      const data = await res.json()
      if (data.success) {
        setRequests(data.requests)
      }
    } catch {
      /* ignore polling errors */
    }
  }, [])

  // Create endpoint on mount
  useEffect(() => {
    createEndpoint()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh requests
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (autoRefresh && endpoint) {
      timerRef.current = setInterval(() => fetchRequests(endpoint.id), 2000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, endpoint, fetchRequests])

  async function createEndpoint() {
    setLoading(true)
    try {
      const res = await fetch('/api/webhook/endpoints', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setEndpoint(data.endpoint)
        setRequests([])
        setSelectedRequest(null)
        setForwardUrl(data.endpoint.forwardUrl || '')
        setSkipTls(data.endpoint.skipTls || false)
        setProxyMode(data.endpoint.proxyMode || false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function clearRequests() {
    if (!endpoint) return
    await fetch(`/api/webhook/requests?endpointId=${endpoint.id}`, { method: 'DELETE' })
    setRequests([])
    setSelectedRequest(null)
  }

  async function saveProxyConfig() {
    if (!endpoint) return
    try {
      const res = await fetch('/api/webhook/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointId: endpoint.id,
          forwardUrl,
          skipTls,
          proxyMode,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEndpoint((prev) => prev ? { ...prev, forwardUrl, skipTls, proxyMode } : prev)
        setShowSettings(false)
      }
    } catch { /* ignore */ }
  }

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  function formatTimestamp(ts: number) {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function tryFormatJson(text: string): string {
    try {
      return JSON.stringify(JSON.parse(text), null, 2)
    } catch {
      return text
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Webhook className="w-6 h-6 text-violet-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Webhook Receiver</h2>
              <p className="text-sm text-gray-400">
                Capture and inspect HTTP requests • Proxy and forward traffic
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                showSettings ? 'bg-violet-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Proxy Settings
            </button>
            <button
              onClick={clearRequests}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={createEndpoint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Endpoint
            </button>
          </div>
        </div>

        {/* Webhook URL */}
        {endpoint && (
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg p-2">
            <Globe className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <code className="flex-1 text-sm text-violet-300 font-mono truncate">{webhookUrl}</code>
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors flex-shrink-0"
            >
              {urlCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {urlCopied ? 'Copied!' : 'Copy URL'}
            </button>
            <div className="flex items-center gap-1.5 ml-2">
              <label className="text-xs text-gray-500">Auto-refresh</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-violet-600' : 'bg-gray-700'}`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${autoRefresh ? 'left-4.5' : 'left-0.5'}`}
                  style={{ left: autoRefresh ? '18px' : '2px' }}
                />
              </button>
            </div>
          </div>
        )}

        {/* Proxy indicators */}
        {endpoint?.forwardUrl && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <ArrowRight className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-400">
              Forwarding to: <span className="text-violet-300 font-mono">{endpoint.forwardUrl}</span>
            </span>
            {endpoint.proxyMode && (
              <span className="text-xs bg-violet-900/50 text-violet-300 px-1.5 py-0.5 rounded">Proxy Mode</span>
            )}
            {endpoint.skipTls ? (
              <ShieldOff className="w-3 h-3 text-yellow-500" />
            ) : (
              <Shield className="w-3 h-3 text-green-500" />
            )}
          </div>
        )}

        {/* Proxy Settings Panel */}
        {showSettings && (
          <div className="mt-3 bg-gray-950 border border-gray-800 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-white">Proxy & Forward Settings</h3>
            <p className="text-xs text-gray-400">
              Forward incoming webhook requests to another URL. Enable proxy mode to relay the response back to the caller (man-in-the-middle).
            </p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Forward URL</label>
              <input
                type="text"
                value={forwardUrl}
                onChange={(e) => setForwardUrl(e.target.value)}
                placeholder="https://example.com/api/endpoint"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proxyMode}
                  onChange={(e) => setProxyMode(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-300">Proxy Mode</span>
                <span className="text-xs text-gray-500">(relay response back to caller)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipTls}
                  onChange={(e) => setSkipTls(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-300">Skip TLS Verification</span>
                <span className="text-xs text-gray-500">(for outgoing calls)</span>
              </label>
            </div>
            <button
              onClick={saveProxyConfig}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Main content: Request list + Detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Request list (left panel) */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-950">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <Webhook className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No requests received yet</p>
              <p className="text-xs mt-1 text-center">
                Send a request to the webhook URL above to see it here
              </p>
              <div className="mt-4 w-full">
                <p className="text-xs text-gray-600 mb-1">Example:</p>
                <div className="bg-gray-900 rounded p-2">
                  <CopyButton
                    text={`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -d '{"test": true}'`}
                  />
                  <code className="text-xs text-gray-400 mt-1 block break-all">
                    curl -X POST {webhookUrl ? '...' : '<url>'} -d {`'{"test": true}'`}
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="px-3 py-2 border-b border-gray-800 bg-gray-900 sticky top-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{requests.length} request{requests.length !== 1 ? 's' : ''}</span>
                  <button
                    onClick={() => endpoint && fetchRequests(endpoint.id)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => { setSelectedRequest(req); setActiveTab('headers') }}
                  className={`px-3 py-2.5 border-b border-gray-800/50 cursor-pointer transition-colors ${
                    selectedRequest?.id === req.id
                      ? 'bg-violet-900/30 border-l-2 border-l-violet-500'
                      : 'hover:bg-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${METHOD_COLORS[req.method] || 'bg-gray-700 text-gray-300'}`}>
                      {req.method}
                    </span>
                    <span className="text-xs text-gray-400 truncate flex-1 font-mono">
                      {req.path.replace(`/api/webhook/endpoint/${req.endpointId}`, '/') || '/'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatTimestamp(req.timestamp)}</span>
                    <span>{formatSize(req.size)}</span>
                    {req.forwardedResponse && (
                      <span className={req.forwardedResponse.statusCode < 400 ? 'text-green-500' : 'text-red-500'}>
                        → {req.forwardedResponse.statusCode}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Request detail (right panel) */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {selectedRequest ? (
            <div className="p-4 space-y-4">
              {/* Request summary */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`px-2 py-1 rounded text-sm font-mono font-semibold ${METHOD_COLORS[selectedRequest.method] || 'bg-gray-700 text-gray-300'}`}>
                  {selectedRequest.method}
                </span>
                <span className="text-sm text-gray-300 font-mono break-all">{selectedRequest.url}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Timestamp</div>
                  <div className="text-gray-200">{new Date(selectedRequest.timestamp).toISOString()}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Content-Type</div>
                  <div className="text-gray-200 font-mono">{selectedRequest.contentType || 'none'}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 mb-1">Size / IP</div>
                  <div className="text-gray-200">{formatSize(selectedRequest.size)} • {selectedRequest.ip}</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-800">
                {(['headers', 'body', 'query', ...(selectedRequest.forwardedResponse ? ['response' as const] : [])] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm transition-colors border-b-2 ${
                        activeTab === tab
                          ? 'border-violet-500 text-white'
                          : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab === 'headers' && `Headers (${Object.keys(selectedRequest.headers).length})`}
                      {tab === 'body' && 'Body'}
                      {tab === 'query' && `Query (${Object.keys(selectedRequest.query).length})`}
                      {tab === 'response' && 'Forwarded Response'}
                    </button>
                  )
                )}
              </div>

              {/* Tab content */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                {activeTab === 'headers' && (
                  <div className="divide-y divide-gray-800">
                    {Object.entries(selectedRequest.headers).map(([key, value]) => (
                      <div key={key} className="flex px-4 py-2 text-xs">
                        <span className="w-48 flex-shrink-0 text-violet-300 font-mono font-semibold">{key}</span>
                        <span className="text-gray-300 font-mono break-all">{value}</span>
                      </div>
                    ))}
                    {Object.keys(selectedRequest.headers).length === 0 && (
                      <div className="px-4 py-3 text-xs text-gray-500">No headers</div>
                    )}
                  </div>
                )}

                {activeTab === 'body' && (
                  <div className="relative">
                    {selectedRequest.body ? (
                      <>
                        <div className="absolute top-2 right-2">
                          <CopyButton text={selectedRequest.body} />
                        </div>
                        <pre className="p-4 text-xs text-gray-300 font-mono overflow-auto max-h-[600px] whitespace-pre-wrap break-all">
                          {tryFormatJson(selectedRequest.body)}
                        </pre>
                      </>
                    ) : (
                      <div className="px-4 py-3 text-xs text-gray-500">No body</div>
                    )}
                  </div>
                )}

                {activeTab === 'query' && (
                  <div className="divide-y divide-gray-800">
                    {Object.entries(selectedRequest.query).map(([key, value]) => (
                      <div key={key} className="flex px-4 py-2 text-xs">
                        <span className="w-48 flex-shrink-0 text-violet-300 font-mono font-semibold">{key}</span>
                        <span className="text-gray-300 font-mono break-all">{value}</span>
                      </div>
                    ))}
                    {Object.keys(selectedRequest.query).length === 0 && (
                      <div className="px-4 py-3 text-xs text-gray-500">No query parameters</div>
                    )}
                  </div>
                )}

                {activeTab === 'response' && selectedRequest.forwardedResponse && (
                  <div className="space-y-0">
                    <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                          selectedRequest.forwardedResponse.statusCode < 400
                            ? 'bg-green-900 text-green-300'
                            : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {selectedRequest.forwardedResponse.statusCode}
                      </span>
                      <span className="text-xs text-gray-400">
                        {selectedRequest.forwardedResponse.latency}ms
                      </span>
                    </div>
                    <div className="border-b border-gray-800">
                      <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">Response Headers</div>
                      {Object.entries(selectedRequest.forwardedResponse.headers).map(([key, value]) => (
                        <div key={key} className="flex px-4 py-1.5 text-xs">
                          <span className="w-48 flex-shrink-0 text-violet-300 font-mono">{key}</span>
                          <span className="text-gray-300 font-mono break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="relative">
                      <div className="px-4 py-2 text-xs text-gray-500 font-semibold uppercase">Response Body</div>
                      {selectedRequest.forwardedResponse.body ? (
                        <>
                          <div className="absolute top-1 right-2">
                            <CopyButton text={selectedRequest.forwardedResponse.body} />
                          </div>
                          <pre className="px-4 pb-4 text-xs text-gray-300 font-mono overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
                            {tryFormatJson(selectedRequest.forwardedResponse.body)}
                          </pre>
                        </>
                      ) : (
                        <div className="px-4 pb-3 text-xs text-gray-500">No response body</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Webhook className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
