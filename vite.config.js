import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: './src/frontend',
  build: {
    outDir: '../../build/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^/(twitch|api|uploads|admin/api)/.*': {
        target: 'http://localhost:1337',
        secure: false,
      },
    },
  },
})
