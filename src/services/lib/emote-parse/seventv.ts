import type { Logger } from '../../../common/fn'
import { Service } from './Service'
import type { Emote, LoadedChannelAssets} from './types'
import { Provider, Scope } from './types'

const parseEmote = (obj: any): Emote | null => {
  const urls: Record<string, string> = {}
  obj.data.host.files.forEach((f: any) => {
    urls[f.name] = `${obj.data.host.url}/${f.name}`
  })
  const img = urls['4x.webp'] != undefined ? urls['4x.webp']
    : urls['2x.webp'] != undefined ? urls['2x.webp']
      : urls['1x.webp'] != undefined ? urls['1x.webp']
        : ''
  if (!img || !obj.name) {
    return null
  }
  return {
    code: obj.name,
    img,
    type: Provider.SEVENTV,
  }
}

const loadChannelEmotes = async (
  channelId: string,
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
) => {
  try {
    const res = await fetch(`https://7tv.io/v3/users/twitch/${channelId}`)
    const body = await res.json()
    const provider = Provider.SEVENTV
    const scope = Scope.CHANNEL
    Service.run(provider, scope, channel, log, () => {
      if (body.status_code === 404) {
        return
      }

      const emotes = body.emote_set?.emotes || []
      Object.values(emotes).forEach((seventvEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(seventvEmote))
      })
      Service.checkLoadedAll(loadedChannelAssets, provider, scope)
    })
  } catch (error) {
    log.error(error)
  }
}

const loadGlobalEmotes = async (
  loadedChannelAssets: LoadedChannelAssets,
) => {
  // 7TV doesnt have global emote api endpoint anymore
  // just set global to loaded
  Service.checkLoadedAll(loadedChannelAssets, Provider.SEVENTV, Scope.GLOBAL)
}

export default {
  loadChannelEmotes,
  loadGlobalEmotes,
}
