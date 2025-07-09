import type { Logger } from '../../../common/fn'
import { Service } from './Service'
import type { Emote, LoadedChannelAssets} from './types'
import { Scope} from './types'
import { Provider } from './types'

const parseEmote = (obj: any): Emote | null => {
  const img = obj.urls[4] != undefined ? obj.urls[4]
    : obj.urls[2] != undefined ? obj.urls[2]
      : obj.urls[1]
  if (!obj.name) {
    return null
  }
  return {
    code: obj.name,
    img: `https:${img}`,
    type: Provider.FFZ,
  }
}

let globalFfzEmotesBody: any | null
const fetchGlobalEmotes = async () => {
  if (!globalFfzEmotesBody) {
    const res = await fetch(`https://api.frankerfacez.com/v1/set/global`)
    globalFfzEmotesBody = await res.json()
  }
  return globalFfzEmotesBody
}

const parseBody = (
  body: any,
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  scope: Scope,
  log: Logger,
) => {
  const provider = Provider.FFZ
  Service.run(provider, scope, channel, log, () => {
    if (body.status === 404) {
      return
    }

    Object.values(body.sets).forEach((emoteSet: any) => {
      Object.values(emoteSet.emoticons).forEach((ffzEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(ffzEmote))
      })
    })

    Service.checkLoadedAll(loadedChannelAssets, provider, scope)
  })
}

const loadGlobalEmotes = async (
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
) => {
  try {
    const body = await fetchGlobalEmotes()
    parseBody(body, channel, loadedChannelAssets, Scope.GLOBAL, log)
  } catch (error) {
    log.error(error)
  }
}

const loadChannelEmotes = async (
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
) => {
  try {
    const res = await fetch(`https://api.frankerfacez.com/v1/room/${channel}`)
    const body = await res.json()
    parseBody(body, channel, loadedChannelAssets, Scope.CHANNEL, log)
  } catch (error) {
    log.error(error)
  }
}

export default {
  loadChannelEmotes,
  loadGlobalEmotes,
}
