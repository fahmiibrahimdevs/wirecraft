import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { customComponentsApiPlugin } from './vite-plugin-custom-components.ts'
import { backendApiPlugin } from './vite-plugin-backend-api.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    customComponentsApiPlugin(),
    backendApiPlugin(),
  ],
  server: {
    host: true,
    port: 5180,
    strictPort: true,
    allowedHosts: true,
  },
})
