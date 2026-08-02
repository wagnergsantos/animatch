import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/animatch/',
  plugins: [react()],
  server: {
    hmr: {
      path: '/animatch/',
    },
    proxy: {
      '/anilist-api': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anilist-api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
    passWithNoTests: true,
  },
})

