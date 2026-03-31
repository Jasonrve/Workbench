'use client'

import { useState } from 'react'
import {
  Cloud, Network, Server, Shield, Globe, Database,
  Search, Activity, Terminal, Cpu, Moon, Sun, Webhook
} from 'lucide-react'
import AWSIdentityPanel from '@/components/panels/AWSIdentityPanel'
import DNSPanel from '@/components/panels/DNSPanel'
import NetworkPanel from '@/components/panels/NetworkPanel'
import K8sResourcePanel from '@/components/panels/K8sResourcePanel'
import NodeHealthPanel from '@/components/panels/NodeHealthPanel'
import VPCPanel from '@/components/panels/VPCPanel'
import AWSServicesPanel from '@/components/panels/AWSServicesPanel'
import Route53Panel from '@/components/panels/Route53Panel'
import RBACPanel from '@/components/panels/RBACPanel'
import PodDebugPanel from '@/components/panels/PodDebugPanel'
import SandboxShellPanel from '@/components/panels/SandboxShellPanel'
import WebhookPanel from '@/components/panels/WebhookPanel'

const panels = [
  { id: 'aws-identity', label: 'AWS Identity', icon: Cloud, component: AWSIdentityPanel },
  { id: 'aws-services', label: 'AWS Services', icon: Database, component: AWSServicesPanel },
  { id: 'dns', label: 'DNS Resolver', icon: Search, component: DNSPanel },
  { id: 'network', label: 'Network Test', icon: Network, component: NetworkPanel },
  { id: 'k8s-resources', label: 'K8s Resources', icon: Server, component: K8sResourcePanel },
  { id: 'node-health', label: 'Node Health', icon: Activity, component: NodeHealthPanel },
  { id: 'vpc', label: 'VPC Info', icon: Globe, component: VPCPanel },
  { id: 'route53', label: 'Route53', icon: Globe, component: Route53Panel },
  { id: 'rbac', label: 'RBAC', icon: Shield, component: RBACPanel },
  { id: 'pod-debug', label: 'Pod Debug', icon: Terminal, component: PodDebugPanel },
  { id: 'sandbox-shell', label: 'Sandbox Shell', icon: Terminal, component: SandboxShellPanel },
  { id: 'webhook', label: 'Webhook', icon: Webhook, component: WebhookPanel },
]

export default function Home() {
  const [activePanel, setActivePanel] = useState('aws-identity')
  const [darkMode, setDarkMode] = useState(true)

  const ActiveComponent = panels.find(p => p.id === activePanel)?.component || AWSIdentityPanel

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-6 h-6 text-blue-400" />
              <span className="font-bold text-sm text-white">K8s Debug Toolbox</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            {panels.map((panel) => {
              const Icon = panel.icon
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
                    activePanel === panel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{panel.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
        {/* Main content */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          <ActiveComponent />
        </div>
      </div>
    </div>
  )
}
