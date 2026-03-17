import { NextResponse } from 'next/server'
import http from 'http'

function fetchMetadata(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://169.254.169.254${path}`, { timeout: 2000 }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

export async function GET() {
  const info: Record<string, unknown> = {
    podIP: process.env.POD_IP || 'unknown',
    nodeIP: process.env.NODE_IP || 'unknown',
    podName: process.env.POD_NAME || process.env.HOSTNAME || 'unknown',
    namespace: process.env.POD_NAMESPACE || 'default',
    awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unknown',
  }

  // Try to get EC2 metadata
  const ec2Metadata: Record<string, string> = {}
  let metadataAvailable = false

  try {
    // First get token for IMDSv2
    const tokenRes = await new Promise<string>((resolve, reject) => {
      const req = http.request({
        hostname: '169.254.169.254',
        path: '/latest/api/token',
        method: 'PUT',
        timeout: 2000,
        headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
      }, (res) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk })
        res.on('end', () => resolve(data))
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
      req.end()
    })

    if (tokenRes) {
      metadataAvailable = true
      try { ec2Metadata.instanceId = await fetchMetadata('/latest/meta-data/instance-id') } catch { /* ignore */ }
      try { ec2Metadata.instanceType = await fetchMetadata('/latest/meta-data/instance-type') } catch { /* ignore */ }
      try { ec2Metadata.availabilityZone = await fetchMetadata('/latest/meta-data/placement/availability-zone') } catch { /* ignore */ }
      try { ec2Metadata.localHostname = await fetchMetadata('/latest/meta-data/local-hostname') } catch { /* ignore */ }
    }
  } catch {
    metadataAvailable = false
  }

  return NextResponse.json({
    success: true,
    ...info,
    ec2MetadataAvailable: metadataAvailable,
    ec2Metadata,
  })
}
