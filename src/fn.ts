import xhr from './net/xhr'
import { SECOND, MINUTE, HOUR, DAY, MONTH, YEAR, logger, getRandom, getRandomInt, daysUntil } from './common/fn'

import {
  Command, RawCommand, TwitchEventContext,
  TwitchChatClient, FunctionCommand, Module, CommandTrigger,
  Bot, CommandEffectType, CommandMatch,
} from './types'
import { User } from './repo/Users'
import TwitchHelixClient, { TwitchHelixUserSearchResponseDataEntry } from './services/TwitchHelixClient'
import { VariableChangeEffect } from './effect/VariableChangeEffect'
import { DictLookupEffect } from './effect/DictLookupEffect'
import { MediaEffect } from './effect/MediaEffect'
import { MadochanEffect } from './effect/MadochanEffect'
import { SetChannelTitleEffect } from './effect/SetChannelTitleEffect'
import { SetChannelGameIdEffect } from './effect/SetChannelGameIdEffect'
import { AddStreamTagEffect } from './effect/AddStreamTagsEffect'
import { RemoveStreamTagEffect } from './effect/RemoveStreamTagsEffect'
import { ChattersEffect } from './effect/ChattersEffect'
import { CountdownEffect } from './effect/CountdownEffect'
import { MediaVolumeEffect } from './effect/MediaVolumeEffect'
import { ChatEffect } from './effect/ChatEffect'
import { EmotesEffect } from './effect/EmotesEffect'

const log = logger('fn.ts')

function mimeToExt(mime: string) {
  if (/image\//.test(mime)) {
    return mime.replace('image/', '')
  }
  return ''
}

function decodeBase64Image(base64Str: string) {
  const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string')
  }
  return {
    type: matches[1],
    data: Buffer.from(matches[2], 'base64'),
  }
}

export const safeFileName = (string: string): string => {
  return string.replace(/[^a-zA-Z0-9.-]/g, '_')
}

const fnRandom = <T>(values: T[]) => (): T => getRandom(values)

export const sleep = (ms: number) => {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, ms)
  })
}

const sayFn = (
  client: TwitchChatClient,
  target: string | null,
) => (
  msg: string,
) => {
    // in case no target is given we use the configured channels
    // we should be able to use client.channels or client.getChannels()
    // but they are always empty :/
    const targets = target ? [target] : (client.getOptions().channels || [])
    targets.forEach(t => {
      // TODO: fix this somewhere else?
      // client can only say things in lowercase channels
      t = t.toLowerCase()
      log.info(`saying in ${t}: ${msg}`)
      client.say(t, msg).catch((e: any) => {
        log.info(e)
      })
    })
  }

export const parseCommandFromTriggerAndMessage = (
  msg: string,
  trigger: CommandTrigger,
): RawCommand | null => {
  if (trigger.type !== 'command') {
    return null
  }
  return parseCommandFromCmdAndMessage(msg, trigger.data.command)
}

export const normalizeChatMessage = (text: string): string => {
  // strip control chars
  text = text.replace(/\p{C}/gu, '')

  // other common tasks are to normalize newlines and other whitespace

  // normalize newline
  text = text.replace(/\n\r/g, '\n')
  text = text.replace(/\p{Zl}/gu, '\n')
  text = text.replace(/\p{Zp}/gu, '\n')

  // normalize space
  text = text.replace(/\p{Zs}/gu, ' ')

  return text.trim()
}

export const parseCommandFromCmdAndMessage = (
  msg: string,
  command: CommandMatch,
): RawCommand | null => {
  if (msg === command.value) {
    return { name: command.value, args: [] }
  }
  if (command.match === 'startsWith' && msg.startsWith(command.value + ' ')) {
    const name = msg.substring(0, command.value.length).trim()
    const args = msg.substring(command.value.length).trim().split(' ').filter(s => !!s)
    return { name, args }
  }
  if (
    command.match === 'anywhere'
    && (
      msg.startsWith(command.value + ' ')
      || msg.endsWith(' ' + command.value)
      || msg.includes(' ' + command.value + ' ')
    )
  ) {
    return { name: command.value, args: [] }
  }
  return null
}

