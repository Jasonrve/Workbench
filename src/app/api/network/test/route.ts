import { NextRequest, NextResponse } from 'next/server'
import net from 'net'
import http from 'http'
import https from 'https'

function tcpTest(host: string, port: number): Promise<{ success: boolean; latency: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now()
    const socket = net.connect({ host, port, timeout: 5000 }, () => {
      socket.destroy()
      resolve({ success: true, latency: Date.now() - start })
    })
    socket.on('error', (err) => resolve({ success: false, latency: Date.now() - start, error: err.message }))
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, latency: Date.now() - start, error: 'Connection timed out' })
    })
  })
}

function httpTest(url: string, isHttps: boolean): Promise<{ success: boolean; latency: number; statusCode?: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now()
    const mod = isHttps ? https : http
    const req = mod.get(url, { timeout: 5000 }, (res) => {
      res.resume()
      resolve({ success: true, latency: Date.now() - start, statusCode: res.statusCode })
    })
    req.on('error', (err) => resolve({ success: false, latency: Date.now() - start, error: err.message }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ success: false, latency: Date.now() - start, error: 'Request timed out' })
    })
  })
}

export async function POST(request: NextRequest) {
  try {
    const { host, port, protocol = 'tcp' } = await request.json()
    if (!host) return NextResponse.json({ success: false, error: 'host is required' })

    switch (protocol.toLowerCase()) {
      case 'tcp': {
        const result = await tcpTest(host, port || 80)
        return NextResponse.json(result)
      }
      case 'http': {
        const url = `http://${host}${port ? ':' + port : ''}`
        const result = await httpTest(url, false)
        return NextResponse.json(result)
      }
      case 'https': {
        const url = `https://${host}${port ? ':' + port : ''}`
        const result = await httpTest(url, true)
        return NextResponse.json(result)
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown protocol: ${protocol}` })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    })
  }
}
