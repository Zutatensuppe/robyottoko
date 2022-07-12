// rollup.config.js
import replace from '@rollup/plugin-replace';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
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
    "cors",
    "ws",
    "pg",
    "multer",
    "express",
    "cookie-parser",
    "tmi.js",
    "twing",
    "sib-api-v3-sdk",
    "node-fetch",
  ],
  plugins: [typescript(), nodeResolve(), replace({
    preventAssignment: true,
    include: ['src/buildEnv.ts'],
    values: {
      __buildDate__: JSON.stringify(new Date()),
      __buildVersion__: JSON.stringify(`${packageJson.version}`),
    },
  })],
};
