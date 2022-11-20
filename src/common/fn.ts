import { MediaFile, SoundMediaFile, UploadedFile } from "../types"

export const MS = 1
export const SECOND = 1000 * MS
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY

interface LogFn {
  (obj: unknown, msg?: string): void;
  (msg: string): void;
}

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  DEBUG = 'debug',
  ERROR = 'error',
}

export interface Logger {
  info: LogFn
  warn: LogFn
  debug: LogFn
  error: LogFn
}

// error | info | log | debug
let logEnabled: LogLevel[] = [] // always log errors
export const setLogLevel = (logLevel: LogLevel): void => {
  switch (logLevel) {
    case LogLevel.ERROR: logEnabled = [LogLevel.ERROR]; break
    case LogLevel.WARN: logEnabled = [LogLevel.ERROR, LogLevel.WARN]; break
    case LogLevel.INFO: logEnabled = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO]; break
    case LogLevel.DEBUG: logEnabled = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG]; break
  }
}
setLogLevel(LogLevel.INFO)

export const logger = (prefix: string, ...pre: string[]): Logger => {
  const b = prefix
  const fn = (t: LogLevel) => (...args: any[]): void => {
    if (logEnabled.includes(t)) {
      console[t](dateformat('hh:mm:ss', new Date()), `[${b}]`, ...pre, ...args)
    }
  }
  return {
    error: fn(LogLevel.ERROR),
    warn: fn(LogLevel.WARN),
    info: fn(LogLevel.INFO),
    debug: fn(LogLevel.DEBUG),
  }
}

export const unicodeLength = (str: string): number => {
  return [...str].length
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

export const dateformat = (
  format: string,
  date: Date,
): string => {
  return format.replace(/(YYYY|MM|DD|hh|mm|ss|Month(?:\.(?:de|en))?)/g, (m0: string, m1: string) => {
    switch (m1) {
      case 'YYYY': return pad(date.getFullYear(), '0000')
      case 'MM': return pad(date.getMonth() + 1, '00')
      case 'DD': return pad(date.getDate(), '00')
      case 'hh': return pad(date.getHours(), '00')
      case 'mm': return pad(date.getMinutes(), '00')
      case 'ss': return pad(date.getSeconds(), '00')
      case 'Month.de': return MONTHS_DE[date.getMonth()]
      case 'Month.en':
      case 'Month': return MONTHS_EN[date.getMonth()]
      default: return m0
    }
  })
}

export const pad = (
  x: string | number,
  pad: string
): string => {
  const str = `${x}`
  if (str.length >= pad.length) {
    return str
  }
  return pad.substr(0, pad.length - str.length) + str
}

export function nonce(length: number) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export const mustParseHumanDuration = (
  duration: string | number,
  allowNegative: boolean = false,
) => {
  if (duration === '') {
    throw new Error("unable to parse duration")
  }
  const d = `${duration}`.trim()
  if (!d) {
    throw new Error("unable to parse duration")
  }
  const checkNegative = (val: number) => {
    if (val < 0 && !allowNegative) {
      throw new Error("negative value not allowed")
    }
    return val
  }

  if (d.match(/^-?\d+$/)) {
    return checkNegative(parseInt(d, 10))
  }
  const m1 = d.match(/^(-?(?:\d*)\.(?:\d*))(d|h|m|s)$/)
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
    return checkNegative(Math.round(ms))
  }

  const m = d.match(/^(-?)(?:(\d+)d)?\s?(?:(\d+)h)?\s?(?:(\d+)m)?\s?(?:(\d+)s)?\s?(?:(\d+)ms)?$/)
  if (!m) {
    throw new Error("unable to parse duration")
  }

  const neg = m[1] ? -1 : 1;
  const D = m[2] ? parseInt(m[2], 10) : 0
  const H = m[3] ? parseInt(m[3], 10) : 0
  const M = m[4] ? parseInt(m[4], 10) : 0
  const S = m[5] ? parseInt(m[5], 10) : 0
  const MS = m[6] ? parseInt(m[6], 10) : 0

  return checkNegative(neg * (
    (S * SECOND)
    + (M * MINUTE)
    + (H * HOUR)
    + (D * DAY)
    + (MS)
  ))
}

