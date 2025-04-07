import { readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import config from '../src/config'
import TwitchHelixClient from '../src/services/TwitchHelixClient'

const c = new TwitchHelixClient(
  config.twitch.tmi.identity.client_id,
  config.twitch.tmi.identity.client_secret,
)
const file = __dirname + '/../src/config_data/tags_complete.json'
const readFrom = 'file';
(async () => {
  let tags: any[] = []
  if (readFrom === 'file') {
    // read from file
    const tagsJson = readFileSync(file, 'utf-8')
    tags = JSON.parse(tagsJson)
  } else {
    // read from api
    tags = await c.getAllTags()
    writeFileSync(file, JSON.stringify(tags))
  }
  const tagsMapManual: any = []
  const tagsMapAuto: any = []
  tags.forEach((tag: any) => {
    if (tag.is_auto) {
      tagsMapAuto.push({ id: tag.tag_id, name: tag.localization_names['en-us'] })
    } else {
      tagsMapManual.push({ id: tag.tag_id, name: tag.localization_names['en-us'] })
    }
  })
  writeFileSync(__dirname + '/../src/config_data/tags_manual.json', JSON.stringify(tagsMapManual))
  writeFileSync(__dirname + '/../src/config_data/tags_auto.json', JSON.stringify(tagsMapAuto))
})()
