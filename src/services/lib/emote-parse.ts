import { ChatUserstate } from 'tmi.js'
import { logger, MINUTE } from './../../common/fn'
import TwitchHelixClient from '../TwitchHelixClient'

const loadedAssets: Record<string, any> = {}

const log = logger('emote-parse.ts')

interface RepEmote {
  start: number
  end: number
  rep: string
}

async function loadAssets(channel: string, channelId: string, helixClient: TwitchHelixClient) {
  const ts = new Date().getTime()
  if (
    loadedAssets[channel]
    && loadedAssets[channel].lastLoadedTs
    && (ts - loadedAssets[channel].lastLoadedTs) < 10 * MINUTE
  ) {
    return
  }

  loadedAssets[channel] = await loadConcurrent(channelId, channel, helixClient)
  loadedAssets[channel].lastLoadedTs = ts
}

async function loadConcurrent(uid: string, channel: string, helixClient: TwitchHelixClient) {
  // NOTE: FFZ

  const loadedChannelAssets = {
    lastLoadedTs: null,
    channel,
    uid,
    emotes: [] as any[],
    allLoaded: false,
    loaded: {
      'bttv': {
        global: false,
        channel: false,
      },
      'ffz': {
        global: false,
        channel: false,
      },
      '7tv': {
        global: false,
        channel: false,
      },
      'twitch': {
        global: false,
        channel: false,
      },
    },
  }

  function checkLoadedAll(type: 'bttv' | 'ffz' | '7tv' | 'twitch', extra: 'global' | 'channel') {
    if (loadedChannelAssets.loaded[type][extra] == false) {
      loadedChannelAssets.loaded[type][extra] = true
    }

    const trueVals: boolean[] = []
    Object.keys(loadedChannelAssets.loaded).forEach((e: string, _ind) => {
      const obj = loadedChannelAssets.loaded[e as 'bttv' | 'ffz' | '7tv' | 'twitch']
      let allTrue = true
      Object.keys(obj).forEach(ele => {
        // @ts-ignore
        ele = e[ele]
        // @ts-ignore
        if (ele == false) {
          allTrue = false
        }
      })

      trueVals.push(allTrue)
    })

    loadedChannelAssets.allLoaded = !trueVals.includes(false)
    return !trueVals.includes(false)
  }

  const promises: Promise<void>[] = []

  promises.push(fetch(`https://api.frankerfacez.com/v1/room/${channel}`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.sets).forEach(el => {
          const e = body.sets[el]
          e.emoticons.forEach((ele: any) => {
            ele.code = ele.name
            ele.type = 'ffz'
            loadedChannelAssets.emotes.push(ele)
          })
        })

        checkLoadedAll('ffz', 'channel')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }

      } catch (error) {
        log.error({
          channel,
          message: '(1) Failed to load FFz channel emotes for ' + channel,
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(fetch(`https://api.frankerfacez.com/v1/set/global`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.sets).forEach(el => {
          const e = body.sets[el]

          e.emoticons.forEach((ele: any) => {
            ele.code = ele.name
            ele.type = 'ffz'
            loadedChannelAssets.emotes.push(ele)
          })
        })

        checkLoadedAll('ffz', 'global')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }
      } catch (error) {
        log.error({
          channel,
          message: 'Failed to load global FFz channel emotes',
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))


  // NOTE: BTTV
  promises.push(fetch(`https://api.betterttv.net/3/cached/users/twitch/${uid}`)
    .then(response => response.json())
    .then(body => {
      try {
        body.channelEmotes.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedChannelAssets.emotes.push(ele)
        })

        body.sharedEmotes.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedChannelAssets.emotes.push(ele)
        })

        checkLoadedAll('bttv', 'channel')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }
      } catch (error) {
        log.error({
          channel,
          message: 'Failed to load BetterTTV channel emotes for ' + channel,
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(fetch(`https://api.betterttv.net/3/cached/emotes/global`)
    .then(response => response.json())
    .then(body => {
      try {
        body.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedChannelAssets.emotes.push(ele)
        })

        checkLoadedAll('bttv', 'global')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }
      } catch (error) {
        log.error({
          channel,
          message: 'Failed to load BetterTTV global emotes for ' + channel,
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  // NOTE: 7TV
  promises.push(fetch(`https://api.7tv.app/v3/users/twitch/${uid}`)
    .then(response => response.json())
    .then(body => {
      try {
        if (body.emote_set?.emotes) {
          body.emote_set?.emotes.forEach((emote: any) => {
            const urls: Record<string, string> = {}
            emote.data.host.files.forEach((f: any) => {
              urls[f.name] = emote.data.host.url + '/' + f.name
            })
            loadedChannelAssets.emotes.push({
              code: emote.name,
              type: '7tv',
              urls,
            })
          })
          checkLoadedAll('7tv', 'channel')
          if (loadedChannelAssets.allLoaded) {
            loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
          }
        } else {
          log.error({
            channel,
            message: 'No 7TV user available for ' + channel,
          })
        }
      } catch (error) {
        log.error({
          channel,
          message: 'Failed to load 7TV channel emotes for ' + channel,
          error,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

    promises.push(fetch(`https://api.7tv.app/v2/emotes/global`)
      .then(response => response.json())
      .then(body => {
        try {
          body.forEach((ele: any) => {
            const urls: Record<string, string> = {}
            if (ele.urls[3]) {
              urls['4x.webp'] = ele.urls[3][1]
            }
            if (ele.urls[2]) {
              urls['3x.webp'] = ele.urls[2][1]
            }
            if (ele.urls[1]) {
              urls['2x.webp'] = ele.urls[1][1]
            }
            if (ele.urls[0]) {
              urls['1x.webp'] = ele.urls[0][1]
            }
            loadedChannelAssets.emotes.push({
              code: ele.name,
              type: '7tv',
              urls,
            })
          })

          checkLoadedAll('7tv', 'global')
          if (loadedChannelAssets.allLoaded) {
            loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
          }
        } catch (error) {
          log.error({
            channel,
            message: 'Failed to load 7TV global emotes for ' + channel,
            error,
          })
        }
      }).catch((e) => {
        log.error(e)
      }))

  // Note: TWITCH
  promises.push(helixClient.getChannelEmotes(uid)
    .then(body => {
      if (body) {
        body.data.forEach((ele: any) => {
          const url: string = ele.images['url_4x']
            || ele.images['url_2x']
            || ele.images['url_1x']
            || ''
          loadedChannelAssets.emotes.push({
            code: ele.name,
            type: 'twitch',
            url,
          })
        })

        checkLoadedAll('twitch', 'channel')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }
      } else {
        log.error({
          message: 'Failed to load TWITCH channel emotes for ' + channel,
        })
      }
    }).catch((e) => {
      log.error(e)
    }))

  promises.push(helixClient.getGlobalEmotes()
    .then(body => {
      if (body) {
        body.data.forEach((ele: any) => {
          const url: string = ele.images['url_4x']
            || ele.images['url_2x']
            || ele.images['url_1x']
            || ''
          loadedChannelAssets.emotes.push({
            code: ele.name,
            type: 'twitch',
            url,
          })
        })

        checkLoadedAll('twitch', 'global')
        if (loadedChannelAssets.allLoaded) {
          loadedChannelAssets.emotes = loadedChannelAssets.emotes.sort(compareLength)
        }
      } else {
        log.error({
          message: 'Failed to load TWITCH global emotes for ' + channel,
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
    return -1
  }
  if (a.end > b.end) {
    return 1
  }
  return 0
}

function getMessageEmotes(message: string, tags: ChatUserstate | null, channel: string) {
  let emotes: RepEmote[] = []
  const gotEmotes: any[] = []
  if (tags && tags.emotes != null && typeof tags.emotes !== undefined) {
    const tagEmotes = tags.emotes
    Object.keys(tagEmotes).forEach((el, ind) => {
      const em = tagEmotes[el]
      em.forEach((ele: any) => {
        const start = parseInt(ele.split('-')[0])
        const end = parseInt(ele.split('-')[1])
        emotes.push({
          start: start,
          end: end,
          rep: Object.keys(tagEmotes)[ind],
        })
      })
    })

    emotes.sort(compareEnd)
    emotes = emotes.reverse()

    emotes.forEach((ele, _ind) => {
      const code = message.substring(ele.start, ele.end + 1)
      gotEmotes.push({
        code: code,
        img: `https://static-cdn.jtvnw.net/emoticons/v2/${ele.rep}/default/dark/3.0`,
        type: 'twitch',
      })
      message = message.substring(0, ele.start) + message.substring(ele.end + 1, message.length)
    })
  }

  const fEmotes = replaceAll(message, channel)

  fEmotes.forEach(ele => {
    gotEmotes.push(ele)
  })

  return gotEmotes
}

function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+!<=:?./\\^$|#\s,]/g, '\\$&')
}

function replaceAll(msg: string, channel: string) {
  const emotes: any[] = []
  const channelEmotes = loadedAssets[channel]?.emotes || []
  channelEmotes.forEach((ele: any) => {
    const escCode = escapeRegex(ele.code)
    const regex = new RegExp(`(^${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}$|\\s${escCode}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${escCode}\\s)`, 'm')
    let m = null
    do {
      m = msg.match(regex)
      msg = msg.replace(regex, '')
      if (m) {
        if (ele.type == 'bttv') {
          emotes.push({
            code: ele.code,
            img: `https://cdn.betterttv.net/emote/${ele.id}/3x`,
            type: 'bttv',
          })
        } else if (ele.type == 'ffz') {
          const poss = ele.urls[4] != undefined ? ele.urls[4] : ele.urls[2] != undefined ? ele.urls[2] : ele.urls[1]
          emotes.push({
            code: ele.code,
            img: `https:${poss}`,
            type: 'ffz',
          })
        } else if (ele.type == '7tv') {
          const poss = ele.urls['4x.webp'] != undefined ? ele.urls['4x.webp']
            : ele.urls['2x.webp'] != undefined ? ele.urls['2x.webp']
            : ele.urls['1x.webp'] != undefined ? ele.urls['1x.webp']
            : ''
          if (poss) {
            emotes.push({
              code: ele.code,
              img: poss,
              type: '7tv',
            })
          }
        } else if (ele.type == 'twitch') {
          if (ele.url) {
            emotes.push({
              code: ele.code,
              img: ele.url,
              type: 'twitch',
            })
          }
        }
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
