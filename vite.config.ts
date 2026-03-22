import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { slidesPlugin } from './src/plugin/vite-plugin'

export default defineConfig({
  plugins: [
    slidesPlugin('slides.md'),
    react(),
  ],
})
