import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/bbx-map-tournament-rentalspot/',
  server: {
    port: 3000,
    host: true,
  },
})