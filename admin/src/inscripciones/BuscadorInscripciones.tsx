import { Search } from 'lucide-react'
import { Input } from '../components/ui/input'

interface BuscadorInscripcionesProps {
  value: string
  onChange: (v: string) => void
}

export default function BuscadorInscripciones({ value, onChange }: BuscadorInscripcionesProps) {
  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      <Input
        type="search"
        placeholder="Buscar por folio, cédula o nombre..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
