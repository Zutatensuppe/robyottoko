import config from './config'
import crypto from 'crypto'
import { getText } from './net/xhr'
import { SECOND, MINUTE, HOUR, DAY, MONTH, YEAR, logger, nonce } from './common/fn'

import { Command, GlobalVariable, RawCommand, TwitchChatContext, TwitchChatClient, FunctionCommand, Module, CommandTrigger, Bot } from './types'
import Variables from './services/Variables'
import { mayExecute } from './common/permissions'
import { User } from './services/Users'

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

function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom<T>(array: T[]): T {
  return array[getRandomInt(0, array.length - 1)]
}

const fnRandom = <T>(values: T[]) => (): T => getRandom(values)

const sleep = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

const sayFn = (
  client: TwitchChatClient,
  target: string | null,
) => (
  msg: string
) => {
    // in case no target is given we use the configured channels
    // we should be able to use client.channels or client.getChannels()
    // but they are always empty :/
    const targets = target ? [target] : client.opts.channels
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
  return parseCommandFromCmdAndMessage(
    msg,
    trigger.data.command,
    trigger.data.commandExact,
  )
}

export const parseCommandFromCmdAndMessage = (
  msg: string,
  command: string,
  commandExact: boolean,
): RawCommand | null => {
  if (
    msg === command
    || (!commandExact && msg.startsWith(command + ' '))
  ) {
    const name = msg.substring(0, command.length).trim()
    const args = msg.substring(command.length).trim().split(' ').filter(s => !!s)
    return { name, args }
  }
  return null
}


const _toInt = (value: any) => parseInt(`${value}`, 10)

const _increase = (value: any, by: any) => (_toInt(value) + _toInt(by))

const _decrease = (value: any, by: any) => (_toInt(value) - _toInt(by))

const applyVariableChanges = async (
  cmdDef: FunctionCommand,
  contextModule: Module,
  rawCmd: RawCommand | null,
  context: TwitchChatContext | null,
) => {
  if (!cmdDef.variableChanges) {
    return
  }
  const variables = contextModule.bot.getUserVariables(contextModule.user)
  for (const variableChange of cmdDef.variableChanges) {
    const op = variableChange.change
    const name = await doReplacements(variableChange.name, rawCmd, context, cmdDef, contextModule.bot, contextModule.user)
    const value = await doReplacements(variableChange.value, rawCmd, context, cmdDef, contextModule.bot, contextModule.user)

    // check if there is a local variable for the change
    if (cmdDef.variables) {
      const idx = cmdDef.variables.findIndex(v => (v.name === name))
      if (idx !== -1) {
        if (op === 'set') {
          cmdDef.variables[idx].value = value
        } else if (op === 'increase_by') {
          cmdDef.variables[idx].value = _increase(cmdDef.variables[idx].value, value)
        } else if (op === 'decrease_by') {
          cmdDef.variables[idx].value = _decrease(cmdDef.variables[idx].value, value)
        }
        continue
      }
    }

    const globalVars: GlobalVariable[] = variables.all()
    const idx = globalVars.findIndex(v => (v.name === name))
    if (idx !== -1) {
      if (op === 'set') {
        variables.set(name, value)
      } else if (op === 'increase_by') {
        variables.set(name, _increase(globalVars[idx].value, value))
      } else if (op === 'decrease_by') {
        variables.set(name, _decrease(globalVars[idx].value, value))
      }
      //
      continue
    }
  }
  contextModule.saveCommands()
}

