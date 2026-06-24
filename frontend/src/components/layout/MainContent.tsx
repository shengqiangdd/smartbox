import { useAppStore } from '../../stores/app-store'
import SshPlaceholder from '../../modules/ssh/SshPlaceholder'
import FileManager from '../../modules/file-manager/FileManager'
import PluginsPage from '../../modules/plugins/PluginsPage'
import SettingsPanel from '../../modules/settings/SettingsPanel'

export default function MainContent() {
  const activeNav = useAppStore((s) => s.activeNav)

  const sections: Record<string, React.ReactNode> = {
    ssh: <SshPlaceholder />,
    files: <FileManager />,
    plugins: <PluginsPage />,
    settings: <SettingsPanel />,
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {sections[activeNav] || <SshPlaceholder />}
    </main>
  )
}
