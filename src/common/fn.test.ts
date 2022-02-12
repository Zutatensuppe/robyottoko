import {
  calculateOptimalSubtitleDisplayTimeMs,
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
