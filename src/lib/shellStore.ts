import { mkdtempSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import os from 'os'

export interface ShellSession {
  id: string
  sandboxDir: string
  cwd: string
  createdAt: number
  env: Record<string, string>
}

class ShellStore {
  private sessions: Map<string, ShellSession> = new Map()

  createSession(): ShellSession {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const sandboxBase = path.join(os.tmpdir(), 'k8s-debug-sandboxes')
    if (!existsSync(sandboxBase)) {
      mkdirSync(sandboxBase, { recursive: true })
    }
    const sandboxDir = mkdtempSync(path.join(sandboxBase, `session-${id}-`))
    const session: ShellSession = {
      id,
      sandboxDir,
      cwd: sandboxDir,
      createdAt: Date.now(),
      env: {},
    }
    this.sessions.set(id, session)
    return session
  }

  getSession(id: string): ShellSession | undefined {
    return this.sessions.get(id)
  }

  updateCwd(id: string, cwd: string): void {
    const session = this.sessions.get(id)
    if (session) session.cwd = cwd
  }

  deleteSession(id: string): void {
    this.sessions.delete(id)
  }
}

export const shellStore = new ShellStore()