const effectsClassMap = {
  [CommandEffectType.VARIABLE_CHANGE]: VariableChangeEffect,
  [CommandEffectType.CHAT]: ChatEffect,
  [CommandEffectType.DICT_LOOKUP]: DictLookupEffect,
  [CommandEffectType.EMOTES]: EmotesEffect,
  [CommandEffectType.MEDIA]: MediaEffect,
  [CommandEffectType.MADOCHAN]: MadochanEffect,
  [CommandEffectType.SET_CHANNEL_TITLE]: SetChannelTitleEffect,
  [CommandEffectType.SET_CHANNEL_GAME_ID]: SetChannelGameIdEffect,
  [CommandEffectType.ADD_STREAM_TAGS]: AddStreamTagEffect,
  [CommandEffectType.REMOVE_STREAM_TAGS]: RemoveStreamTagEffect,
  [CommandEffectType.CHATTERS]: ChattersEffect,
  [CommandEffectType.COUNTDOWN]: CountdownEffect,
  [CommandEffectType.MEDIA_VOLUME]: MediaVolumeEffect,
}

const applyEffects = async (
  originalCmd: FunctionCommand,
  contextModule: Module,
  rawCmd: RawCommand | null,
  context: TwitchEventContext | null,
) => {
  if (!originalCmd.effects) {
    return
  }
  for (const effect of originalCmd.effects) {
    if (!effectsClassMap[effect.type]) {
      // unknown effect...
      log.warn({ type: effect.type }, 'unknown effect type')
      continue
    }
    const e = new (effectsClassMap[effect.type])(
      JSON.parse(JSON.stringify(effect)),
      originalCmd,
      contextModule,
      rawCmd,
      context,
    )
    await e.apply()
  }
  contextModule.saveCommands()
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (...args: string[]) => Promise<string>,
): Promise<string> {
  const promises: Promise<string>[] = []
  str.replace(regex, (match: string, ...args: string[]): string => {
    const promise = asyncFn(match, ...args)
    promises.push(promise)
    return match
  })
  if (!promises.length) {
    return str
  }
  const data = await Promise.all(promises)
  return str.replace(regex, () => data.shift() || '')
}

const getTwitchUser = async (
  usernameOrDisplayname: string,
  helixClient: TwitchHelixClient,
  bot: Bot,
): Promise<TwitchHelixUserSearchResponseDataEntry | null> => {
  const twitchUser = await helixClient.getUserByName(usernameOrDisplayname)
  if (twitchUser) {
    return twitchUser
  }
  // no twitchUser found, maybe the username is not the username but the display name
  // look up the username in the local chat log
  // TODO: keep a record of userNames -> userDisplayNames in db instead
  //       of relying on the chat log
  const username = await bot.getRepos().chatLog.getUsernameByUserDisplayName(usernameOrDisplayname)
  if (username === null || username === usernameOrDisplayname) {
    return null
  }
  return await helixClient.getUserByName(username)
}

