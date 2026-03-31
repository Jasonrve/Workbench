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
    const rbacClient = kc.makeApiClient(k8s.RbacAuthorizationV1Api)

    const [clusterRolesRes, clusterRoleBindingsRes] = await Promise.allSettled([
      rbacClient.listClusterRole(),
      rbacClient.listClusterRoleBinding(),
    ])

    const clusterRoles = clusterRolesRes.status === 'fulfilled'
      ? clusterRolesRes.value.body.items.map(cr => ({
          name: cr.metadata?.name,
          rules: cr.rules?.length ?? 0,
          age: cr.metadata?.creationTimestamp,
        }))
      : []

    const clusterRoleBindings = clusterRoleBindingsRes.status === 'fulfilled'
      ? clusterRoleBindingsRes.value.body.items.map(crb => ({
          name: crb.metadata?.name,
          roleRef: crb.roleRef?.name,
          subjects: crb.subjects?.map(s => `${s.kind}/${s.name}`),
        }))
      : []

    const currentContext = kc.getCurrentContext()
    const currentUser = kc.getCurrentUser()

    return NextResponse.json({
      success: true,
      currentContext,
      currentUser: currentUser?.name,
      serviceAccount: process.env.HOSTNAME || 'unknown',
      namespace: process.env.POD_NAMESPACE || 'default',
      clusterRoles: clusterRoles.slice(0, 20),
      clusterRoleBindings: clusterRoleBindings.slice(0, 20),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch RBAC info',
    })
  }
}
