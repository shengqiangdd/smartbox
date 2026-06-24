import { useAppStore } from '../../stores/app-store'
import SshPlaceholder from '../../modules/ssh/SshPlaceholder'
import FileManager from '../../modules/file-manager/FileManager'
import PluginsPage from '../../modules/plugins/PluginsPage'
import SettingsPanel from '../../modules/settings/SettingsPanel'

const NAVS = ['ssh', 'files', 'plugins', 'settings'] as const

const PAGES: Record<string, React.ReactNode> = {
  ssh: <SshPlaceholder />,
  files: <FileManager />,
  plugins: <PluginsPage />,
  settings: <SettingsPanel />,
}

export default function MainContent() {
  const activeNav = useAppStore((s) => s.activeNav)

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {NAVS.map((nav) => (
        <div
          key={nav}
          className="flex h-full w-full flex-1 flex-col overflow-hidden"
          style={{ display: nav === activeNav ? 'flex' : 'none' }}
        >
          {PAGES[nav] || null}
        </div>
      ))}
    </main>
  )
}
