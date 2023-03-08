import { ChatUserstate } from 'tmi.js'
import { logger } from './../../common/fn'

const loadedAssets: Record<string, any> = {}

const log = logger('emote-parse.ts')

interface RepEmote {
  start: number
  end: number
  rep: string
}

function loadAssets(channel: string, channelId: string) {
  loadedAssets[channel] = {
    channel: channel,
    uid: '',
    emotes: [],
    badges: {},
    badgesLoaded: [false, false, false],
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
    },
  }
  loadedAssets[channel].uid = channelId
  loadConcurrent(channelId, channel)
}

function loadConcurrent(uid: string, channel: string) {
  // NOTE: FFZ

  fetch(`https://api.frankerfacez.com/v1/room/${channel}`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.sets).forEach(el => {
          const e = body.sets[el]
          e.emoticons.forEach((ele: any) => {
            ele.code = ele.name
            ele.type = 'ffz'
            loadedAssets[channel].emotes.push(ele)
          })
        })

        checkLoadedAll(channel, 'ffz', 'channel')
        if (loadedAssets[channel].allLoaded) {
          loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
        }

      } catch (error) {
        log.error({
          channel: channel,
          error: 'Failed to load FFz channel emotes for ' + channel,
        })
      }
    })

  fetch(`https://api.frankerfacez.com/v1/set/global`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.sets).forEach(el => {
          const e = body.sets[el]

          e.emoticons.forEach((ele: any) => {
            ele.code = ele.name
            ele.type = 'ffz'
            loadedAssets[channel].emotes.push(ele)
          })
        })

        checkLoadedAll(channel, 'ffz', 'global')
        if (loadedAssets[channel].allLoaded) {
          loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
        }
      } catch (error) {
        log.error({
          channel: channel,
          error: 'Failed to load global FFz channel emotes',
        })
      }

    })


  // NOTE: BTTV
  fetch(`https://api.betterttv.net/3/cached/users/twitch/${uid}`)
    .then(response => response.json())
    .then(body => {
      try {
        body.channelEmotes.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedAssets[channel].emotes.push(ele)
        })

        body.sharedEmotes.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedAssets[channel].emotes.push(ele)
        })

        checkLoadedAll(channel, 'bttv', 'channel')
        if (loadedAssets[channel].allLoaded) {
          loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
        }
      } catch (error) {
          log.error({
            channel: channel,
            error: 'Failed to load BetterTTV channel emotes for ' + channel,
          })
      }
    })

  fetch(`https://api.betterttv.net/3/cached/emotes/global`)
    .then(response => response.json())
    .then(body => {
      try {
        body.forEach((ele: any) => {
          ele.type = 'bttv'
          loadedAssets[channel].emotes.push(ele)
        })

        checkLoadedAll(channel, 'bttv', 'global')
        if (loadedAssets[channel].allLoaded) {
          loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
        }
      } catch (error) {
        log.error({
          channel: channel,
          error: 'Failed to load BetterTTV global emotes for ' + channel,
        })
      }
    })

  // NOTE: 7TV

  fetch(`https://api.7tv.app/v2/users/${channel}`)
    .then(response => response.json())
    .then(body => {
      try {
        if (body.Status == undefined && body.Status != 404) {
          fetch(`https://api.7tv.app/v2/users/${channel}/emotes`)
            .then(response => response.json())
            .then(body => {
              try {
                if (body.Status == undefined && body.Status != 404) {
                  body.forEach((ele: any) => {
                    ele.code = ele.name
                    ele.type = '7tv'
                    loadedAssets[channel].emotes.push(ele)
                  })

                  checkLoadedAll(channel, '7tv', 'channel')
                  if (loadedAssets[channel].allLoaded) {
                    loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
                  }
                } else {
                    log.error({
                      channel: channel,
                      error: 'Failed to load 7TV channel emotes for ' + channel,
                    })


                  checkLoadedAll(channel, '7tv', 'channel')
                }
              } catch (error) {
                  log.error({
                    channel: channel,
                    error: 'Failed to load 7TV channel emotes for ' + channel,
                  })
              }
            })

          fetch(`https://api.7tv.app/v2/emotes/global`)
            .then(response => response.json())
            .then(body => {
              try {
                body.forEach((ele: any) => {
                  ele.code = ele.name
                  ele.type = '7tv'
                  loadedAssets[channel].emotes.push(ele)
                })

                checkLoadedAll(channel, '7tv', 'global')
                if (loadedAssets[channel].allLoaded) {
                  loadedAssets[channel].emotes = loadedAssets[channel].emotes.sort(compareLength)
                }
              } catch (error) {
                  log.error({
                    channel: channel,
                    error: 'Failed to load 7TV global emotes for ' + channel,
                  })
              }
            })
        } else {
          log.error({
            channel: channel,
            error: 'No 7TV user available for ' + channel,
          })

          checkLoadedAll(channel, '7tv', 'channel')
          checkLoadedAll(channel, '7tv', 'global')
        }
      } catch (error) {
          log.error({
            channel: channel,
            error: 'Failed to load 7TV global emotes for ' + channel,
          })
      }
    })

  // NOTE: Twitch Badges

  fetch(`https://badges.twitch.tv/v1/badges/global/display`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.badge_sets).forEach((ele, _ind) => {
          Object.keys(body.badge_sets[ele].versions).forEach((el, _i) => {
            if (loadedAssets[channel].badges[ele + '/' + el] == undefined) {
              loadedAssets[channel].badges[ele + '/' + el] = {
                name: ele + '/' + el,
                info: body.badge_sets[ele].versions[el].title,
                img: body.badge_sets[ele].versions[el].image_url_4x,
              }
            }
          })
        })
        loadedAssets[channel].badgesLoaded[0] = true
        if (loadedAssets[channel].badgesLoaded.indexOf(false) == 2) {
          loadedAssets[channel].badgesLoaded[2] = true
        }
      } catch (error) {
          log.error({
            channel: channel,
            error: 'Failed to load global badges for ' + channel,
          })
      }
    })

  fetch(`https://badges.twitch.tv/v1/badges/channels/${uid}/display`)
    .then(response => response.json())
    .then(body => {
      try {
        Object.keys(body.badge_sets).forEach((ele, _ind) => {
          Object.keys(body.badge_sets[ele].versions).forEach((el, _i) => {
            loadedAssets[channel].badges[ele + '/' + el] = {
              name: ele + '/' + el,
              info: body.badge_sets[ele].versions[el].title,
              img: body.badge_sets[ele].versions[el].image_url_4x,
            }
          })
        })
        loadedAssets[channel].badgesLoaded[1] = true
        if (loadedAssets[channel].badgesLoaded.indexOf(false) == 2) {
          loadedAssets[channel].badgesLoaded[2] = true
        }
      } catch (error) {
          log.error({
            channel: channel,
            error: 'Failed to load channel badges for ' + channel,
          })
      }
    })
}

