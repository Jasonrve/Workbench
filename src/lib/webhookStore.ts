export interface CapturedRequest {
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

export interface WebhookEndpoint {
  id: string
  createdAt: number
  forwardUrl: string
  skipTls: boolean
  proxyMode: boolean
  requests: CapturedRequest[]
}

class WebhookStore {
  private endpoints: Map<string, WebhookEndpoint> = new Map()
  private maxRequestsPerEndpoint = 200

  createEndpoint(): WebhookEndpoint {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const endpoint: WebhookEndpoint = {
      id,
      createdAt: Date.now(),
      forwardUrl: '',
      skipTls: false,
      proxyMode: false,
      requests: [],
    }
    this.endpoints.set(id, endpoint)
    return endpoint
  }

  getEndpoint(id: string): WebhookEndpoint | undefined {
    return this.endpoints.get(id)
  }

  addRequest(endpointId: string, request: CapturedRequest): void {
    const endpoint = this.endpoints.get(endpointId)
    if (!endpoint) return
    endpoint.requests.unshift(request)
    if (endpoint.requests.length > this.maxRequestsPerEndpoint) {
      endpoint.requests = endpoint.requests.slice(0, this.maxRequestsPerEndpoint)
    }
  }

  getRequests(endpointId: string): CapturedRequest[] {
    return this.endpoints.get(endpointId)?.requests || []
  }

  clearRequests(endpointId: string): void {
    const endpoint = this.endpoints.get(endpointId)
    if (endpoint) endpoint.requests = []
  }

  updateEndpoint(
    id: string,
    updates: Partial<Pick<WebhookEndpoint, 'forwardUrl' | 'skipTls' | 'proxyMode'>>
  ): void {
    const endpoint = this.endpoints.get(id)
    if (!endpoint) return
    if (updates.forwardUrl !== undefined) endpoint.forwardUrl = updates.forwardUrl
    if (updates.skipTls !== undefined) endpoint.skipTls = updates.skipTls
    if (updates.proxyMode !== undefined) endpoint.proxyMode = updates.proxyMode
  }

  deleteEndpoint(id: string): void {
    this.endpoints.delete(id)
  }

  listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values())
  }
}

export const webhookStore = new WebhookStore()
