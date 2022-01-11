import config from './config'
import crypto from 'crypto'
import path from 'path'
import { getText } from './net/xhr'
import { MS, SECOND, MINUTE, HOUR, DAY, MONTH, YEAR, parseHumanDuration, mustParseHumanDuration, split, shuffle, arrayMove } from './common/fn'

import { Command, GlobalVariable, LogLevel, RawCommand, TwitchChatContext, TwitchChatClient, FunctionCommand, Module, CommandTrigger } from './types'
import Variables from './services/Variables'

export { MS, SECOND, MINUTE, HOUR, DAY, MONTH, YEAR, parseHumanDuration, mustParseHumanDuration, split, shuffle, arrayMove }


// error | info | log | debug
const logLevel: LogLevel = config?.log?.level || 'info'
let logEnabled: LogLevel[] = [] // always log errors
switch (logLevel) {
  case 'error': logEnabled = ['error']; break
  case 'info': logEnabled = ['error', 'info']; break
  case 'log': logEnabled = ['error', 'info', 'log']; break
  case 'debug': logEnabled = ['error', 'info', 'log', 'debug']; break
}
export const logger = (filename: string, ...pre: string[]) => {
  const b = path.basename(filename)
  const fn = (t: LogLevel) => (...args: any[]) => {
    if (logEnabled.includes(t)) {
      console[t](dateformat('hh:mm:ss', new Date()), `[${b}]`, ...pre, ...args)
    }
  }
  return {
    log: fn('log'),
    info: fn('info'),
    debug: fn('debug'),
    error: fn('error'),
  }
}

const log = logger('fn.ts')

function mimeToExt(mime: string) {
  if (/image\//.test(mime)) {
    return mime.replace('image/', '')
  }
  return ''
}

function decodeBase64Image(base64Str: string) {
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
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

function getRandom(array: any[]) {
  return array[getRandomInt(0, array.length - 1)]
}

export function nonce(length: number) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const fnRandom = (values: any[]) => () => getRandom(values)

const sleep = (ms: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

const isBroadcaster = (ctx: TwitchChatContext) => ctx['room-id'] === ctx['user-id']
const isMod = (ctx: TwitchChatContext) => !!ctx.mod
const isSubscriber = (ctx: TwitchChatContext) => !!ctx.subscriber

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
      client.say(t, msg).catch((e: any) => { })
    })
  }

const mayExecute = (context: TwitchChatContext, cmd: Command | FunctionCommand) => {
  if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
    return true
  }
  if (cmd.restrict_to.includes('mod') && isMod(context)) {
    return true
  }
  if (cmd.restrict_to.includes('sub') && isSubscriber(context)) {
    return true
  }
  if (cmd.restrict_to.includes('broadcaster') && isBroadcaster(context)) {
    return true
  }
  return false
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

