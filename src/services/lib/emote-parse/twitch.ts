import type { Logger } from '../../../common/fn'
import type { TwitchHelixClient } from '../../TwitchHelixClient'
import type { TwitchHelixChannelEmotesResponseData, TwitchHelixGlobalEmotesResponseData } from '../../TwitchHelixClient'
import { Service } from './Service'
import type { Emote, LoadedChannelAssets } from './types'
import { Provider, Scope } from './types'

const parseEmote = (obj: any): Emote | null => {
  const url: string = obj.images['url_4x']
    || obj.images['url_2x']
    || obj.images['url_1x']
    || ''
  if (!url || !obj.name) {
    return null
  }
  return {
    code: obj.name,
    img: url,
    type: Provider.TWITCH,
  }
}

const loadChannelEmotes = async (
  channelId: string,
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
  helixClient: TwitchHelixClient,
) => {
  try {
    const body = await helixClient.getChannelEmotes(channelId)
    parseBody(body, channel, loadedChannelAssets, Scope.CHANNEL, log)
  } catch (error) {
    log.error(error)
  }
}

let globalTwitchEmotesBody: TwitchHelixGlobalEmotesResponseData | null
async function fetchGlobalEmotes(helixClient: TwitchHelixClient) {
  if (!globalTwitchEmotesBody) {
    globalTwitchEmotesBody = await helixClient.getGlobalEmotes()
  }
  return globalTwitchEmotesBody
}

const loadGlobalEmotes = async (
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  log: Logger,
  helixClient: TwitchHelixClient,
) => {
  try {
    const body = await fetchGlobalEmotes(helixClient)
    parseBody(body, channel, loadedChannelAssets, Scope.GLOBAL, log)
  } catch (error) {
    log.error(error)
  }
}

const parseBody = (
  body: TwitchHelixChannelEmotesResponseData | TwitchHelixGlobalEmotesResponseData | null,
  channel: string,
  loadedChannelAssets: LoadedChannelAssets,
  scope: Scope,
  log: Logger,
) => {
  const provider = Provider.TWITCH
  Service.run(provider, scope, channel, log, () => {
    if (body && body.data) {
      Object.values(body.data).forEach((twitchEmote: any) => {
        Service.tryAddEmote(loadedChannelAssets, parseEmote(twitchEmote))
      })

      Service.checkLoadedAll(loadedChannelAssets, provider, scope)
    } else {
      throw new Error('Invalid response body')
    }
  })
}

export default {
  loadChannelEmotes,
  loadGlobalEmotes,
}
