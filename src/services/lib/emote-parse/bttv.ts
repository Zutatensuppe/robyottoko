import type { Logger } from '../../../common/fn'
import { Service } from './Service'
import type { Emote, LoadedChannelAssets } from './types'
import { Provider, Scope } from './types'

const parseEmote = (obj: any): Emote | null => {
  if (!obj.code) {
    return null
  }
  return {
    code: obj.code,
    img: `https://cdn.betterttv.net/emote/${obj.id}/3x`,
    type: Provider.BTTV,
  }
}

let globalBttvEmotesBody: any | null
async function fetchGlobalEmotes() {
  if (!globalBttvEmotesBody) {
    const res = await fetch(`https://api.betterttv.net/3/cached/emotes/global`)
    globalBttvEmotesBody = await res.json()
  }
  return globalBttvEmotesBody
}

const loadChannelEmotes = async (
  channelId: string,
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
) => {
  try {
    const res = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`)
    const body = await res.json()
    const provider = Provider.BTTV
    const scope = Scope.CHANNEL
    Service.run(provider, scope, channel, log, () => {
      if (body.message === 'user not found') {
        return
      }

      Object.values(body.channelEmotes).forEach((bttvEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(bttvEmote))
      })

      Object.values(body.sharedEmotes).forEach((bttvEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(bttvEmote))
      })

      Service.checkLoadedAll(loadedChannelAssets, provider, scope)
    })
  } catch (error) {
    log.error(error)
  }
}

const loadGlobalEmotes = async (
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
): Promise<void> => {
  try {
    const body = await fetchGlobalEmotes()
    const provider = Provider.BTTV
    const scope = Scope.GLOBAL
    Service.run(provider, scope, channel, log, () => {
      Object.values(body).forEach((bttvEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(bttvEmote))
      })

      Service.checkLoadedAll(loadedChannelAssets, provider, scope)
    })
  } catch (error) {
    log.error(error)
  }
}

export default {
  loadChannelEmotes,
  loadGlobalEmotes,
}
