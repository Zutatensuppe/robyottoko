const config = require('./config.js')
const path = require('path')
const { getText } = require('./net/xhr')

// error | info | log | debug
const logLevel = config?.log?.level || 'info'
let logEnabled = [] // always log errors
switch (logLevel) {
  case 'error': logEnabled = ['error']; break
  case 'info': logEnabled = ['error', 'info']; break
  case 'log': logEnabled = ['error', 'info', 'log']; break
  case 'debug': logEnabled = ['error', 'info', 'log', 'debug']; break
}
const logger = (filename, ...pre) => {
  const b = path.basename(filename)
  const fn = t => (...args) => {
    if (logEnabled.includes(t)) {
      console[t](`[${b}]`, ...pre, ...args)
    }
  }
  return {
    log: fn('log'),
    info: fn('info'),
    debug: fn('debug'),
    error: fn('error'),
  }
}

const log = logger(__filename)

const MS = 1
const SECOND = 1000 * MS
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

function mimeToExt(/** @type string */ mime) {
  if (/image\//.test(mime)) {
    return mime.replace('image/', '')
  }
  return ''
}

function decodeBase64Image(/** @type string */ base64Str) {
  const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string')
  }
  return {
    type: matches[1],
    data: Buffer.from(matches[2], 'base64'),
  }
}