export const doReplacements = async (
  text: string,
  rawCmd: RawCommand | null,
  context: TwitchEventContext | null,
  originalCmd: Command | FunctionCommand | null,
  bot: Bot | null,
  user: User | null,
) => {
  const doReplace = async (value: string) => await doReplacements(value, rawCmd, context, originalCmd, bot, user)

  const replaces: { regex: RegExp, replacer: (...args: string[]) => Promise<string> }[] = [
    {
      regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
      replacer: async (_m0: string, m1: string, m2: string, m3: string): Promise<string> => {
        if (!rawCmd) {
          return ''
        }
        let from = 0
        let to = rawCmd.args.length
        if (m1 !== '' && m1 !== undefined) {
          from = parseInt(m1, 10)
          to = from
        }
        if (m2 !== '' && m1 !== undefined) {
          to = rawCmd.args.length - 1
        }
        if (m3 !== '' && m1 !== undefined) {
          to = parseInt(m3, 10)
        }
        if (from === to) {
          const index = from
          if (index < rawCmd.args.length) {
            return rawCmd.args[index]
          }
          return ''
        }
        return rawCmd.args.slice(from, to + 1).join(' ')
      },
    },
    {
      regex: /\$daysuntil\("([^"]+)"\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        return daysUntil(m1, '{days}', '{days}', '{days}', '???')
      },
    },
    {
      regex: /\$daysuntil\("([^"]+)",\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*\)/g,
      replacer: async (_m0: string, m1: string, m2: string, m3: string, m4: string): Promise<string> => {
        return daysUntil(m1, m2, m3, m4, '???')
      },
    },
    {
      regex: /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
      replacer: async (_m0: string, m1: string, m2: string): Promise<string> => {
        const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10)
        const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10)
        return `${getRandomInt(min, max)}`
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        if (!originalCmd || !originalCmd.variables) {
          return ''
        }
        if (!bot || !user) {
          return ''
        }
        const v = originalCmd.variables.find(v => v.name === m1)
        const val = v ? v.value : (await bot.getRepos().variables.get(user.id, m1))
        return val === null ? '' : String(val)
      },
    },
    {
      regex: /\$bot\.(message|version|date|website|github|features)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        if (!bot) {
          return ''
        }
        if (m1 === 'message') {
          return 'Robyottoko is a versatile twitch '
            + 'bot, containing features like media commands, timers, translation, '
            + 'widget for user-submitted drawings, captions (speech-to-text), '
            + 'png-tuber and song requests. Get it connected to your twitch '
            + 'channel for free at https://hyottoko.club 🤖'
        }
        if (m1 === 'version') {
          return bot.getBuildVersion()
        }
        if (m1 === 'date') {
          return bot.getBuildDate()
        }
        if (m1 === 'website') {
          return 'https://hyottoko.club'
        }
        if (m1 === 'github') {
          return 'https://github.com/zutatensuppe/robyottoko'
        }
        if (m1 === 'features') {
          return 'this versatile twitch bot has features like media commands, timers, translation, widget for user-submitted drawings, captions (speech-to-text), png-tuber and song requests'
        }
        return ''
      },
    },
    {
      regex: /\$bits\.amount/g,
      replacer: async (_m0: string): Promise<string> => {
        return `${context?.extra?.bits?.amount || '<unknown>'}`
      },
    },
    {
      regex: /\$raiders\.amount/g,
      replacer: async (_m0: string): Promise<string> => {
        return `${context?.extra?.raiders?.amount || '<unknown>'}`
      },
    },
    {
      regex: /\$giftsubs\.amount/g,
      replacer: async (_m0: string): Promise<string> => {
        return `${context?.extra?.giftsubs?.amount || '<unknown>'}`
      },
    },
    {
      regex: /\$user(?:\(([^)]+)\)|())\.(name|username|twitch_url|profile_image_url|recent_clip_url|last_stream_category)/g,
      replacer: async (_m0: string, m1: string, m2: string, m3): Promise<string> => {
        if (!context) {
          return ''
        }

        const username = m1 || m2 || context.username || ''
        if (username === context.username && m3 === 'name') {
          return String(context['display-name'])
        }

        if (username === context.username && m3 === 'username') {
          return String(context.username)
        }

        if (username === context.username && m3 === 'twitch_url') {
          return String(`twitch.tv/${context.username}`)
        }

        if (!bot || !user) {
          log.info('no bot, no user, no watch')
          return ''
        }
        const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
        if (!helixClient) {
          return ''
        }

        const twitchUser = await getTwitchUser(username, helixClient, bot)
        if (!twitchUser) {
          log.info('no twitch user found', username)
          return ''
        }
        if (m3 === 'name') {
          return String(twitchUser.display_name)
        }
        if (m3 === 'username') {
          return String(twitchUser.login)
        }
        if (m3 === 'twitch_url') {
          return String(`twitch.tv/${twitchUser.login}`)
        }
        if (m3 === 'profile_image_url') {
          return String(twitchUser.profile_image_url)
        }
        if (m3 === 'recent_clip_url') {
          const end = new Date()
          const start = new Date(end.getTime() - 30 * DAY)
          const maxDurationSeconds = 30

          const clip = await helixClient.getClipByUserId(
            twitchUser.id,
            start.toISOString(),
            end.toISOString(),
            maxDurationSeconds,
          )
          return String(clip?.embed_url || '')
        }
        if (m3 === 'last_stream_category') {
          const channelInfo = await helixClient.getChannelInformation(twitchUser.id)
          return String(channelInfo?.game_name || '')
        }
        return ''
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,
      replacer: async (_m0: string, m1: string, m2: string): Promise<string> => {
        try {
          const url = await doReplace(m1)
          // both of getText and JSON.parse can fail, so everything in a single try catch
          const resp = await xhr.get(url)
          const txt = await resp.text()
          return String(JSON.parse(txt)[m2])
        } catch (e: any) {
          log.error(e)
          return ''
        }
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        try {
          const url = await doReplace(m1)
          const resp = await xhr.get(url)
          return await resp.text()
        } catch (e: any) {
          log.error(e)
          return ''
        }
      },
    },
    {
      regex: /\$urlencode\(([^$)]*)\)/g,
      replacer: async (_m0: string, m1: string): Promise<string> => {
        const value = await doReplace(m1)
        return encodeURIComponent(value)
      },
    },
    {
      regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
      replacer: async (_m0: string, arg1: string, op: string, arg2: string): Promise<string> => {
        const arg1Int = parseInt(arg1, 10)
        const arg2Int = parseInt(arg2, 10)
        switch (op) {
          case '+':
            return `${(arg1Int + arg2Int)}`
          case '-':
            return `${(arg1Int - arg2Int)}`
          case '/':
            return `${(arg1Int / arg2Int)}`
          case '*':
            return `${(arg1Int * arg2Int)}`
        }
        return ''
      },
    },
  ]
  let replaced = String(text)
  let orig
  do {
    orig = replaced
    for (const replace of replaces) {
      replaced = await replaceAsync(
        replaced,
        replace.regex,
        replace.replacer,
      )
    }
  } while (orig !== replaced)
  return replaced
}

