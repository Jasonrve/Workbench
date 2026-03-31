import { NextRequest, NextResponse } from 'next/server'
import { webhookStore } from '@/lib/webhookStore'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpointId = searchParams.get('endpointId')
  if (!endpointId) {
    return NextResponse.json({ success: false, error: 'endpointId is required' })
  }

  const requests = webhookStore.getRequests(endpointId)
  return NextResponse.json({ success: true, requests })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpointId = searchParams.get('endpointId')
  if (!endpointId) {
    return NextResponse.json({ success: false, error: 'endpointId is required' })
  }

  webhookStore.clearRequests(endpointId)
  return NextResponse.json({ success: true })
}
