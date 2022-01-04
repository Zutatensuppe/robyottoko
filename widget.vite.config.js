import vite from 'vite'
import vue from '@vitejs/plugin-vue'

const widget = process.env.WIDGET
export default vite.defineConfig({
  plugins: [vue()],
  root: `./src/frontend_widgets/${widget}`,
  base: `/static/widgets/${widget}/`,
  build: {
    outDir: `../../../build/public/static/widgets/${widget}`,
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
