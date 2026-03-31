import { NextRequest, NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhookStore'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { endpointId, forwardUrl, skipTls, proxyMode } = await request.json()
    if (!endpointId) {
      return NextResponse.json({ success: false, error: 'endpointId is required' })
    }

    const endpoint = webhookStore.getEndpoint(endpointId)
    if (!endpoint) {
      return NextResponse.json({ success: false, error: 'Endpoint not found' })
    }

    webhookStore.updateEndpoint(endpointId, {
      forwardUrl: forwardUrl ?? endpoint.forwardUrl,
      skipTls: skipTls ?? endpoint.skipTls,
      proxyMode: proxyMode ?? endpoint.proxyMode,
    })

    return NextResponse.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        forwardUrl: endpoint.forwardUrl,
        skipTls: endpoint.skipTls,
        proxyMode: endpoint.proxyMode,
      },
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update proxy config',
    })
  }
}