function checkLoadedAll(channel: string, type: string, extra: string) {
  if (loadedAssets[channel].loaded[type][extra] == false) {
    loadedAssets[channel].loaded[type][extra] = true
  }

  const trueVals: boolean[] = []
  Object.keys(loadedAssets[channel].loaded).forEach((e, _ind) => {
    e = loadedAssets[channel].loaded[e]
    let allTrue = true
    Object.keys(e).forEach(ele => {
      // @ts-ignore
      ele = e[ele]
      // @ts-ignore
      if (ele == false) {
        allTrue = false
      }
    })

    trueVals.push(allTrue)
  })

  loadedAssets[channel].allLoaded = !trueVals.includes(false)
  return !trueVals.includes(false)

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

function compareEnd(a: { end: number } , b: { end: number }) {
  if (a.end < b.end) {
    return -1
  }
  if (a.end > b.end) {
    return 1
  }
  return 0
}

function getMessageEmotes(message: string, tags: ChatUserstate, channel: string) {
  let emotes: RepEmote[] = []
  const gotEmotes: any[] = []
  if (tags.emotes != null && typeof tags.emotes !== undefined) {
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

  const fEmotes = replaceBTTVAll(message, channel)

  fEmotes.forEach(ele => {
    gotEmotes.push(ele)
  })

  return gotEmotes
}

function replaceBTTVAll(msg: string, channel: string) {
  const emotes: any[] = []
  const channelEmotes = loadedAssets[channel]?.emotes || []
  channelEmotes.forEach((ele: any) => {
    const regex = new RegExp(`(^${ele.code}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${ele.code}$|\\s${ele.code}(?=[^?!."_*+#'´\`\\/%&$€§=])|(?=[^?!."_*+#'´\`\\/%&$€§=])${ele.code}\\s)`, 'm')
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
          const poss = ele.urls[3][1] != undefined ? ele.urls[3][1] : ele.urls[2][1] != undefined ? ele.urls[2][1] : ele.urls[1][1]
          emotes.push({
            code: ele.code,
            img: poss,
            type: '7tv',
          })
        }
      }
    } while (m)
  })
  return emotes
}

export const loadAssetsForChannel = (channel: string, channelId: string) => {
  loadAssets(channel.replace('#', '').trim().toLowerCase(), channelId)
}

export const getEmotes = function (message: string, tags: ChatUserstate, channel: string) {
  return getMessageEmotes(message, tags, channel.replace('#', '').trim().toLowerCase())
}
