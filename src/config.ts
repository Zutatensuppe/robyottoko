import fs from 'fs'

const init = () => {
  const configFile = process.env.APP_CONFIG || ''
  if (configFile === '') {
    process.exit(2)
  }
  return JSON.parse(String(fs.readFileSync(configFile)))
}
const config = init()

export default config
