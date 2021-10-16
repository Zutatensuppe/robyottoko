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

export default {
  parseHumanDuration,
  mustParseHumanDuration,
}
