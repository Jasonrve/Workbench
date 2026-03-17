import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const kc = getK8sClient()
    const coreClient = kc.makeApiClient(k8s.CoreV1Api)
    const nodesRes = await coreClient.listNode()

    const nodes = nodesRes.body.items.map((node) => {
      const conditions = node.status?.conditions || []
      const readyCondition = conditions.find(c => c.type === 'Ready')
      const pressureConditions = conditions.filter(c =>
        c.type !== 'Ready' && c.status === 'True'
      )

      return {
        name: node.metadata?.name,
        status: readyCondition?.status === 'True' ? 'Ready' : 'NotReady',
        roles: Object.keys(node.metadata?.labels || {})
          .filter(k => k.startsWith('node-role.kubernetes.io/'))
          .map(k => k.replace('node-role.kubernetes.io/', '')),
        conditions: conditions.map(c => ({
          type: c.type,
          status: c.status,
          reason: c.reason,
          message: c.message,
        })),
        pressureConditions: pressureConditions.map(c => c.type),
        taints: node.spec?.taints?.map(t => `${t.key}=${t.value}:${t.effect}`) || [],
        capacity: node.status?.capacity,
        allocatable: node.status?.allocatable,
        nodeInfo: node.status?.nodeInfo,
        age: node.metadata?.creationTimestamp,
        ip: node.status?.addresses?.find(a => a.type === 'InternalIP')?.address,
      }
    })

    return NextResponse.json({ success: true, nodes })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch node health',
    })
  }
}
