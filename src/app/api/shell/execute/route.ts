import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { existsSync } from 'fs'
import { shellStore } from '@/lib/shellStore'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { command, sessionId } = await request.json()
    if (!command || typeof command !== 'string') {
      return NextResponse.json({ success: false, error: 'Command is required' })
    }

    let session = sessionId ? shellStore.getSession(sessionId) : null
    if (!session) {
      session = shellStore.createSession()
    }

    const trimmedCmd = command.trim()

    // Handle empty command
    if (!trimmedCmd) {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        cwd: session.cwd,
        sandboxDir: session.sandboxDir,
        stdout: '',
        stderr: '',
        exitCode: 0,
      })
    }

    // Handle 'clear' command on server side
    if (trimmedCmd === 'clear') {
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        cwd: session.cwd,
        sandboxDir: session.sandboxDir,
        stdout: '__CLEAR__',
        stderr: '',
        exitCode: 0,
      })
    }

    // Handle cd command specially since exec runs in a subprocess
    if (trimmedCmd === 'cd' || trimmedCmd.startsWith('cd ')) {
      const target =
        trimmedCmd === 'cd'
          ? session.sandboxDir
          : trimmedCmd.slice(3).trim().replace(/^~/, session.sandboxDir)

      const resolved = path.resolve(session.cwd, target)

      if (!resolved.startsWith(session.sandboxDir)) {
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          cwd: session.cwd,
          sandboxDir: session.sandboxDir,
          stdout: '',
          stderr: 'Permission denied: cannot navigate outside the sandbox workspace',
          exitCode: 1,
        })
      }

      if (!existsSync(resolved)) {
        return NextResponse.json({
          success: true,
          sessionId: session.id,
          cwd: session.cwd,
          sandboxDir: session.sandboxDir,
          stdout: '',
          stderr: `cd: ${target}: No such file or directory`,
          exitCode: 1,
        })
      }

      shellStore.updateCwd(session.id, resolved)
      return NextResponse.json({
        success: true,
        sessionId: session.id,
        cwd: resolved,
        sandboxDir: session.sandboxDir,
        stdout: '',
        stderr: '',
        exitCode: 0,
      })
    }

    // Execute general command in sandbox
    return new Promise<NextResponse>((resolve) => {
      const child = exec(
        trimmedCmd,
        {
          cwd: session!.cwd,
          env: {
            ...process.env,
            HOME: session!.sandboxDir,
            TMPDIR: session!.sandboxDir,
          },
          timeout: 30000,
          maxBuffer: 2 * 1024 * 1024,
          shell: '/bin/sh',
        },
        (error, stdout, stderr) => {
          const exitCode = error
            ? typeof error.code === 'number'
              ? error.code
              : 1
            : 0
          resolve(
            NextResponse.json({
              success: true,
              sessionId: session!.id,
              cwd: session!.cwd,
              sandboxDir: session!.sandboxDir,
              stdout: stdout || '',
              stderr: stderr || '',
              exitCode,
            })
          )
        }
      )

      // Handle process killed by timeout
      child.on('error', () => {
        resolve(
          NextResponse.json({
            success: true,
            sessionId: session!.id,
            cwd: session!.cwd,
            sandboxDir: session!.sandboxDir,
            stdout: '',
            stderr: 'Command timed out or failed to execute',
            exitCode: 1,
          })
        )
      })
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Execution failed',
    })
  }
}
