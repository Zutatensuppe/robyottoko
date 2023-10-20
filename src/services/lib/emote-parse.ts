import { ChatUserstate } from 'tmi.js'
import { logger, MINUTE } from './../../common/fn'
import TwitchHelixClient from '../TwitchHelixClient'

const loadedAssets: Record<string, LoadedChannelAssets> = {}

const log = logger('emote-parse.ts')

interface RepEmote {
  start: number
  end: number
  rep: string
}

interface Emote {
  code: string
  img: string
  type: Provider
}

enum Scope {
  GLOBAL = 'global',
  CHANNEL = 'channel',
}

type ScopeMap = Record<Scope, boolean>

interface LoadedChannelAssets {
  lastLoadedTs: null | number
  channel: string
  channelId: string
  emotes: Emote[]
  allLoaded: boolean
  loaded: {
    [Provider.BTTV]: ScopeMap,
    [Provider.FFZ]: ScopeMap,
    [Provider.SEVENTV]: ScopeMap,
    [Provider.TWITCH]: ScopeMap,
  },
}

enum Provider {
  BTTV = 'bttv',
  FFZ = 'ffz',
  SEVENTV = '7tv',
  TWITCH = 'twitch',
}

const errorMessage = (provider: Provider, scope: Scope, channel: string) => {
  return `Failed to load ${provider} ${scope} emotes for ${channel}`
}

