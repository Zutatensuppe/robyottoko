import type { Logger } from '../../../common/fn'
import type { Emote, LoadedChannelAssets, Scope } from './types'
import { Provider } from './types'

function compareLength(a: { code: string }, b: { code: string }) {
  if (a.code.length < b.code.length) {
    return 1
  }
  if (a.code.length > b.code.length) {
    return -1
  }
  return 0
}

export class Service {
  public static errorMessage (provider: Provider, scope: Scope, channel: string) {
    return `Failed to load ${provider} ${scope} emotes for ${channel}`
  }

  public static tryAddEmote(
    loadedChannelAssets: LoadedChannelAssets,
    emote: Emote | null,
  ): void {
    if (!emote) {
      return
    }
    loadedChannelAssets.emotes.push(emote)
  }

  public static checkLoadedAll(
    loadedChannelAssets: LoadedChannelAssets,
    provider: Provider,
    scope: Scope,
  ): void {
    loadedChannelAssets.loaded[provider][scope] = true

    const allLoaded = (
      loadedChannelAssets.loaded[Provider.BTTV].channel === true
      && loadedChannelAssets.loaded[Provider.BTTV].global === true
      && loadedChannelAssets.loaded[Provider.FFZ].channel === true
      && loadedChannelAssets.loaded[Provider.FFZ].global === true
      && loadedChannelAssets.loaded[Provider.SEVENTV].channel === true
      && loadedChannelAssets.loaded[Provider.SEVENTV].global === true
      && loadedChannelAssets.loaded[Provider.TWITCH].channel === true
      && loadedChannelAssets.loaded[Provider.TWITCH].global === true
    )
    if (allLoaded) {
      loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
    }
  }

  public static run (
    provider: Provider,
    scope: Scope,
    channel: string,
    log: Logger,
    fn: () => void,
  ): void {
    try {
      fn()
    } catch (error) {
      const message = Service.errorMessage(provider, scope, channel)
      log.error({ channel, message, error })
    }
  }
}
