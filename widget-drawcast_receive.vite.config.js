import vite from 'vite'
import vue from '@vitejs/plugin-vue'

export default vite.defineConfig({
  plugins: [vue()],
  root: './src/frontend_widgets/drawcast_receive',
  base: '/static/widgets/drawcast_receive/',
  build: {
    outDir: '../../../build/public/static/widgets/drawcast_receive',
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
