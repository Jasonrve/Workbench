'use client'
import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { Terminal, Trash2, RotateCcw } from 'lucide-react'

interface OutputLine {
  type: 'command' | 'stdout' | 'stderr' | 'info'
  text: string
}

export default function SandboxShellPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [cwd, setCwd] = useState('')
  const [sandboxDir, setSandboxDir] = useState('')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<OutputLine[]>([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const outputRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Initialize session
  const initSession = useCallback(async () => {
    try {
      const res = await fetch('/api/shell/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: '', sessionId: null }),
      })
      const data = await res.json()
      if (data.success) {
        setSessionId(data.sessionId)
        setCwd(data.cwd)
        setSandboxDir(data.sandboxDir)
        setOutput([
          { type: 'info', text: '╔══════════════════════════════════════════════════════╗' },
          { type: 'info', text: '║           K8s Debug Toolbox — Sandbox Shell          ║' },
          { type: 'info', text: '╚══════════════════════════════════════════════════════╝' },
          { type: 'info', text: '' },
          { type: 'info', text: `Session: ${data.sessionId}` },
          { type: 'info', text: `Sandbox: ${data.sandboxDir}` },
          { type: 'info', text: '' },
          { type: 'info', text: 'This is an isolated workspace. You cannot navigate outside the sandbox.' },
          { type: 'info', text: 'AWS CLI commands will use the pod\'s IAM identity (IRSA).' },
          { type: 'info', text: 'Type "help" for available commands.' },
          { type: 'info', text: '' },
        ])
      }
    } catch (err) {
      setOutput([{ type: 'stderr', text: 'Failed to initialize shell session' + (err instanceof Error ? ': ' + err.message : '') }])
    }
  }, [])

  useEffect(() => {
    initSession()
  }, [initSession])

  function getPromptDir(): string {
    if (!cwd || !sandboxDir) return '~'
    if (cwd === sandboxDir) return '~'
    return '~' + cwd.slice(sandboxDir.length)
  }

  async function executeCommand(cmd: string) {
    const trimmed = cmd.trim()
    if (!trimmed) return

    // Add to history
    setHistory((prev) => {
      const next = [...prev.filter((h) => h !== trimmed), trimmed]
      return next.slice(-100)
    })
    setHistoryIndex(-1)

    // Show the command in output
    setOutput((prev) => [...prev, { type: 'command', text: `${getPromptDir()} $ ${trimmed}` }])

    // Handle local commands
    if (trimmed === 'help') {
      setOutput((prev) => [
        ...prev,
        { type: 'info', text: 'Available commands:' },
        { type: 'info', text: '  aws ...         AWS CLI commands (uses pod identity)' },
        { type: 'info', text: '  curl ...        Make HTTP requests' },
        { type: 'info', text: '  dig / nslookup  DNS lookups' },
        { type: 'info', text: '  ls, cat, echo   File operations' },
        { type: 'info', text: '  mkdir, touch    Create files/directories' },
        { type: 'info', text: '  env             Show environment variables' },
        { type: 'info', text: '  pwd             Print working directory' },
        { type: 'info', text: '  cd <dir>        Change directory (sandbox only)' },
        { type: 'info', text: '  clear           Clear terminal output' },
        { type: 'info', text: '  reset           Reset session (new sandbox)' },
        { type: 'info', text: '' },
        { type: 'info', text: 'Note: Commands timeout after 30 seconds.' },
        { type: 'info', text: 'Note: Navigation restricted to sandbox workspace.' },
      ])
      return
    }

    if (trimmed === 'reset') {
      await initSession()
      return
    }

    setIsExecuting(true)
    try {
      const res = await fetch('/api/shell/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, sessionId }),
      })
      const data = await res.json()

      if (data.success) {
        if (data.sessionId) setSessionId(data.sessionId)
        if (data.cwd) setCwd(data.cwd)
        if (data.sandboxDir) setSandboxDir(data.sandboxDir)

        if (data.stdout === '__CLEAR__') {
          setOutput([])
          setIsExecuting(false)
          return
        }

        const newLines: OutputLine[] = []
        if (data.stdout) {
          data.stdout.split('\n').forEach((line: string) => {
            newLines.push({ type: 'stdout', text: line })
          })
        }
        if (data.stderr) {
          data.stderr.split('\n').forEach((line: string) => {
            if (line.trim()) newLines.push({ type: 'stderr', text: line })
          })
        }

        if (newLines.length > 0) {
          setOutput((prev) => [...prev, ...newLines])
        }
      } else {
        setOutput((prev) => [...prev, { type: 'stderr', text: data.error || 'Command failed' }])
      }
    } catch {
      setOutput((prev) => [...prev, { type: 'stderr', text: 'Failed to execute command' }])
    } finally {
      setIsExecuting(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isExecuting) {
      executeCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1
        if (newIndex >= history.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(history[newIndex])
        }
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      if (isExecuting) {
        setIsExecuting(false)
        setOutput((prev) => [...prev, { type: 'stderr', text: '^C' }])
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setOutput([])
    }
  }

  function clearOutput() {
    setOutput([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">Sandbox Shell</h2>
            <p className="text-sm text-gray-400">
              Isolated workspace • Session: {sessionId || '...'} • AWS CLI uses pod identity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearOutput}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            onClick={initSession}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>
      </div>

      {/* Terminal */}
      <div
        className="flex-1 bg-black overflow-hidden flex flex-col cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Output area */}
        <div
          ref={outputRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
        >
          {output.map((line, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap break-all ${
                line.type === 'command'
                  ? 'text-emerald-400 font-semibold'
                  : line.type === 'stderr'
                    ? 'text-red-400'
                    : line.type === 'info'
                      ? 'text-blue-400'
                      : 'text-gray-300'
              }`}
            >
              {line.text || '\u00A0'}
            </div>
          ))}
        </div>

        {/* Input line */}
        <div className="flex items-center px-4 py-2 border-t border-gray-800/50 bg-gray-950/50">
          <span className="text-emerald-400 font-mono text-sm mr-2 flex-shrink-0">
            {getPromptDir()} $
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
            placeholder={isExecuting ? 'Executing...' : 'Type a command...'}
            className="flex-1 bg-transparent border-none outline-none text-gray-100 font-mono text-sm placeholder-gray-600 disabled:opacity-50"
            autoComplete="off"
            spellCheck={false}
          />
          {isExecuting && (
            <div className="w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  )
}
