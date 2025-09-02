import { defineConfig } from 'rolldown'
import fs from 'fs'
import process from 'process'

const version = process.env.RELEASE_VERSION || fs.readFileSync('build/version.txt', 'utf-8')

export default defineConfig({
  input: 'src/index.ts',
  platform: 'node',
  output: {
    file: 'build/server/index.js',
    inlineDynamicImports: true,
    minify: true,
  },
  define: {
    __buildDate__: JSON.stringify(new Date()),
    __buildVersion__: JSON.stringify(`${version}`),
  },
})
