// xlsx-js-style no publica tipos propios. Declaramos aquí el subconjunto que usa
// ExportarExcel (API compatible con SheetJS + propiedad `.s` de estilos por celda).
declare module 'xlsx-js-style' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Any = any

  export const utils: {
    aoa_to_sheet(data: unknown[][]): Any
    book_new(): Any
    book_append_sheet(wb: Any, ws: Any, name: string): void
    encode_cell(addr: { r: number; c: number }): string
    encode_range(range: { s: { r: number; c: number }; e: { r: number; c: number } }): string
  }

  export function writeFile(wb: Any, filename: string): void
}
