// rollup.config.js
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/bot.js',
  output: {
    dir: 'build/server',
    format: 'es',
  },
  external: [
    "url",
    "path",
    "ws",
    "crypto",
    "multer",
    "express",
    "cookie-parser",
    "tmi.js",
    "twing",
    "fs",
    "better-sqlite3",
    "sib-api-v3-sdk",
    "node-fetch",
  ],
  plugins: [typescript()],
};
