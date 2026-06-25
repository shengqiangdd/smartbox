import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, Search, X, ArrowUpDown } from 'lucide-react'

interface LogViewerProps {
  connectionId: string
  logPath: string
  onClose: () => void
}

export default function LogViewer({ connectionId, logPath, onClose }: LogViewerProps) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lineCount, setLineCount] = useState(200)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResult, setSearchResult] = useState<string>('')
  const [searching, setSearching] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  // 获取日志内容
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/logs/tail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, path: logPath, lines: lineCount }),
      })
      const json = await res.json()
      if (json.success) {
        setContent(json.data)
      } else {
        setError(json.error || '获取日志失败')
      }
    } catch (err: any) {
      setError(err.message || '请求失败')
    } finally {
      setLoading(false)
    }
  }, [connectionId, logPath, lineCount])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, autoScroll])

  // 搜索
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return
    setSearching(true)
    setSearchResult('')
    try {
      const res = await fetch('/api/logs/grep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          path: logPath,
          pattern: searchTerm,
          context: 2,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const lines = json.data.trim()
        setSearchResult(lines || '未找到匹配内容')
      } else {
        setSearchResult(`搜索错误: ${json.error}`)
      }
    } catch (err: any) {
      setSearchResult(`请求失败: ${err.message}`)
    } finally {
      setSearching(false)
    }
  }, [connectionId, logPath, searchTerm])

  // 下载
  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = logPath.replace(/^.*[\\/]/, '') || `log-${Date.now()}.log`
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }, [content, logPath])

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/50 bg-slate-900/80 px-3 py-1.5 text-xs">
        <span className="text-slate-400">📄</span>
        <span className="font-mono text-slate-300">{logPath}</span>

        {/* 行数选择 */}
        <select
          value={lineCount}
          onChange={(e) => setLineCount(Number(e.target.value))}
          className="ml-auto rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300"
        >
          <option value={50}>50行</option>
          <option value={200}>200行</option>
          <option value={500}>500行</option>
          <option value={1000}>1000行</option>
          <option value={5000}>5000行</option>
        </select>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="rounded px-2 py-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
        >
          {loading ? '加载中...' : '刷新'}
        </button>

        {/* 搜索按钮 */}
        <button
          onClick={() => setSearchResult(prev => prev ? '' : ' ')}
          className={`rounded px-2 py-0.5 transition-colors ${
            searchResult
              ? 'bg-smartbox-600/20 text-smartbox-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
          title="搜索"
        >
          <Search size={14} />
        </button>

        {/* 自动滚动 */}
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`rounded px-1.5 py-0.5 transition-colors ${
            autoScroll
              ? 'text-smartbox-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="自动滚动"
        >
          <ArrowUpDown size={14} />
        </button>

        <button
          onClick={handleDownload}
          className="rounded px-1.5 py-0.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          title="下载"
        >
          <Download size={14} />
        </button>

        <button
          onClick={onClose}
          className="rounded px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <X size={14} />
        </button>
      </div>

      {/* 搜索面板 */}
      {searchResult !== '' && (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/30 bg-slate-900/60 px-3 py-1.5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索关键词..."
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-smartbox-500"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchTerm.trim()}
            className="rounded bg-smartbox-600/80 px-2 py-1 text-xs text-white transition-colors hover:bg-smartbox-500 disabled:opacity-50"
          >
            {searching ? '搜索中...' : '搜索'}
          </button>
          <button
            onClick={() => { setSearchResult(''); setSearchTerm('') }}
            className="rounded px-1.5 py-1 text-xs text-slate-500 hover:text-slate-300"
          >
            关闭
          </button>
        </div>
      )}

      {/* 搜索结果 */}
      {searchResult && !searching && (
        <div className="max-h-40 shrink-0 overflow-auto border-b border-slate-700/30 bg-slate-900/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <Search size={12} />
            <span>搜索结果</span>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">
            {searchResult}
          </pre>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="shrink-0 border-b border-red-900/30 bg-red-950/20 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 日志内容 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-slate-950/80"
      >
        {loading && !content ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
          </div>
        ) : (
          <pre
            ref={preRef}
            className="min-h-full whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed text-slate-300"
          >
            {content || '(空)'}
          </pre>
        )}
      </div>
    </div>
  )
}
