import { LogOut } from 'lucide-react'
import { Avatar } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'

export default function PerfilSidebar() {
  const { user, signOut } = useAuth()
  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase()

  return (
    <div className="border-t border-[var(--color-border)] pt-4 mt-4 px-2">
      <div className="flex items-center gap-2 mb-3">
        <Avatar initials={initials} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--color-foreground)] truncate">
            {user?.email?.split('@')[0] ?? 'Admin'}
          </p>
          <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">{user?.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="w-full justify-start gap-2 text-[var(--color-muted-foreground)]"
      >
        <LogOut size={15} />
        Cerrar sesión
      </Button>
    </div>
  )
}