export const parseHumanDuration = (
  duration: string | number,
  allowNegative: boolean = false,
) => {
  try {
    return mustParseHumanDuration(duration, allowNegative)
  } catch (e) {
    return 0
  }
}

export const humanDuration = (
  durationMs: number,
  units: string[] = ['ms', 's', 'm', 'h', 'd'],
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

export const hash = (str: string): number => {
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
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

/**
 * Swaps two items in array by index.
 *
 * Returns true if anything was swapped, otherwise false
 */
export const arraySwap = <T>(arr: T[], idx1: number, idx2: number): boolean => {
  if (idx1 === idx2) {
    return false
  }
  if (idx1 < 0 || idx1 > arr.length - 1) {
    return false
  }
  if (idx2 < 0 || idx2 > arr.length - 1) {
    return false
  }
  const tmp = arr[idx1]
  arr[idx1] = arr[idx2]
  arr[idx2] = tmp
  return true
}

const doDummyReplacements = (text: string, str: string) => {
  const regexes = [
    // regexes must match the ones in src/fn.ts doReplaces function
    /\$args(?:\((\d*)(:?)(\d*)\))?/g,
    /\$rand\(\s*(\d+)?\s*,\s*?(\d+)?\s*\)/g,
    /\$daysuntil\("([^"]+)"\)/g,
    /\$daysuntil\("([^"]+)",\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*,\s*?"([^"]*)"\s*\)/g,
    /\$var\(([^)]+)\)/g,
    /\$bot\.(version|date|website|github|features)/g,
    /\$user(?:\(([^)]+)\)|())\.(name|profile_image_url|recent_clip_url|last_stream_category)/g,
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

export const toNumberUnitString = (value: string | number, unit: string = 'pt') => {
  const valueStr = `${value}`;
  if (valueStr.match(/^\d+$/)) {
    return `${valueStr}${unit}`;
  }
  return valueStr;
};

export const getProp = (obj: any, keys: string[], defaultVal: any) => {
  let x = obj
  for (const key of keys) {
    if (typeof x !== 'object' || x === null) {
      return defaultVal
    }
    if (!Object.keys(x).includes(key)) {
      return defaultVal
    }
    x = x[key]
  }
  return x
}

export const arrayIncludesIgnoreCase = (arr: string[], val: string): boolean => {
  if (arr.length === 0) {
    return false
  }
  const valLowercase = val.toLowerCase()
  for (const item of arr) {
    if (item.toLowerCase() === valLowercase) {
      return true
    }
  }
  return false
}

export const clamp = (min: number, val: number, max: number): number => {
  return Math.max(min, Math.min(max, val))
}

export const withoutLeading = (string: string, prefix: string): string => {
  if (prefix === '') {
    return string
  }

  let tmp = string
  while (tmp.startsWith(prefix)) {
    tmp = tmp.substring(prefix.length)
  }
  return tmp
}

export const getRandomFloat = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
}

export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const getRandom = <T>(array: T[]): T => {
  return array[getRandomInt(0, array.length - 1)]
}

export const daysUntil = (
  s: string,
  templateN: string,
  template1: string,
  template0: string,
  templateErr: string,
): string => {
  const date00 = (date: Date) => new Date(`${pad(date.getFullYear(), '0000')}-${pad(date.getMonth() + 1, '00')}-${pad(date.getDate(), '00')}`)
  try {
    const date = new Date(s)
    if (isNaN(date.getTime())) {
      return templateErr
    }
    const now = new Date()
    const diffMs = date00(date).getTime() - date00(now).getTime()
    const days = Math.ceil(diffMs / 1000 / 60 / 60 / 24)
    let template = '{days}'
    if (days === 0) {
      template = template0
    } else if (days === 1) {
      template = template1
    } else {
      template = templateN
    }
    return template.replace('{days}', `${days}`)
  } catch (e) {
    return templateErr
  }
}

export default {
  arrayMove,
  arraySwap,
  clamp,
  daysUntil,
  doDummyReplacements,
  getRandom,
  getRandomFloat,
  getRandomInt,
  humanDuration,
  mediaFileFromUploadedFile,
  mustParseHumanDuration,
  pad,
  parseHumanDuration,
  shuffle,
  soundMediaFileFromUploadedFile,
  split,
  toNumberUnitString,
  unicodeLength,
}