const tryExecuteCommand = async (
  contextModule: Module,
  rawCmd: RawCommand,
  cmdDefs: FunctionCommand[],
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string
) => {
  const promises = []
  for (const cmdDef of cmdDefs) {
    if (!mayExecute(context, cmdDef)) {
      continue
    }
    log.info(`${target}| * Executing ${rawCmd.name} command`)
    if (cmdDef.variableChanges) {
      for (const variableChange of cmdDef.variableChanges) {
        const op = variableChange.change
        const name = await doReplacements(variableChange.name, rawCmd, context, contextModule.variables, cmdDef)
        const value = await doReplacements(variableChange.value, rawCmd, context, contextModule.variables, cmdDef)

        // check if there is a local variable for the change
        if (cmdDef.variables) {
          const idx = cmdDef.variables.findIndex(v => (v.name === name))
          if (idx !== -1) {
            if (op === 'set') {
              cmdDef.variables[idx].value = value
            } else if (op === 'increase_by') {
              cmdDef.variables[idx].value = (
                parseInt(cmdDef.variables[idx].value, 10)
                + parseInt(value, 10)
              )
            } else if (op === 'decrease_by') {
              cmdDef.variables[idx].value = (
                parseInt(cmdDef.variables[idx].value, 10)
                - parseInt(value, 10)
              )
            }
            console.log(cmdDef.variables[idx].value)
            //
            continue
          }
        }

        const globalVars: GlobalVariable[] = contextModule.variables.all()
        const idx = globalVars.findIndex(v => (v.name === name))
        if (idx !== -1) {
          if (op === 'set') {
            contextModule.variables.set(name, value)
          } else if (op === 'increase_by') {
            contextModule.variables.set(name, (
              parseInt(globalVars[idx].value, 10)
              + parseInt(value, 10)
            ))
          } else if (op === 'decrease_by') {
            contextModule.variables.set(name, (
              parseInt(globalVars[idx].value, 10)
              - parseInt(value, 10)
            ))
          }
          //
          continue
        }
      }
      contextModule.saveCommands()
    }
    const p = new Promise(async (resolve) => {
      const r = await cmdDef.fn(rawCmd, client, target, context, msg)
      if (r) {
        log.info(`${target}| * Returned: ${r}`)
      }
      log.info(`${target}| * Executed ${rawCmd.name} command`)
      resolve(true)
    })
    promises.push(p)
  }
  await Promise.all(promises)
}

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: (...args: string[]) => Promise<any>,
): Promise<string> {
  const promises: Promise<any>[] = [];
  str.replace(regex, (match: string, ...args: string[]): string => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
    return match
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

const doReplacements = async (
  text: string,
  command: RawCommand | null,
  context: TwitchChatContext | null,
  variables: Variables,
  originalCmd: Command | FunctionCommand,
) => {
  const replaces: { regex: RegExp, replacer: (...args: string[]) => Promise<any> }[] = [
    {
      regex: /\$args\((\d*)(:?)(\d*)\)/g,
      replacer: async (m0: string, m1: string, m2: string, m3: string) => {
        if (!command) {
          return ''
        }
        let from = 0
        let to = command.args.length
        if (m1 !== '') {
          from = parseInt(m1, 10)
          to = from
        }
        if (m2 !== '') {
          to = command.args.length - 1
        }
        if (m3 !== '') {
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
      replacer: async (m0: string, m1: string, m2: string) => {
        const min = typeof m1 === 'undefined' ? 1 : parseInt(m1, 10)
        const max = typeof m2 === 'undefined' ? 100 : parseInt(m2, 10)
        return `${getRandomInt(min, max)}`
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: async (m0: string, m1: string) => {
        if (!originalCmd.variables) {
          return ''
        }
        const v = originalCmd.variables.find(v => v.name === m1)
        const val = v ? v.value : variables.get(m1)
        return val === null ? '' : val
      },
    },
    {
      regex: /\$user\.name/g,
      replacer: async () => {
        if (!context) {
          return ''
        }
        return context['display-name']
      },
    },
    {
      regex: /\$([a-z][a-z0-9]*)(?!\()/g,
      replacer: async (m0: string, m1: string) => {
        switch (m1) {
          case 'args': {
            if (!command) {
              return ''
            }
            return command.args.join(' ')
          }
        }
        return m0
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
      replacer: async (m0: string, m1: string, m2: string) => {
        const txt = await getText(await doReplacements(m1, command, context, variables, originalCmd))
        return JSON.parse(txt)[m2]
      },
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: async (m0: string, m1: string) => {
        return await getText(await doReplacements(m1, command, context, variables, originalCmd))
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: async (m0: string, m1: string) => {
        return encodeURIComponent(await doReplacements(m1, command, context, variables, originalCmd))
      },
    },
    {
      regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
      replacer: async (m0: string, arg1: string, op: string, arg2: string) => {
        const arg1Int = parseInt(arg1, 10)
        const arg2Int = parseInt(arg2, 10)
        switch (op) {
          case '+':
            return arg1Int + arg2Int
          case '-':
            return arg1Int - arg2Int
          case '/':
            return arg1Int / arg2Int
          case '*':
            return arg1Int * arg2Int
        }
        return ''
      },
    },
  ]
  let replaced = text
  let orig
  do {
    orig = replaced
    for (let replace of replaces) {
      replaced = await replaceAsync(replaced, replace.regex, replace.replacer)
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

const dateformat = (
  format: string,
  date: Date,
): string => {
  return format.replace(/(hh|mm|ss)/g, (m0: string, m1: string) => {
    switch (m1) {
      case 'hh': return pad(date.getHours(), '00')
      case 'mm': return pad(date.getMinutes(), '00')
      case 'ss': return pad(date.getSeconds(), '00')
      default: return m0
    }
  })
}

const pad = (
  x: number,
  pad: string
): string => {
  const str = `${x}`
  if (str.length >= pad.length) {
    return str
  }
  return pad.substr(0, pad.length - str.length) + str
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

export const humanDuration = (
  durationMs: number
): string => {
  let duration = durationMs

  const d = Math.floor(duration / DAY)
  duration = duration % DAY

  const h = Math.floor(duration / HOUR)
  duration = duration % HOUR

  const m = Math.floor(duration / MINUTE)
  duration = duration % MINUTE

  const s = Math.floor(duration / SECOND)
  duration = duration % SECOND

  const ms = duration

  const units = ['ms', 's', 'm', 'h', 'd']
  const rawparts = [ms, s, m, h, d]

  // remove leading and trailing empty values
  let start = 0
  while (start < rawparts.length && rawparts[start] === 0) {
    start++
  }
  let end = rawparts.length - 1
  while (end >= 0 && rawparts[end] === 0) {
    end--
  }

  const parts = []
  for (let i = start; i <= end; i++) {
    parts.unshift(`${rawparts[i]}${units[i]}`)
  }
  return parts.join(' ')
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
  keyFn: (item: T) => string = ((item) => String(item))
) => {
  let idx = findIdxBySearchExactPart(array, search, keyFn)
  if (idx === -1) {
    idx = findIdxBySearchInOrder(array, search, keyFn)
  }
  if (idx === -1) {
    idx = findIdxBySearch(array, search, keyFn)
  }
  return idx
}

export const findIdxBySearchExactPart = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = ((item) => String(item))
) => {
  const searchLower = search.toLowerCase()
  return array.findIndex(item => keyFn(item).toLowerCase().indexOf(searchLower) !== -1)
}

export const findIdxBySearchInOrder = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = ((item) => String(item))
) => {
  const split = search.split(/\s+/)
  const regexArgs = split.map(arg => arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const regex = new RegExp(regexArgs.join('.*'), 'i')
  return array.findIndex(item => keyFn(item).match(regex))
}

export const findIdxBySearch = <T>(
  array: T[],
  search: string,
  keyFn: (item: T) => string = ((item) => String(item))
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
  logger,
  mimeToExt,
  decodeBase64Image,
  sayFn,
  mayExecute,
  parseCommandFromTriggerAndMessage,
  parseCommandFromCmdAndMessage,
  passwordSalt,
  passwordHash,
  tryExecuteCommand,
  getRandomInt,
  getRandom,
  shuffle,
  sleep,
  fnRandom,
  pad,
  parseISO8601Duration,
  parseHumanDuration,
  mustParseHumanDuration,
  humanDuration,
  isBroadcaster,
  isMod,
  isSubscriber,
  doReplacements,
  nonce,
  split,
  joinIntoChunks,
  arrayMove,
  findIdxFuzzy,
  findIdxBySearchExactPart,
  findIdxBySearchInOrder,
  findIdxBySearch,
  MS,
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  YEAR,
}
