import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { customComponentsApiPlugin } from './vite-plugin-custom-components.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    customComponentsApiPlugin(),
  ],
  server: {
    host: true,
    port: 5180,
    allowedHosts: true,
  },
})
