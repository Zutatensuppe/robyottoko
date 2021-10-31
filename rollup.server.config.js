// rollup.config.js
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/bot.js',
  output: {
    dir: 'build/server',
    format: 'es',
  },
  external: [
    "ws",
    "multer",
    "express",
    "cookie-parser",
    "tmi.js",
    "twing",
    "better-sqlite3",
    "sib-api-v3-sdk",
    "node-fetch",
  ],
  plugins: [typescript(), nodeResolve()],
};
