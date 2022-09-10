
import {
  arrayMove,
  arraySwap,
  calculateOptimalSubtitleDisplayTimeMs,
  clamp,
  daysUntil,
  toNumberUnitString,
  humanDuration,
  parseHumanDuration,
  unicodeLength,
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  MS,
  getProp,
  withoutLeading,
  pad,
} from './fn'

test.each`
duration     | expected
${'1d'}      | ${24 * 3600000}
${'1h'}      | ${3600000}
${'1m'}      | ${60000}
${'1s'}      | ${1000}
${'3m14s'}   | ${194000}
${'3m 14s'}  | ${194000}
${'3m 15s'}  | ${195000}
${'3m27s'}   | ${207000}
${'1000'}    | ${1000}
${'50ms'}    | ${50}
${'1s 50ms'} | ${1050}
${'1.5s'}    | ${1500}
`('parseHumanDuration $duration', ({ duration, expected }) => {
  const actual = parseHumanDuration(duration)
  expect(actual).toStrictEqual(expected)
})

test.each`
arr                     | from | to   | expected
${['a', 'b', 'c', 'd']} | ${2} | ${0} | ${['c', 'a', 'b', 'd']}
${['a', 'b', 'c', 'd']} | ${0} | ${2} | ${['b', 'c', 'a', 'd']}
`('arrayMove', ({ arr, from, to, expected }) => {
  const actual = arrayMove(arr, from, to)
  expect(actual).toStrictEqual(expected)
})

test.each([
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 0,
    idx2: 2,
    expected: ['c', 'b', 'a', 'd'],
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 3,
    idx2: 0,
    expected: ['d', 'b', 'c', 'a'],
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 0,
    idx2: 0,
    expected: null, // means that the array should not be modified
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 0,
    idx2: -1,
    expected: null, // means that the array should not be modified
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: -1,
    idx2: 0,
    expected: null, // means that the array should not be modified
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 0,
    idx2: 4,
    expected: null, // means that the array should not be modified
  },
  {
    arr: ['a', 'b', 'c', 'd'],
    idx1: 4,
    idx2: 0,
    expected: null, // means that the array should not be modified
  },
])('arraySwap', ({ arr, idx1, idx2, expected }) => {
  const actual = arraySwap(arr, idx1, idx2)
  if (expected === null) {
    expect(actual).toBe(false)
  } else {
    expect(arr).toStrictEqual(expected)
    expect(actual).toBe(true)
  }
})

describe('fn.calculateOptimalSubtitleDisplayTimeMs', () => {
  test.each([
    {
      text: 'text text text text text text text text text text text text text text text',
      expected: 5000,
    },
    {
      text: 'text text text text text text text text text text text text text text text text',
      expected: 5333,
    },
    {
      text: 't 69   t te   x t 420   t',
      expected: 1000
    },
    {
      text: 'texttexttext',
      expected: 1000
    },
  ])('calculateOptimalSubtitleDisplayTimeMs $text', ({ text, expected }) => {
    const actual = calculateOptimalSubtitleDisplayTimeMs(text)
    expect(actual).toBe(expected)
  })
})


test.each([
  // value smaller than min
  {
    min: -1,
    val: -5,
    max: 1,
    expected: -1,
  },
  // value ok
  {
    min: -1,
    val: 0,
    max: 1,
    expected: 0,
  },
  // value bigger than max
  {
    min: -1,
    val: 2,
    max: 1,
    expected: 1,
  },
])('clamp $min > $val < $max', ({ min, val, max, expected }) => {
  const actual = clamp(min, val, max)
  expect(actual).toStrictEqual(expected)
})


test.each`
duration   | expected
${SECOND}  | ${'1s'}
${MINUTE}  | ${'1m'}
${HOUR}    | ${'1h'}
${HOUR + 34 * SECOND}  | ${'1h 0m 34s'}
${DAY}     | ${'1d'}
${45 * MS} | ${'45ms'}
${DAY + 5 * HOUR + 40 * MINUTE + 34 * SECOND} | ${'1d 5h 40m 34s'}
${2163000} | ${'36m 3s'}
`('humanDuration $expected', ({ duration, expected }) => {
  const actual = humanDuration(duration)
  expect(actual).toStrictEqual(expected)
})


