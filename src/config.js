import fs from 'fs'

const init = () => {
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
  return JSON.parse(String(fs.readFileSync(configFile)))
}
const config = init()

export default config
