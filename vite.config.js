import vite from 'vite'
import vue from '@vitejs/plugin-vue'

export default vite.defineConfig({
  plugins: [vue()],
  root: './src/frontend',
  build: {
    outDir: '../../build/public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^/(twitch|api|uploads)/.*': {
        target: `http://192.168.178.30:1337`,
        secure: false,
      },
    },
  },
})