test.each([
  {
    str: '💙💛',
    expected: 2,
  },
  {
    str: '💙 !puckfutin ♡ translating my fox-girl visual novel to russian while kirinokirino distracts me by learning ukranian on duolingo ♡ !sr add 💙💙',
    expected: 140,
  },
  {
    str: 'hello',
    expected: 5,
  },
])('unicodeLenth', ({ str, expected }) => {
  const actual = unicodeLength(str)
  expect(actual).toBe(expected)
})


test.each([
  {
    number: '400',
    unit: 'px',
    expected: '400px',
  },
  {
    number: 400,
    unit: 'px',
    expected: '400px',
  },
  {
    number: '400px',
    unit: 'pt',
    expected: '400px',
  },
  {
    number: '400em',
    unit: 'px',
    expected: '400em',
  },
])('toNumberUnitString', ({ number, unit, expected }) => {
  const actual = toNumberUnitString(number, unit)
  expect(actual).toBe(expected)
})


test.each([
  {
    obj: '400',
    keys: ['px'],
    defaultVal: 1235,
    expected: 1235,
  },
  {
    obj: {},
    keys: ['px'],
    defaultVal: 1235,
    expected: 1235,
  },
  {
    obj: { bla: 0 },
    keys: ['px'],
    defaultVal: 1235,
    expected: 1235,
  },
  {
    obj: { px: 0 },
    keys: ['px'],
    defaultVal: 1235,
    expected: 0,
  },
  {
    obj: { px: 100 },
    keys: ['px'],
    defaultVal: 0,
    expected: 100,
  },
  {
    obj: { px: { bla: { blub: 'ui' } } },
    keys: ['px', 'bla', 'blub'],
    defaultVal: 10,
    expected: 'ui',
  },
  {
    obj: null,
    keys: ['px', 'bla', 'blub'],
    defaultVal: 10,
    expected: 10,
  },
  {
    obj: undefined,
    keys: ['px', 'bla', 'blub'],
    defaultVal: 10,
    expected: 10,
  },
  {
    obj: { px: null },
    keys: ['px', 'bla', 'blub'],
    defaultVal: 10,
    expected: 10,
  },
  {
    obj: { px: { bla: { blub: null } } },
    keys: ['px', 'bla', 'blub'],
    defaultVal: 10,
    expected: null,
  },
])('getProp', ({ obj, keys, defaultVal, expected }) => {
  const actual = getProp(obj, keys, defaultVal)
  expect(actual).toBe(expected)
})

describe('withoutLeading', () => {
  test.each([
    {
      _name: 'empty',
      string: '',
      prefix: '',
      expected: '',
    },
    {
      _name: 'prefix not found',
      string: 'hello',
      prefix: 'ello',
      expected: 'hello',
    },
    {
      _name: 'prefix found',
      string: 'hello',
      prefix: 'hel',
      expected: 'lo',
    },
    {
      _name: 'multiple found',
      string: '///bla',
      prefix: '/',
      expected: 'bla',
    },
  ])('$_name', ({ _name, string, prefix, expected }) => {
    const actual = withoutLeading(string, prefix)
    expect(actual).toBe(expected)
  })
})

describe('daysUntil', () => {
  const dateStr = (date: Date) => `${pad(date.getFullYear(), '0000')}-${pad(date.getMonth() + 1, '00')}-${pad(date.getDate(), '00')}`
  const now = new Date()
  test.each([
    {
      _name: '2 days ago',
      date: dateStr(new Date(now.getTime() - 2 * DAY)),
      expected: '-2 days until XXX',
    },
    {
      _name: 'today',
      date: dateStr(now),
      expected: 'Today is XXX',
    },
    {
      _name: 'in 1 day',
      date: dateStr(new Date(now.getTime() + 1 * DAY)),
      expected: '1 day until XXX',
    },
    {
      _name: 'invalid date',
      date: 'bla',
      expected: '???',
    },
  ])('$_name', ({ _name, date, expected }) => {
    console.log(date)
    const actual = daysUntil(
      date,
      '{days} days until XXX',
      '{days} day until XXX',
      'Today is XXX',
      '???',
    )
    expect(actual).toBe(expected)
  })
})
