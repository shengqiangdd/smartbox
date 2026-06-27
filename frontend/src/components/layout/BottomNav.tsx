import { Terminal, FileCode2, Puzzle, Settings, Activity, Zap, Container, ScrollText } from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import { useSshStore } from '../../stores/ssh-store'
import { useAppStore as useAppStore2 } from '../../stores/app-store'

const navItems = [
  { id: 'ssh', label: 'SSH', icon: Terminal },
  { id: 'commands', label: '命令', icon: Zap },
  { id: 'docker', label: 'Docker', icon: Container },
  { id: 'monitor', label: '监控', icon: Activity },
  { id: 'files', label: '文件', icon: FileCode2 },
  { id: 'logs', label: '日志', icon: ScrollText },
  { id: 'plugins', label: '插件', icon: Puzzle },
  { id: 'settings', label: '设置', icon: Settings },
] as const

export default function BottomNav() {
  const activeNav = useAppStore((s) => s.activeNav)
  const setActiveNav = useAppStore((s) => s.setActiveNav)
  const sshSessions = useAppStore((s) => s.sshSessions)
  const sessions = useSshStore((s) => s.sessions)

  // SSH 活动会话中隐藏底部导航（终端需要全屏）
  const hasActiveTerminal = sessions.length > 0 && activeNav === 'ssh'
  const sshSftpOpen = useAppStore((s) => s.sshSftpOpen)
  const hideNav = hasActiveTerminal || sshSftpOpen

  if (hideNav) return null

  return (
    <nav className="flex items-center justify-evenly border-t border-slate-700/50 bg-slate-900 px-1 pb-safe pt-0.5 md:hidden no-scrollbar sm:h-12 sm:flex-row sm:gap-0">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            className={`flex shrink-0 flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-colors sm:flex-row sm:gap-1 sm:px-3 sm:py-1 ${
              activeNav === item.id
                ? 'text-smartbox-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={18} />
            <span className="sm:text-xs">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