export const joinIntoChunks = (
  strings: string[],
  glue: string,
  maxChunkLen: number,
) => {
  const chunks = []
  let chunk = []
  for (let i = 0; i < strings.length; i++) {
    chunk.push(strings[i])
    if (chunk.join(glue).length > maxChunkLen) {
      chunk.pop()
      chunks.push(chunk.join(glue))
      chunk = []
      chunk.push(strings[i])
    }
  }
  chunks.push(chunk.join(glue))
  return chunks
}

export const parseISO8601Duration = (
  duration: string,
): number => {
  // P(n)Y(n)M(n)DT(n)H(n)M(n)S
  const m = duration.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) {
    return 0
  }

  const Y = m[1] ? parseInt(m[1], 10) : 0
  const Mo = m[2] ? parseInt(m[2], 10) : 0
  const D = m[3] ? parseInt(m[3], 10) : 0
  const H = m[4] ? parseInt(m[4], 10) : 0
  const M = m[5] ? parseInt(m[5], 10) : 0
  const S = m[6] ? parseInt(m[6], 10) : 0

  // note: we just calculate month as having 30 days,
  // because knowledge about what exact year it is is missing
  return (
    (S * SECOND)
    + (M * MINUTE)
    + (H * HOUR)
    + (D * DAY)
    + (Mo * MONTH)
    + (Y * YEAR)
  )
}