const shuffle = (array) => {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

function getRandomInt(/** @type number */ min, /** @type number */ max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom(array) {
  return array[getRandomInt(0, array.length - 1)]
}

function nonce(/** @type number */ length) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

const render = async (template, data) => {
  const { TwingEnvironment, TwingLoaderFilesystem } = require('twing');
  const loader = new TwingLoaderFilesystem(__dirname + '/templates')
  const twing = new TwingEnvironment(loader)
  return twing.render(template, data)
}

const fnRandom = (values) => () => getRandom(values)

const sleep = (/** @type number */ ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}

const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id']
const isMod = (ctx) => !!ctx.mod || isBroadcaster(ctx)
const isSubscriber = (ctx) => !!ctx.subscriber || isBroadcaster(ctx)

const sayFn = (
  client,
  /** @type string */ target,
) => (
  /** @type string */ msg
) => {
    const targets = target ? [target] : client.channels
    targets.forEach(t => {
      log.info(`saying in ${t}: ${msg}`)
      client.say(t, msg).catch(_ => { })
    })
  }

const mayExecute = (context, cmd) => {
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

const parseKnownCommandFromMessage = (
  /** @type string */ msg,
  /** @type string */ cmd
) => {
  if (msg.startsWith(cmd + ' ') || msg === cmd) {
    const name = msg.substr(0, cmd.length).trim()
    const args = msg.substr(cmd.length).trim().split(' ').filter(s => !!s)
    return { name, args }
  }
  return null
}

const parseCommandFromMessage = (/** @type string */ msg) => {
  const command = msg.trim().split(' ')
  return { name: command[0], args: command.slice(1) }
}

const tryExecuteCommand = async (
  contextModule,
  /** @type {name: string, args: string[]} */ rawCmd,
  /** @type any[] */ cmdDefs,
  client,
  /** @type string */ target,
  context,
  /** @type string */ msg
) => {
  for (const cmdDef of cmdDefs) {
    if (!mayExecute(context, cmdDef)) {
      continue
    }
    log.info(`${target}| * Executing ${rawCmd.name} command`)
    if (cmdDef.variableChanges) {
      cmdDef.variableChanges.forEach(variableChange => {
        // check if there is a local variable for the change
        let idx = cmdDef.variables.findIndex(v => (v.name === variableChange.name))
        if (idx !== -1) {
          if (variableChange.change === 'set') {
            cmdDef.variables[idx].value = variableChange.value
          } else if (variableChange.change === 'increase_by') {
            cmdDef.variables[idx].value = (
              parseInt(cmdDef.variables[idx].value, 10)
              + parseInt(variableChange.value, 10)
            )
          } else if (variableChange.change === 'decrease_by') {
            cmdDef.variables[idx].value = (
              parseInt(cmdDef.variables[idx].value, 10)
              - parseInt(variableChange.value, 10)
            )
          }
          //
          return
        }

        const globalVars = contextModule.variables.all()
        idx = globalVars.findIndex(v => (v.name === variableChange.name))
        if (idx !== -1) {
          if (variableChange.change === 'set') {
            contextModule.variables.set(variableChange.name, variableChange.value)
          } else if (variableChange.change === 'increase_by') {
            contextModule.variables.set(variableChange.name, (
              parseInt(globalVars[idx].value, 10)
              + parseInt(variableChange.value, 10)
            ))
          } else if (variableChange.change === 'decrease_by') {
            contextModule.variables.set(variableChange.name, (
              parseInt(globalVars[idx].value, 10)
              - parseInt(variableChange.value, 10)
            ))
          }
          //
          return
        }
      })
      contextModule.saveCommands()
    }
    const r = await cmdDef.fn(rawCmd, client, target, context, msg)
    if (r) {
      log.info(`${target}| * Returned: ${r}`)
    }
    log.info(`${target}| * Executed ${rawCmd.name} command`)
  }
}

async function replaceAsync(
  /** @type string */ str,
  /** @type RegExp */ regex,
  /** @type (...string) => Promise<any> */ asyncFn,
) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

const doReplacements = async (
  /** @type string */ text,
  command,
  context,
  /** @type Variables */ variables,
  originalCmd,
) => {
  const replaces = [
    {
      regex: /\$args\((\d+)\)/g,
      replacer: (m0, m1) => {
        const index = parseInt(m1, 10)
        if (index < command.args.length) {
          return command.args[index]
        }
        return ''
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: (m0, m1) => {
        const v = originalCmd.variables.find(v => v.name === m1)
        const val = v ? v.value : variables.get(m1)
        return val === null ? '' : val
      },
    },
    {
      regex: /\$user\.name/g,
      replacer: () => {
        return context['display-name']
      },
    },
    {
      regex: /\$([a-z][a-z0-9]*)(?!\()/g,
      replacer: (m0, m1) => {
        switch (m1) {
          case 'args': return command.args.join(' ')
        }
        return m0
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
      replacer: async (m0, m1, m2) => {
        const txt = await getText(await doReplacements(m1, command))
        return JSON.parse(txt)[m2]
      },
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return await getText(await doReplacements(m1, command))
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return encodeURIComponent(await doReplacements(m1, command))
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

const split = (
  /** @type string */ str,
  /** @type string */ delimiter = ',',
  /** @type number */ maxparts = -1,
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

const joinIntoChunks = (
  /** @type Array */ strings,
  /** @type string */ glue,
  /** @type number */ maxChunkLen,
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

const pad = (
  /** @type number */ x,
  /** @type string */ pad
) => {
  const str = `${x}`
  if (str.length >= pad.length) {
    return str
  }
  return pad.substr(0, pad.length - str.length) + str
}

const parseISO8601Duration = (
  /** @type string */ duration
) => {
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

const humanDuration = (
  /** @type number */ durationMs
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

const mustParseHumanDuration = (
  /** @type string|number */ duration
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

const parseHumanDuration = (
  /** @type string|number */ duration
) => {
  try {
    return mustParseHumanDuration(duration)
  } catch (e) {
    return 0
  }
}

function arrayMove(arr, old_index, new_index) {
  if (new_index >= arr.length) {
    var k = new_index - arr.length + 1
    while (k--) {
      arr.push(undefined)
    }
  }
  arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
  return arr // return, but array is also modified in place
}

module.exports = {
  logger,
  mimeToExt,
  decodeBase64Image,
  sayFn,
  mayExecute,
  parseCommandFromMessage,
  parseKnownCommandFromMessage,
  tryExecuteCommand,
  render,
  getRandomInt,
  getRandom,
  shuffle,
  sleep,
  fnRandom,
  pad,
  parseISO8601Duration,
  parseHumanDuration,
  humanDuration,
  isBroadcaster,
  isMod,
  isSubscriber,
  doReplacements,
  nonce,
  split,
  joinIntoChunks,
  arrayMove,
  MS,
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  YEAR,
}
