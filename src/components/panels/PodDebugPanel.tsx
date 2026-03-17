'use client'
import { Terminal } from 'lucide-react'
import CopyButton from '@/components/ui/CopyButton'
import ResultCard from '@/components/ui/ResultCard'

const DEBUG_COMMANDS = [
  {
    title: 'Create Debug Pod (busybox)',
    cmd: `kubectl run debug-pod --image=busybox:1.35 --restart=Never -it --rm -- sh`,
  },
  {
    title: 'Create Debug Pod (alpine with tools)',
    cmd: `kubectl run debug-pod --image=nicolaka/netshoot --restart=Never -it --rm -- bash`,
  },
  {
    title: 'Debug existing pod (ephemeral container)',
    cmd: `kubectl debug -it <pod-name> --image=busybox --target=<container-name>`,
  },
  {
    title: 'Port-forward a pod',
    cmd: `kubectl port-forward pod/<pod-name> 8080:8080`,
  },
  {
    title: 'Exec into running pod',
    cmd: `kubectl exec -it <pod-name> -- /bin/bash`,
  },
  {
    title: 'Check pod events',
    cmd: `kubectl describe pod <pod-name> | grep -A 20 Events:`,
  },
  {
    title: 'Get pod logs with timestamps',
    cmd: `kubectl logs <pod-name> --timestamps --tail=100`,
  },
  {
    title: 'Get previous pod logs (after crash)',
    cmd: `kubectl logs <pod-name> --previous`,
  },
  {
    title: 'Watch pod status',
    cmd: `kubectl get pods -w`,
  },
  {
    title: 'Debug node via pod',
    cmd: `kubectl debug node/<node-name> -it --image=busybox`,
  },
]

const NETWORK_COMMANDS = [
  { title: 'Test DNS from pod', cmd: `kubectl exec -it <pod-name> -- nslookup kubernetes.default` },
  { title: 'Test service connectivity', cmd: `kubectl exec -it <pod-name> -- wget -O- http://<service-name>:<port>` },
  { title: 'Check network policies', cmd: `kubectl get networkpolicies --all-namespaces` },
  { title: 'Trace network path', cmd: `kubectl exec -it <pod-name> -- traceroute <destination>` },
]

export default function PodDebugPanel() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Terminal className="w-6 h-6 text-green-400" />
        <div>
          <h2 className="text-xl font-semibold text-white">Pod Debugging</h2>
          <p className="text-sm text-gray-400">kubectl commands for debugging pods and workloads</p>
        </div>
      </div>

      <ResultCard title="Debug Pod Commands">
        <div className="space-y-3">
          {DEBUG_COMMANDS.map((item, i) => (
            <div key={i} className="bg-gray-950 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">{item.title}</span>
                <CopyButton text={item.cmd} />
              </div>
              <code className="text-xs text-green-300 font-mono block break-all">{item.cmd}</code>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="Network Debug Commands">
        <div className="space-y-3">
          {NETWORK_COMMANDS.map((item, i) => (
            <div key={i} className="bg-gray-950 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 font-medium">{item.title}</span>
                <CopyButton text={item.cmd} />
              </div>
              <code className="text-xs text-green-300 font-mono block break-all">{item.cmd}</code>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="Quick Reference">
        <div className="space-y-3 text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-1">Common Exit Codes</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-gray-950 p-3 rounded">
              {([['0', 'Success'], ['1', 'General error'], ['137', 'OOMKilled (SIGKILL)'], ['143', 'SIGTERM'], ['126', 'Permission denied'], ['127', 'Command not found']] as [string, string][]).map(([code, desc]) => (
                <div key={code}><span className="text-yellow-400">{code}</span> <span className="text-gray-400">- {desc}</span></div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-medium mb-1">Useful Labels</h4>
            <div className="text-xs font-mono bg-gray-950 p-3 rounded space-y-1">
              {['kubectl get pods --show-labels', 'kubectl get pods -l app=myapp', 'kubectl label pod <pod> env=debug'].map((cmd) => (
                <div key={cmd} className="flex items-center justify-between">
                  <code className="text-green-300">{cmd}</code>
                  <CopyButton text={cmd} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </ResultCard>
    </div>
  )
}