export const findIdxFuzzy = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  let idx = findIdxBySearchExact(array, search, keyFn)
  if (idx === -1) {
    idx = findIdxBySearchExactStartsWith(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchExactWord(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchExactPart(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearchInOrder(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearch(array, search, keyFn)
  }
  return idx
}

export const accentFolded = (str: string): string => {
  // @see https://stackoverflow.com/a/37511463/392905 + comments about ł
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0142/g, 'l')
}

export const findShortestIdx = <T>(
  array: T[],
  indexes: number[],
  keyFn: (item: T) => string,
) => {
  let shortestIdx = -1
  let shortest = 0
  array.forEach((item, idx) => {
    const len = keyFn(item).length
    if (indexes.includes(idx) && (shortestIdx === -1 || len < shortest)) {
      shortest = len
      shortestIdx = idx
    }
  })
  return shortestIdx
}

export const findIdxBySearchExact = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()) === searchLower) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactStartsWith = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()).startsWith(searchLower)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactWord = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    const keyLower = accentFolded(keyFn(item).toLowerCase())
    const idx = keyLower.indexOf(searchLower)
    if (idx === -1) {
      return
    }
    const idxBefore = idx - 1
    if (idxBefore >= 0 && keyLower[idxBefore].match(/\w/)) {
      return
    }
    const idxAfter = idx + searchLower.length
    if (idxAfter < keyLower.length && keyLower[idxAfter].match(/\w/)) {
      return
    }
    indexes.push(index)
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactPart = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const searchLower = accentFolded(search.toLowerCase())
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item).toLowerCase()).indexOf(searchLower) !== -1) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchInOrder = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const split = accentFolded(search).split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(regexArgs.join('.*'), 'i')
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (accentFolded(keyFn(item)).match(regex)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearch = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String,
) => {
  const split = accentFolded(search).split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regexes = regexArgs.map(arg => new RegExp(arg, 'i'))
  return array.findIndex(item => {
    const str = accentFolded(keyFn(item))
    for (const regex of regexes) {
      if (!str.match(regex)) {
        return false
      }
    }
    return true
  })
}

/**
 * Determines new volume from an input and a current volume.
 * If the input cannot be parsed, the current volume is returned.
 */
export const determineNewVolume = (
  input: string,
  currentVal: number,
): number => {
  if (input.match(/^\+\d+$/)) {
    // prefixed with + means increase volume by an amount
    const val = parseInt(input.substring(1), 10)
    if (isNaN(val)) {
      return currentVal
    }
    return currentVal + val
  }
  if (input.match(/^-\d+$/)) {
    // prefixed with - means decrease volume by an amount
    const val = parseInt(input.substring(1), 10)
    if (isNaN(val)) {
      return currentVal
    }
    return currentVal - val
  }
  // no prefix, just set the volume to the input
  const val = parseInt(input, 10)
  if (isNaN(val)) {
    return currentVal
  }
  return val
}

export const getChannelPointsCustomRewards = async (
  bot: Bot,
  user: User,
): Promise<Record<string, string[]>> => {
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!helixClient) {
    log.info('getChannelPointsCustomRewards: no helix client')
    return {}
  }
  return await helixClient.getAllChannelPointsCustomRewards(bot, user)
}

export const getUserTypeInfo = async (
  bot: Bot,
  user: User,
  userId: string,
): Promise<{ mod: boolean, subscriber: boolean, vip: boolean }> => {
  const info = { mod: false, subscriber: false, vip: false }
  const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!helixClient) {
    return info
  }

  const accessToken = await bot.getRepos().oauthToken.getMatchingAccessToken(user)
  if (!accessToken) {
    return info
  }

  info.mod = await helixClient.isUserModerator(accessToken, user.twitch_id, userId)
  info.subscriber = await helixClient.isUserSubscriber(accessToken, user.twitch_id, userId)
  info.vip = await helixClient.isUserVip(accessToken, user.twitch_id, userId)
  return info
}

export const uniqId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export default {
  uniqId,
  getUserTypeInfo,
  applyEffects,
  logger,
  mimeToExt,
  decodeBase64Image,
  safeFileName,
  sayFn,
  normalizeChatMessage,
  parseCommandFromTriggerAndMessage,
  parseCommandFromCmdAndMessage,
  sleep,
  fnRandom,
  parseISO8601Duration,
  doReplacements,
  joinIntoChunks,
  findIdxFuzzy,
  findIdxBySearchExactPart,
  findIdxBySearchInOrder,
  findIdxBySearch,
  getChannelPointsCustomRewards,
}
