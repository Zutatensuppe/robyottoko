
export const MS = 1
export const SECOND = 1000 * MS
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const MONTH = 30 * DAY
export const YEAR = 365 * DAY

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
    var k = newIndex - arr.length + 1
    while (k--) {
      arr.push(undefined)
    }
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0])
  return arr // return, but array is also modified in place
}

const doDummyReplacements = (text: string, str: string) => {
  const replaces = [
    {
      regex: /\$args\(\)/g,
      replacer: (m0: string, m1: string) => {
        return str
      },
    },
    {
      regex: /\$args\((\d+)\)/g,
      replacer: (m0: string, m1: string) => {
        return str
      },
    },
    {
      regex: /\$var\(([^)]+)\)/g,
      replacer: (m0: string, m1: string) => {
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
      replacer: (m0: string, m1: string) => {
        switch (m1) {
          case 'args': str
        }
        return m0
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
      replacer: (m0: string, m1: string, m2: string) => {
        return str
      },
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: (m0: string, m1: string) => {
        return str
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: (m0: string, m1: string) => {
        return str
      },
    },
    {
      regex: /\$calc\((\d+)([*/+-])(\d+)\)/g,
      replacer: (m0: string, arg1: string, op: string, arg2: string) => {
        return str
      }
    }
  ]
  let replaced = text
  let orig
  do {
    orig = replaced
    for (let replace of replaces) {
      replaced = replaced.replace(replace.regex, replace.replacer)
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

export const shuffle = (array: any[]) => {
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

export default {
  arrayMove,
  humanDuration,
  parseHumanDuration,
  mustParseHumanDuration,
  doDummyReplacements,
  split,
  shuffle,
}