const tryExecuteCommand = async (
  contextModule: Module,
  rawCmd: RawCommand | null,
  cmdDefs: FunctionCommand[],
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext
) => {
  const promises = []
  for (const cmdDef of cmdDefs) {
    if (!mayExecute(context, cmdDef)) {
      continue
    }
    log.info(`${target}| * Executing ${rawCmd?.name || '<unknown>'} command`)
    const p = new Promise(async (resolve) => {
      await applyVariableChanges(cmdDef, contextModule, rawCmd, context)
      const r = await cmdDef.fn(rawCmd, client, target, context)
      if (r) {
        log.info(`${target}| * Returned: ${r}`)
      }
      log.info(`${target}| * Executed ${rawCmd?.name || '<unknown>'} command`)
      resolve(true)
    })
    promises.push(p)
  }
  await Promise.all(promises)
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

export const doReplacements = async (
  text: string,
  command: RawCommand | null,
  context: TwitchChatContext | null,
  originalCmd: Command | FunctionCommand | null,
  bot: Bot | null,
  user: User | null,
) => {
  const replaces: { regex: RegExp, replacer: (...args: string[]) => Promise<string> }[] = [
    {
      regex: /\$args(?:\((\d*)(:?)(\d*)\))?/g,
      replacer: async (m0: string, m1: string, m2: string, m3: string): Promise<string> => {
        if (!command) {
          return ''
        }
        let from = 0
        let to = command.args.length
        if (m1 !== '' && m1 !== undefined) {
          from = parseInt(m1, 10)
          to = from
        }
        if (m2 !== '' && m1 !== undefined) {
          to = command.args.length - 1
        }
        if (m3 !== '' && m1 !== undefined) {
          to = parseInt(m3, 10)
        }
        if (from === to) {
          const index = from
          if (index < command.args.length) {
            return command.args[index]
          }
          return ''
        }
        return command.args.slice(from, to + 1).join(' ')
      },
    },
    {
      regex: /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
      replacer: async (m0: string, m1: string, m2: string): Promise<string> => {
        const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10)
        const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10)
        return `${getRandomInt(min, max)}`
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: async (m0: string, m1: string): Promise<string> => {
        if (!originalCmd || !originalCmd.variables) {
          return ''
        }
        if (!bot || !user) {
          return ''
        }
        const v = originalCmd.variables.find(v => v.name === m1)
        const val = v ? v.value : bot.getUserVariables(user).get(m1)
        return val === null ? '' : String(val)
      },
    },
    {
      regex: /\$bot\.(version|date|website|github|features)/g,
      replacer: async (m0: string, m1: string): Promise<string> => {
        if (!bot) {
          return ''
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
          return 'this twitch bot has commands, media commands, timers, translation commands, user-submitted drawings widget, png-tuber, song requests, captions (speech-to-text)!'
        }
        return '';
      },
    },
    {
      regex: /\$user(?:\(([^)]+)\)|())\.(name|profile_image_url|recent_clip_url|last_stream_category)/g,
      replacer: async (m0: string, m1: string, m2: string, m3): Promise<string> => {
        if (!context) {
          return ''
        }

        const username = m1 || m2 || context.username
        if (username === context.username && m3 === 'name') {
          return String(context['display-name'])
        }

        if (!bot || !user) {
          return ''
        }
        const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
        if (!helixClient) {
          return ''
        }

        const twitchUser = await helixClient.getUserByName(username)
        if (!twitchUser) {
          return ''
        }
        if (m3 === 'name') {
          return String(twitchUser.display_name)
        }
        if (m3 === 'profile_image_url') {
          return String(twitchUser.profile_image_url)
        }
        if (m3 === 'recent_clip_url') {
          const end = new Date()
          const start = new Date(end.getTime() - 30 * DAY)
          const maxDurationSeconds = 20

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
          return String(channelInfo?.game_name || '');
        }
        return ''
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,
      replacer: async (m0: string, m1: string, m2: string): Promise<string> => {
        const txt = await getText(await doReplacements(m1, command, context, originalCmd, bot, user))
        try {
          return String(JSON.parse(txt)[m2])
        } catch (e: any) {
          log.error(e)
          return ''
        }
      },
    },
    {
      regex: /\$customapi\(([^$)]*)\)/g,
      replacer: async (m0: string, m1: string): Promise<string> => {
        return await getText(await doReplacements(m1, command, context, originalCmd, bot, user))
      },
    },
    {
      regex: /\$urlencode\(([^$)]*)\)/g,
      replacer: async (m0: string, m1: string): Promise<string> => {
        return encodeURIComponent(await doReplacements(m1, command, context, originalCmd, bot, user))
      },
    },
    {
      regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
      replacer: async (m0: string, arg1: string, op: string, arg2: string): Promise<string> => {
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
        replace.replacer
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
  duration: string
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

export const passwordSalt = () => {
  return nonce(10)
}

export const passwordHash = (
  plainPass: string,
  salt: string,
): string => {
  const hash = crypto.createHmac('sha512', config.secret)
  hash.update(`${salt}${plainPass}`)
  return hash.digest('hex')
}

export const findIdxFuzzy = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
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

export const findShortestIdx = <T>(
  array: T[],
  indexes: number[],
  keyFn: (item: T) => string
) => {
  let shortestIdx = -1;
  let shortest = 0;
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
  keyFn: (item: T) => string = String
) => {
  const searchLower = search.toLowerCase()
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (keyFn(item).toLowerCase() === searchLower) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactStartsWith = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = search.toLowerCase()
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (keyFn(item).toLowerCase().startsWith(searchLower)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchExactWord = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const searchLower = search.toLowerCase()
  const indexes: number[] = []
  array.forEach((item, index) => {
    const keyLower = keyFn(item).toLowerCase()
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
  keyFn: (item: T) => string = String
) => {
  const searchLower = search.toLowerCase()
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (keyFn(item).toLowerCase().indexOf(searchLower) !== -1) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearchInOrder = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const split = search.split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(regexArgs.join('.*'), 'i')
  const indexes: number[] = []
  array.forEach((item, index) => {
    if (keyFn(item).match(regex)) {
      indexes.push(index)
    }
  })
  return findShortestIdx(array, indexes, keyFn)
}

export const findIdxBySearch = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = String
) => {
  const split = search.split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regexes = regexArgs.map(arg => new RegExp(arg, 'i'))
  return array.findIndex(item => {
    const str = keyFn(item)
    for (const regex of regexes) {
      if (!str.match(regex)) {
        return false
      }
    }
    return true
  })
}

export default {
  applyVariableChanges,
  logger,
  mimeToExt,
  decodeBase64Image,
  sayFn,
  parseCommandFromTriggerAndMessage,
  parseCommandFromCmdAndMessage,
  passwordSalt,
  passwordHash,
  tryExecuteCommand,
  getRandomInt,
  getRandom,
  sleep,
  fnRandom,
  parseISO8601Duration,
  doReplacements,
  joinIntoChunks,
  findIdxFuzzy,
  findIdxBySearchExactPart,
  findIdxBySearchInOrder,
  findIdxBySearch,
}
