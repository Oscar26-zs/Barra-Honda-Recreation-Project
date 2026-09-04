import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 sin tailwind.config — el theming vive en src/styles/global.css (@theme).
// Ver .specify/specs/001-sitio-publico/desing/docs/01-overview.md
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true,
      port: 3000,
    },
  },
})
