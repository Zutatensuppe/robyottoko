import {
  calculateOptimalSubtitleDisplayTimeMs,
  humanDuration,
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  MS,
} from './fn'

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
