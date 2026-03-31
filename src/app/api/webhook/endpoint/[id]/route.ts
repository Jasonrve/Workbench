import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import http from 'http'
import { webhookStore } from '@/lib/webhookStore'
import type { CapturedRequest } from '@/lib/webhookStore'

export const dynamic = 'force-dynamic'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  }
}

async function forwardRequest(
  targetUrl: string,
  method: string,
  headers: Record<string, string>,
  body: string,
  skipTls: boolean
): Promise<{ statusCode: number; headers: Record<string, string>; body: string; latency: number }> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl)
    const isSecure = parsed.protocol === 'https:'
    const mod = isSecure ? https : http

    // Remove hop-by-hop headers and set proper host
    const forwardHeaders: Record<string, string> = {}
    const skipHeaders = ['host', 'connection', 'transfer-encoding', 'keep-alive']
    for (const [key, value] of Object.entries(headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        forwardHeaders[key] = value
      }
    }
    forwardHeaders['host'] = parsed.host

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isSecure ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: forwardHeaders,
      timeout: 30000,
    }

    if (isSecure && skipTls) {
      (options as https.RequestOptions).rejectUnauthorized = false
    }

    const req = mod.request(options, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const resHeaders: Record<string, string> = {}
        for (const [key, value] of Object.entries(res.headers)) {
          if (value) resHeaders[key] = Array.isArray(value) ? value.join(', ') : value
        }
        resolve({
          statusCode: res.statusCode || 502,
          headers: resHeaders,
          body: Buffer.concat(chunks).toString('utf-8'),
          latency: Date.now() - start,
        })
      })
    })
    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Forward request timed out'))
    })
    if (body) req.write(body)
    req.end()
  })
}

async function handleWebhook(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: endpointId } = await context.params
  const endpoint = webhookStore.getEndpoint(endpointId)

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Webhook endpoint not found' },
      { status: 404, headers: corsHeaders() }
    )
  }

  // Parse request details
  const url = new URL(request.url)
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  const query: Record<string, string> = {}
  url.searchParams.forEach((value, key) => {
    query[key] = value
  })

  let body = ''
  try {
    body = await request.text()
  } catch {
    /* empty body */
  }

  const captured: CapturedRequest = {
    id: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    endpointId,
    timestamp: Date.now(),
    method: request.method,
    url: request.url,
    path: url.pathname,
    headers,
    query,
    body,
    contentType: headers['content-type'] || '',
    ip: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
    size: new TextEncoder().encode(body).length,
  }

  // Forward request if configured
  if (endpoint.forwardUrl) {
    try {
      const fwd = await forwardRequest(
        endpoint.forwardUrl,
        request.method,
        headers,
        body,
        endpoint.skipTls
      )
      captured.forwardedResponse = fwd
    } catch (err) {
      captured.forwardedResponse = {
        statusCode: 502,
        headers: {},
        body: err instanceof Error ? err.message : 'Forward failed',
        latency: 0,
      }
    }
  }

  webhookStore.addRequest(endpointId, captured)

  // If forwarding and we got a response, relay it back
  if (captured.forwardedResponse && endpoint.proxyMode) {
    const responseHeaders = new Headers(corsHeaders())
    for (const [key, value] of Object.entries(captured.forwardedResponse.headers)) {
      if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value)
      }
    }
    return new NextResponse(captured.forwardedResponse.body, {
      status: captured.forwardedResponse.statusCode,
      headers: responseHeaders,
    })
  }

  return NextResponse.json(
    {
      success: true,
      message: `Webhook received on ${endpointId}`,
      requestId: captured.id,
      timestamp: captured.timestamp,
    },
    { headers: corsHeaders() }
  )
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleWebhook(request, context)
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}
