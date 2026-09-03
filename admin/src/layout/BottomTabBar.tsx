import { NavLink } from 'react-router-dom'
import { ClipboardList, Tag } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/avatar'
import { cn } from '../lib/utils'

interface BottomTabBarProps {
  onPerfilClick: () => void
  perfilOpen: boolean
}

export default function BottomTabBar({ onPerfilClick, perfilOpen }: BottomTabBarProps) {
  const { user } = useAuth()
  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase()

  const tab = 'flex flex-col items-center gap-1 text-xs font-semibold py-2 px-4 transition-colors'

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-[var(--color-border)] flex justify-around">
      <NavLink
        to="/inscripciones"
        className={({ isActive }) =>
          cn(tab, isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]')
        }
      >
        <ClipboardList size={20} />
        Inscripciones
      </NavLink>
      <NavLink
        to="/tarifas"
        className={({ isActive }) =>
          cn(tab, isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]')
        }
      >
        <Tag size={20} />
        Tarifas
      </NavLink>
      <button
        onClick={onPerfilClick}
        className={cn(tab, perfilOpen ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]')}
      >
        <Avatar initials={initials} className="w-6 h-6 text-xs" />
        Perfil
      </button>
    </nav>
  )
}
