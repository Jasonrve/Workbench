import { NextRequest, NextResponse } from 'next/server'
import * as k8s from '@kubernetes/client-node'

function getK8sClient() {
  const kc = new k8s.KubeConfig()
  try {
    kc.loadFromCluster()
  } catch {
    try {
      kc.loadFromDefault()
    } catch {
      throw new Error('Could not load Kubernetes configuration')
    }
  }
  return kc
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const namespace = searchParams.get('namespace') || 'default'
    const pod = searchParams.get('pod')
    const container = searchParams.get('container') || undefined
    const tail = parseInt(searchParams.get('tail') || '100', 10)

    if (!pod) {
      return NextResponse.json({ success: false, error: 'pod is required' })
    }

    const kc = getK8sClient()
    const coreClient = kc.makeApiClient(k8s.CoreV1Api)

    const res = await coreClient.readNamespacedPodLog(pod, namespace, container, false, undefined, undefined, undefined, undefined, undefined, tail)

    return NextResponse.json({
      success: true,
      logs: res.body,
      pod,
      namespace,
      container,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pod logs',
    })
  }
}