const parseTwitchEmote = (obj: any): Emote | null => {
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

const parseBttvEmote = (obj: any): Emote | null => {
  if (!obj.code) {
    return null
  }
  return {
    code: obj.code,
    img: `https://cdn.betterttv.net/emote/${obj.id}/3x`,
    type: Provider.BTTV,
  }
}

const parseFfzEmote = (obj: any): Emote | null => {
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

const parseSeventvV2Emote = (obj: any): Emote | null => {
  const urls: Record<string, string> = {}
  if (obj.urls[3]) {
    urls['4x.webp'] = obj.urls[3][1]
  }
  if (obj.urls[2]) {
    urls['3x.webp'] = obj.urls[2][1]
  }
  if (obj.urls[1]) {
    urls['2x.webp'] = obj.urls[1][1]
  }
  if (obj.urls[0]) {
    urls['1x.webp'] = obj.urls[0][1]
  }
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

const parseSeventvV3Emote = (obj: any): Emote | null => {
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

async function loadAssets(channel: string, channelId: string, helixClient: TwitchHelixClient) {
  if (!channel || !channelId) {
    return
  }

  const now = new Date().getTime()
  const lastLoadedTs = loadedAssets[channel] ? loadedAssets[channel].lastLoadedTs : null
  if (lastLoadedTs && (now - lastLoadedTs) < 10 * MINUTE) {
    return
  }

  loadedAssets[channel] = await loadConcurrent(channelId, channel, helixClient)
  loadedAssets[channel].lastLoadedTs = now
}

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
    allLoaded: false,
    loaded: {
      [Provider.BTTV]: { global: false, channel: false },
      [Provider.FFZ]: { global: false, channel: false },
      [Provider.SEVENTV]: { global: false, channel: false },
      [Provider.TWITCH]: { global: false, channel: false },
    },
  }

  function checkLoadedAll(type: Provider, scope: Scope) {
    if (loadedChannelAssets.loaded[type][scope] == false) {
      loadedChannelAssets.loaded[type][scope] = true
    }

    const trueVals: boolean[] = []
    Object.keys(loadedChannelAssets.loaded).forEach((e: string, _ind) => {
      const obj = loadedChannelAssets.loaded[e as Provider]
      const allTrue = !Object.values(obj).includes(false)
      trueVals.push(allTrue)
    })

    loadedChannelAssets.allLoaded = !trueVals.includes(false)
    if (loadedChannelAssets.allLoaded) {
      loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
    }
  }

  const promises: Promise<void>[] = []

  // NOTE: FFZ
  promises.push(fetch(`https://api.frankerfacez.com/v1/room/${channel}`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.FFZ
      const scope = Scope.CHANNEL
      try {
        if (body.status === 404) {
          return
        }

        Object.keys(body.sets).forEach(el => {
          const e = body.sets[el]
          e.emoticons.forEach((ele: any) => {
            const emote = parseFfzEmote(ele)
            if (emote) {
              loadedChannelAssets.emotes.push(emote)
            }
          })
        })

        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(fetch(`https://api.frankerfacez.com/v1/set/global`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.FFZ
      const scope = Scope.GLOBAL
      try {
        Object.values(body.sets).forEach((emoteSet: any) => {
          Object.values(emoteSet.emoticons).forEach((globalEmote: any) => {
            const emote = parseFfzEmote(globalEmote)
            if (emote) {
              loadedChannelAssets.emotes.push(emote)
            }
          })
        })

        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))


  // NOTE: BTTV
  promises.push(fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.BTTV
      const scope = Scope.CHANNEL
      try {
        if (body.message === 'user not found') {
          return
        }

        Object.values(body.channelEmotes).forEach((channelEmote: any) => {
          const emote = parseBttvEmote(channelEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        Object.values(body.sharedEmotes).forEach((sharedEmote: any) => {
          const emote = parseBttvEmote(sharedEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(fetch(`https://api.betterttv.net/3/cached/emotes/global`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.BTTV
      const scope = Scope.GLOBAL
      try {
        Object.values(body).forEach((globalEmote: any) => {
          const emote = parseBttvEmote(globalEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  // NOTE: 7TV
  promises.push(fetch(`https://api.7tv.app/v3/users/twitch/${channelId}`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.SEVENTV
      const scope = Scope.CHANNEL
      try {
        if (body.status_code === 404) {
          return
        }
        const emotes = body.emote_set?.emotes || []
        Object.values(emotes).forEach((channelEmote: any) => {
          const emote = parseSeventvV3Emote(channelEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })
        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(fetch(`https://api.7tv.app/v2/emotes/global`)
    .then(response => response.json())
    .then(body => {
      const provider = Provider.SEVENTV
      const scope = Scope.GLOBAL
      try {
        Object.values(body).forEach((globalEmote: any) => {
          const emote = parseSeventvV2Emote(globalEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        checkLoadedAll(provider, scope)
      } catch (error) {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  // Note: TWITCH
  promises.push(helixClient.getChannelEmotes(channelId)
    .then(body => {
      const provider = Provider.TWITCH
      const scope = Scope.CHANNEL
      if (body) {
        Object.values(body.data).forEach((channelEmote: any) => {
          const emote = parseTwitchEmote(channelEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        checkLoadedAll(provider, scope)
      } else {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error: null,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(helixClient.getGlobalEmotes()
    .then(body => {
      const provider = Provider.TWITCH
      const scope = Scope.GLOBAL
      if (body) {
        Object.values(body.data).forEach((globalEmote: any) => {
          const emote = parseTwitchEmote(globalEmote)
          if (emote) {
            loadedChannelAssets.emotes.push(emote)
          }
        })

        checkLoadedAll(provider, scope)
      } else {
        log.error({
          channel,
          message: errorMessage(provider, scope, channel),
          error: null,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  await Promise.allSettled(promises)

  return loadedChannelAssets
}

function compareLength(a: { code: string }, b: { code: string }) {
  if (a.code.length < b.code.length) {
    return 1
  }
  if (a.code.length > b.code.length) {
    return -1
  }
  return 0
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

function getMessageEmotes(message: string, userstate: ChatUserstate | null, channel: string) {
  const emotes: Emote[] = []
  if (
    userstate &&
    userstate.emotes != null &&
    typeof userstate.emotes !== 'undefined'
  ) {
    const repEmotes: RepEmote[] = []
    const userstateEmotes = userstate.emotes
    Object.keys(userstateEmotes).forEach((el, ind) => {
      const em = userstateEmotes[el]
      em.forEach((ele: any) => {
        repEmotes.push({
          start: parseInt(ele.split('-')[0]),
          end: parseInt(ele.split('-')[1]),
          rep: Object.keys(userstateEmotes)[ind],
        })
      })
    })
    repEmotes.sort(compareEnd)
    repEmotes.forEach((ele) => {
      emotes.push({
        code: message.substring(ele.start, ele.end + 1),
        img: `https://static-cdn.jtvnw.net/emoticons/v2/${ele.rep}/default/dark/3.0`,
        type: Provider.TWITCH,
      })
      message = message.substring(0, ele.start) + message.substring(ele.end + 1, message.length)
    })
  }
  emotes.push(...detectEmotesInMessage(message, channel))
  return emotes
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

export const loadAssetsForChannel = async (
  channel: string,
  channelId: string,
  helixClient: TwitchHelixClient,
): Promise<void> => {
  await loadAssets(channel.replace('#', '').trim().toLowerCase(), channelId, helixClient)
}

export const getEmotes = function (message: string, tags: ChatUserstate | null, channel: string) {
  return getMessageEmotes(message, tags, channel.replace('#', '').trim().toLowerCase())
}
