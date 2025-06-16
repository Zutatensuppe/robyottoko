import type { PathOrFileDescriptor} from 'fs'
import { readFileSync } from 'fs'
import type { Config } from './types'

const absPath = (path: string): URL => new URL(path, import.meta.url)

const readJson = (path: PathOrFileDescriptor): any => JSON.parse(String(readFileSync(path)))

const init = (): Config => {
  const configFile = process.env.APP_CONFIG || 'config.json'
  if (configFile === '') {
    process.exit(2)
  }
  const config: Config = readJson(configFile)
  config.twitch.auto_tags = readJson(absPath('./config_data/tags_auto.json'))
  config.twitch.manual_tags = readJson(absPath('./config_data/tags_manual.json'))
  return config
}
const config: Config = init()

// TODO: better patch :)
export const setPublicUrl = (publicUrl: string) => {
  config.twitch.eventSub.transport.callback = `${publicUrl}/twitch/event-sub/`
}

export default config
