// rollup.config.js
import replace from '@rollup/plugin-replace'
import typescript from 'rollup-plugin-typescript2'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import fs from 'fs'

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))

export default {
  cache: false,
  input: 'src/index.ts',
  output: {
    dir: 'build/server',
    format: 'es',
  },
  external: [
    'cookie-parser',
    'cors',
    'express',
    'jsonwebtoken',
    'multer',
    'node-fetch',
    'pg',
    'sib-api-v3-sdk',
    'tmi.js',
    'twing',
    'ws',
  ],
  plugins: [typescript(), nodeResolve(), replace({
    preventAssignment: true,
    include: ['src/buildEnv.ts'],
    values: {
      __buildDate__: JSON.stringify(new Date()),
      __buildVersion__: JSON.stringify(`${packageJson.version}`),
    },
  })],
}
