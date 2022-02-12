import { MediaFile, SoundMediaFile, UploadedFile } from "../types"

export const MS = 1
export const SECOND = 1000 * MS
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY

type LogFn = (...args: any[]) => void

export type LogLevel = 'info' | 'debug' | 'error' | 'log'

export interface Logger {
  log: LogFn
  info: LogFn
  debug: LogFn
  error: LogFn
}

// error | info | log | debug
let logEnabled: LogLevel[] = [] // always log errors
export const setLogLevel = (logLevel: LogLevel): void => {
  switch (logLevel) {
    case 'error': logEnabled = ['error']; break
    case 'info': logEnabled = ['error', 'info']; break
    case 'log': logEnabled = ['error', 'info', 'log']; break
    case 'debug': logEnabled = ['error', 'info', 'log', 'debug']; break
  }
}
setLogLevel('info')

export const logger = (prefix: string, ...pre: string[]): Logger => {
  const b = prefix
  const fn = (t: LogLevel) => (...args: any[]): void => {
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

export const mustParseHumanDuration = (
  duration: string | number
) => {
  if (duration === '') {
    throw new Error("unable to parse duration")
  }
  const d = `${duration}`.trim()
  if (!d) {
    throw new Error("unable to parse duration")
  }
  if (d.match(/^\d+$/)) {
    return parseInt(d, 10)
  }
  const m1 = d.match(/^((?:\d*)\.(?:\d*))(d|h|m|s)$/)
  if (m1) {
    const value = parseFloat(m1[1])
    if (isNaN(value)) {
      throw new Error("unable to parse duration")
    }
    const unit = m1[2]
    let ms = 0
    if (unit === 'd') {
      ms = value * DAY
    } else if (unit === 'h') {
      ms = value * HOUR
    } else if (unit === 'm') {
      ms = value * MINUTE
    } else if (unit === 's') {
      ms = value * SECOND
    }
    return Math.round(ms)
  }

  const m = d.match(/^(?:(\d+)d)?\s?(?:(\d+)h)?\s?(?:(\d+)m)?\s?(?:(\d+)s)?\s?(?:(\d+)ms)?$/)
  if (!m) {
    throw new Error("unable to parse duration")
  }

  const D = m[1] ? parseInt(m[1], 10) : 0
  const H = m[2] ? parseInt(m[2], 10) : 0
  const M = m[3] ? parseInt(m[3], 10) : 0
  const S = m[4] ? parseInt(m[4], 10) : 0
  const MS = m[5] ? parseInt(m[5], 10) : 0

  return (
    (S * SECOND)
    + (M * MINUTE)
    + (H * HOUR)
    + (D * DAY)
    + (MS)
  )
}

export const parseHumanDuration = (
  duration: string | number
) => {
  try {
    return mustParseHumanDuration(duration)
  } catch (e) {
    return 0
  }
}

const humanDuration = (
  durationMs: number
) => {
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

export function arrayMove(arr: any[], oldIndex: number, newIndex: number) {
  if (newIndex >= arr.length) {
    let k = newIndex - arr.length + 1
    while (k--) {
      arr.push(undefined)
    }
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0])
  return arr // return, but array is also modified in place
}

const doDummyReplacements = (text: string, str: string) => {
  const regexes = [
    // regexes must match the ones in src/fn.ts doReplaces function
    /\$args(?:\((\d*)(:?)(\d*)\))?/g,
    /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
    /\$var\(([^)]+)\)/g,
    /\$user\.name/g,
    /\$customapi\(([^$)]*)\)\['([A-Za-z0-9_ -]+)'\]/g,
    /\$customapi\(([^$)]*)\)/g,
    /\$urlencode\(([^$)]*)\)/g,
    /\$calc\((\d+)([*/+-])(\d+)\)/g,
  ]
  let replaced = text
  let orig
  do {
    orig = replaced
    for (const regex of regexes) {
      replaced = replaced.replace(regex, str)
    }
  } while (orig !== replaced)
  return replaced
}

export const split = (
  str: string,
  delimiter: string = ',',
  maxparts: number = -1,
) => {
  const split = str.split(delimiter)
  if (maxparts === -1) {
    return split
  }

  if (split.length <= maxparts) {
    return split
  }

  return [
    ...split.slice(0, maxparts - 1),
    split.slice(maxparts - 1).join(delimiter),
  ]
}

export const shuffle = <T>(array: T[]): T[] => {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    const index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

export function mediaFileFromUploadedFile(file: UploadedFile): MediaFile {
  return {
    filename: file.originalname,
    file: file.filename,
    urlpath: file.urlpath,
  }
}

export function soundMediaFileFromUploadedFile(file: UploadedFile): SoundMediaFile {
  return {
    filename: file.originalname,
    file: file.filename,
    urlpath: file.urlpath,
    volume: 100,
  };
}

export const calculateOptimalSubtitleDisplayTimeMs = (text: string): number => {
  // how long to display subtitles?
  // did some testing in aegisub:
  // - by default CPS >= 16 becomes red
  // - for CPS calculation spaces do not count
  // - for a 5 second time frame 79 chars are ok, 80 are not
  //
  // this means:
  // - CPS < 16 is OK
  // - CPS ~ 12 is optimal? we dont know that yet
  // each character can be displayed
  const readableCharacters = text.replace(/\W/g, '')
  return Math.floor(readableCharacters.length * 1000 / 12)
}

export default {
  arrayMove,
  humanDuration,
  parseHumanDuration,
  mustParseHumanDuration,
  doDummyReplacements,
  split,
  shuffle,
  pad,
  mediaFileFromUploadedFile,
  soundMediaFileFromUploadedFile,
}
