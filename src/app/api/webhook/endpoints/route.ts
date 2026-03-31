import { NextRequest, NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhookStore'

export const dynamic = 'force-dynamic'

export async function GET() {
  const endpoints = webhookStore.listEndpoints().map((ep) => ({
    id: ep.id,
    createdAt: ep.createdAt,
    forwardUrl: ep.forwardUrl,
    skipTls: ep.skipTls,
    proxyMode: ep.proxyMode,
    requestCount: ep.requests.length,
  }))
  return NextResponse.json({ success: true, endpoints })
}

export async function POST() {
  const endpoint = webhookStore.createEndpoint()
  return NextResponse.json({
    success: true,
    endpoint: {
      id: endpoint.id,
      createdAt: endpoint.createdAt,
      forwardUrl: endpoint.forwardUrl,
      skipTls: endpoint.skipTls,
      proxyMode: endpoint.proxyMode,
    },
  })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ success: false, error: 'Endpoint ID is required' })
  }
  webhookStore.deleteEndpoint(id)
  return NextResponse.json({ success: true })
}
