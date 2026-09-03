import { LogOut, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'

interface PerfilBottomSheetProps {
  open: boolean
  onClose: () => void
}

export default function PerfilBottomSheet({ open, onClose }: PerfilBottomSheetProps) {
  const { user, signOut } = useAuth()
  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase()

  async function handleSignOut() {
    onClose()
    await signOut()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Mi cuenta</SheetTitle>
          <button onClick={onClose} className="text-[var(--color-muted-foreground)]">
            <X size={18} />
          </button>
        </SheetHeader>

        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex items-center justify-center rounded-full bg-[var(--color-primary)] text-white text-lg font-semibold w-14 h-14 shrink-0">
            {initials}
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              {user?.email?.split('@')[0] ?? 'Admin'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{user?.email}</p>
          </div>
        </div>

        <div className="px-4">
          <Button variant="outline" className="w-full gap-2" onClick={handleSignOut}>
            <LogOut size={16} />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
