import { readFileSync } from 'fs'
import { Config } from './types'

const init = (): Config => {
  const configFile = process.env.APP_CONFIG || ''
  if (configFile === '') {
    process.exit(2)
  }
  const config: Config = JSON.parse(String(readFileSync(configFile)))

  config.twitch.auto_tags = JSON.parse(
    String(readFileSync(new URL('./config_data/tags_auto.json', import.meta.url)))
  );
  config.twitch.manual_tags = JSON.parse(
    String(readFileSync(new URL('./config_data/tags_manual.json', import.meta.url)))
  );

  return config
}
const config: Config = init()

// TODO: better patch :)
export const setPublicUrl = (publicUrl: string) => {
  config.twitch.eventSub.transport.callback = `${publicUrl}/twitch/event-sub/`
}

export default config
