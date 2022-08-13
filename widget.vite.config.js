import vite from 'vite'
import vue from '@vitejs/plugin-vue'

const port = process.env.PORT || 3001
export default vite.defineConfig({
  plugins: [vue()],
  root: `./src/frontend_widgets`,
  base: `/static/widgets/`,
  envDir: '../../',
  build: {
    outDir: `../../build/public/static/widgets/`,
    emptyOutDir: true,
    cssCodeSplit: true,
  },
  server: {
    hmr: {
      port: port,
    },
    port: port,
    proxy: {
      '^/(api|uploads)/.*': {
        target: `http://localhost:1337`,
        secure: false,
      },
    },
  },
})
