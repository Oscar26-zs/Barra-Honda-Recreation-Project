import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, Tag, LogOut } from 'lucide-react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'
import BottomTabBar from './BottomTabBar'
import PerfilBottomSheet from '../perfil/PerfilBottomSheet'

export default function AppLayout() {
  const { isMobile } = useBreakpoint()
  const { user, signOut } = useAuth()
  const [perfilOpen, setPerfilOpen] = useState(false)
  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase()

  const navItem = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
      isActive
        ? 'bg-[var(--color-secondary)] text-[var(--color-primary)]'
        : 'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
    )

  return (
    <div className="flex min-h-screen bg-[var(--color-fondo-app)]">
      {/* Sidebar desktop */}
      {!isMobile && (
        <aside className="w-[210px] shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col py-6 px-3">
          <div className="px-2 mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)] mb-1">
              PANEL ADMINISTRATIVO
            </p>
            <p className="text-base font-extrabold text-[var(--color-primary)] leading-tight">
              Recreativa<br />Barra Honda
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">MTB Valle del Nacaome</p>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            <NavLink to="/inscripciones" className={navItem}>
              <ClipboardList size={18} />
              Inscripciones
            </NavLink>
            <NavLink to="/tarifas" className={navItem}>
              <Tag size={18} />
              Tarifas
            </NavLink>
          </nav>

          {/* Perfil al fondo del sidebar */}
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
            <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-[var(--color-muted-foreground)]">
              <LogOut size={15} />
              Cerrar sesión
            </Button>
          </div>
        </aside>
      )}

      {/* Contenido principal */}
      <main className={cn('flex-1 min-w-0', isMobile && 'pb-16')}>
        <Outlet />
      </main>

      {/* Bottom tab bar mobile */}
      {isMobile && (
        <>
          <BottomTabBar onPerfilClick={() => setPerfilOpen(true)} perfilOpen={perfilOpen} />
          <PerfilBottomSheet open={perfilOpen} onClose={() => setPerfilOpen(false)} />
        </>
      )}
    </div>
  )
}
