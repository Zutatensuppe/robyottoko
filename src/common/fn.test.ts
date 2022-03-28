import {
  arrayMove,
  calculateOptimalSubtitleDisplayTimeMs,
  toNumberUnitString,
  humanDuration,
  parseHumanDuration,
  unicodeLength,
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  MS,
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
