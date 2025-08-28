import { logger, MINUTE } from './../../../common/fn'
import type { TwitchHelixClient } from '../../TwitchHelixClient'
import type { TwitchContext } from '../../twitch'
import { Provider } from './types'
import type { Emote, LoadedChannelAssets, RepEmote } from './types'
import bttv from './bttv'
import ffz from './ffz'
import seventv from './seventv'
import twitch from './twitch'

const loadedAssets: Record<string, LoadedChannelAssets> = {}

const log = logger('emote-parse.ts')

async function loadConcurrent(
  channelId: string,
  channel: string,
  helixClient: TwitchHelixClient,
): Promise<LoadedChannelAssets> {
  const loadedChannelAssets: LoadedChannelAssets = {
    lastLoadedTs: null,
    channel,
    channelId,
    emotes: [] as any[],
    loaded: {
      [Provider.BTTV]: { global: false, channel: false },
      [Provider.FFZ]: { global: false, channel: false },
      [Provider.SEVENTV]: { global: false, channel: false },
      [Provider.TWITCH]: { global: false, channel: false },
    },
  }

  await Promise.allSettled([
    ffz.loadChannelEmotes(channel, loadedChannelAssets, log),
    ffz.loadGlobalEmotes(channel, loadedChannelAssets, log),
    bttv.loadChannelEmotes(channelId, channel, loadedChannelAssets, log),
    bttv.loadGlobalEmotes(channel, loadedChannelAssets, log),
    seventv.loadChannelEmotes(channelId, channel, loadedChannelAssets, log),
    seventv.loadGlobalEmotes(loadedChannelAssets),
    twitch.loadChannelEmotes(channelId, channel, loadedChannelAssets, log, helixClient),
    twitch.loadGlobalEmotes(channel, loadedChannelAssets, log, helixClient),
  ])

  return loadedChannelAssets
}

function compareEnd(a: { end: number }, b: { end: number }) {
  if (a.end < b.end) {
    return 1
  }
  if (a.end > b.end) {
    return -1
  }
  return 0
}

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&')
}

function detectEmotesInMessage(msg: string, channel: string): Emote[] {
  const emotes: Emote[] = []
  const channelEmotes = loadedAssets[channel]?.emotes || []

  channelEmotes.forEach((ele) => {
    const escCode = escapeRegex(ele.code)
    const regex = new RegExp(`(^${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}$|\\s${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}\\s)`, 'm')
    let m = null
    do {
      m = msg.match(regex)
      msg = msg.replace(regex, '')
      if (m) {
        emotes.push(ele)
      }
    } while (m)
  })
  return emotes
}

function detectTwitchEmotes(message: string, userstate: TwitchContext | null): Emote[] {
  if (!userstate || userstate.emotes === null || typeof userstate.emotes === 'undefined') {
    return []
  }

  const repEmotes: RepEmote[] = []
  const userstateEmotes = userstate.emotes
  Object.keys(userstateEmotes).forEach((el, ind) => {
    userstateEmotes[el].forEach((ele: any) => {
      repEmotes.push({
        start: parseInt(ele.split('-')[0]),
        end: parseInt(ele.split('-')[1]),
        rep: Object.keys(userstateEmotes)[ind],
      })
    })
  })
  repEmotes.sort(compareEnd)

  const emotes: Emote[] = []
  repEmotes.forEach((ele) => {
    emotes.push({
      code: message.substring(ele.start, ele.end + 1),
      img: `https://static-cdn.jtvnw.net/emoticons/v2/${ele.rep}/default/dark/3.0`,
      type: Provider.TWITCH,
    })
    message = message.substring(0, ele.start) + message.substring(ele.end + 1, message.length)
  })
  return emotes
}

export const loadAssetsForChannel = async (
  channel: string,
  channelId: string,
  helixClient: TwitchHelixClient,
): Promise<void> => {
  if (!channel || !channelId) {
    return
  }

  const now = new Date().getTime()
  const lastLoadedTs = loadedAssets[channel]
    ? loadedAssets[channel].lastLoadedTs
    : null
  if (lastLoadedTs && (now - lastLoadedTs) < 10 * MINUTE) {
    return
  }

  loadedAssets[channel] = await loadConcurrent(channelId, channel, helixClient)
  loadedAssets[channel].lastLoadedTs = now
}

export const getTwitchEmotes = (
  message: string,
  userstate: TwitchContext | null,
  channel: string,
): Emote[] => {
  const emotes: Emote[] = []
  emotes.push(...detectTwitchEmotes(message, userstate))
  emotes.push(...detectEmotesInMessage(message, channel))
  return emotes
}
