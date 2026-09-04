import { AppProvider } from '@/lib/app-context'
import { AppShell } from '@/components/app-shell'
import { LoginGate } from '@/components/login-gate'

export default function Page() {
  return (
    <AppProvider>
      <LoginGate>
        <AppShell />
      </LoginGate>
    </AppProvider>
  )
}
