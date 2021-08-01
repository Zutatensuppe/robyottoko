// TODO: make it so that fn can be used from frontend directly

const MS = 1
const SECOND = 1000 * MS
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

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

const doDummyReplacements = (text, str) => {
  const replaces = [
    {
      regex: /\$args\((\d+)\)/g,
      replacer: (m0, m1) => {
        return str
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: (m0, m1) => {
        return str
      },
    },
    {
      regex: /\$user\.name/g,
      replacer: () => {
        return str
      },
    },
    {
      regex: /\$([a-z][a-z0-9]*)(?!\()/g,
      replacer: (m0, m1) => {
        return str
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
      replacer: (m0, m1, m2) => {
        return str
      },
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: (m0, m1) => {
        return str
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: (m0, m1) => {
        return str
      },
    },
  ]
  let replaced = text
  for (let replace of replaces) {
    replaced = replaced.replace(replace.regex, replace.replacer)
  }
  return replaced
}

export default {
  arrayMove,
  humanDuration,
  parseHumanDuration,
  mustParseHumanDuration,
  doDummyReplacements,
}
