import vite from 'vite'
import vue from '@vitejs/plugin-vue'

export default vite.defineConfig({
  plugins: [vue()],
  root: './src/frontend_widgets/sr',
  base: '/static/widgets/sr/',
  build: {
    outDir: '../../../build/public/static/widgets/sr',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '^/(api|uploads)/.*': {
        target: `http://192.168.178.30:1337`,
        secure: false,
      },
    },
  },
})
