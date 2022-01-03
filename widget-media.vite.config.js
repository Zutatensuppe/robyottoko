import vite from 'vite'
import vue from '@vitejs/plugin-vue'

export default vite.defineConfig({
  plugins: [vue()],
  root: './src/frontend_widgets/media',
  base: '/static/widgets/media/',
  build: {
    outDir: '../../../build/public/static/widgets/media',
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
