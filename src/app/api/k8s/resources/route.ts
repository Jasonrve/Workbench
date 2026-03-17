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
    const kind = searchParams.get('kind') || 'pods'
    const namespace = searchParams.get('namespace') || 'default'

    const kc = getK8sClient()

    switch (kind) {
      case 'pods': {
        const client = kc.makeApiClient(k8s.CoreV1Api)
        const res = await client.listNamespacedPod(namespace)
        return NextResponse.json({
          success: true,
          items: res.body.items.map((pod) => ({
            name: pod.metadata?.name,
            namespace: pod.metadata?.namespace,
            status: pod.status?.phase,
            ready: pod.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True',
            restarts: pod.status?.containerStatuses?.reduce((sum, cs) => sum + cs.restartCount, 0) ?? 0,
            age: pod.metadata?.creationTimestamp,
            nodeName: pod.spec?.nodeName,
            ip: pod.status?.podIP,
          })),
        })
      }
      case 'nodes': {
        const client = kc.makeApiClient(k8s.CoreV1Api)
        const res = await client.listNode()
        return NextResponse.json({
          success: true,
          items: res.body.items.map((node) => ({
            name: node.metadata?.name,
            status: node.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
            roles: Object.keys(node.metadata?.labels || {})
              .filter(k => k.startsWith('node-role.kubernetes.io/'))
              .map(k => k.replace('node-role.kubernetes.io/', '')),
            age: node.metadata?.creationTimestamp,
            version: node.status?.nodeInfo?.kubeletVersion,
            ip: node.status?.addresses?.find(a => a.type === 'InternalIP')?.address,
          })),
        })
      }
      case 'services': {
        const client = kc.makeApiClient(k8s.CoreV1Api)
        const res = await client.listNamespacedService(namespace)
        return NextResponse.json({
          success: true,
          items: res.body.items.map((svc) => ({
            name: svc.metadata?.name,
            namespace: svc.metadata?.namespace,
            type: svc.spec?.type,
            clusterIP: svc.spec?.clusterIP,
            externalIP: svc.status?.loadBalancer?.ingress?.[0]?.ip,
            ports: svc.spec?.ports?.map(p => `${p.port}/${p.protocol}`),
            age: svc.metadata?.creationTimestamp,
          })),
        })
      }
      case 'deployments': {
        const client = kc.makeApiClient(k8s.AppsV1Api)
        const res = await client.listNamespacedDeployment(namespace)
        return NextResponse.json({
          success: true,
          items: res.body.items.map((deploy) => ({
            name: deploy.metadata?.name,
            namespace: deploy.metadata?.namespace,
            ready: `${deploy.status?.readyReplicas ?? 0}/${deploy.spec?.replicas ?? 0}`,
            available: deploy.status?.availableReplicas,
            age: deploy.metadata?.creationTimestamp,
          })),
        })
      }
      case 'events': {
        const client = kc.makeApiClient(k8s.CoreV1Api)
        const res = await client.listNamespacedEvent(namespace)
        return NextResponse.json({
          success: true,
          items: res.body.items.map((evt) => ({
            name: evt.metadata?.name,
            type: evt.type,
            reason: evt.reason,
            message: evt.message,
            regarding: evt.involvedObject?.name,
            count: evt.count,
            lastTimestamp: evt.lastTimestamp,
          })),
        })
      }
      default:
        return NextResponse.json({ success: false, error: `Unknown resource kind: ${kind}` })
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Kubernetes API call failed',
    })
  }
}
