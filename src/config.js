import fs from 'fs'

let config

export const init = () => {
  let configFile = ''
  let last = ''
  for (const val of process.argv) {
    if (last === '-c') {
      configFile = val
    }
    last = val
  }

  if (configFile === '') {
    process.exit(2)
  }

  config = JSON.parse(String(fs.readFileSync(configFile)))
  return config
}

export default config
