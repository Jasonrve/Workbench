import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import { promisify } from 'util'

const resolve4 = promisify(dns.resolve4)
const resolve6 = promisify(dns.resolve6)
const resolveMx = promisify(dns.resolveMx)
const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)

export async function POST(request: NextRequest) {
  try {
    const { hostname, type = 'A' } = await request.json()
    if (!hostname) {
      return NextResponse.json({ success: false, error: 'hostname is required' })
    }
    const start = Date.now()
    let addresses: unknown[] = []

    try {
      switch (type.toUpperCase()) {
        case 'A':
          addresses = await resolve4(hostname)
          break
        case 'AAAA':
          addresses = await resolve6(hostname)
          break
        case 'MX':
          addresses = await resolveMx(hostname)
          break
        case 'TXT':
          addresses = await resolveTxt(hostname)
          break
        case 'CNAME':
          addresses = await resolveCname(hostname)
          break
        default:
          addresses = await resolve4(hostname)
      }
    } catch (err) {
      return NextResponse.json({
        success: false,
        error: err instanceof Error ? err.message : 'DNS resolution failed',
        hostname,
        type,
      })
    }

    return NextResponse.json({
      success: true,
      hostname,
      type,
      addresses,
      duration: Date.now() - start,
      server: dns.getServers(),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    })
  }
}
