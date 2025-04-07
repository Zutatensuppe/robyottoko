
import { describe, expect, it } from 'vitest'
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
  dateformat,
} from './fn'

describe('src/common/fn.ts', () => {
  describe('parseHumanDuration', () => {
    const testCases = [
      {
        duration: '1d',
        expected: 24 * 3600000,
      },
      {
        duration: '1h',
        expected: 3600000,
      },
      {
        duration: '1m',
        expected: 60000,
      },
      {
        duration: '1s',
        expected: 1000,
      },
      {
        duration: '3m14s',
        expected: 194000,
      },
      {
        duration: '3m 14s',
        expected: 194000,
      },
      {
        duration: '3m 15s',
        expected: 195000,
      },
      {
        duration: '3m27s',
        expected: 207000,
      },
      {
        duration: '1000',
        expected: 1000,
      },
      {
        duration: '50ms',
        expected: 50,
      },
      {
        duration: '1s 50ms',
        expected: 1050,
      },
      {
        duration: '1.5s',
        expected: 1500,
      },
    ]

    testCases.forEach(({ duration, expected }) => it(`parseHumanDuration ${duration}`, () => {
      const actual = parseHumanDuration(duration)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('arrayMove', () => {
    const testCases = [
      {
        arr: ['a', 'b', 'c', 'd'],
        from: 0,
        to: 2,
        expected: ['b', 'c', 'a', 'd'],
      },
      {
        arr: ['a', 'b', 'c', 'd'],
        from: 0,
        to: 2,
        expected: ['b', 'c', 'a', 'd'],
      },
    ]

    testCases.forEach(({ arr, from, to, expected }) => it('arrayMove', () => {
      const actual = arrayMove(arr, from, to)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('arraySwap', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ arr, idx1, idx2, expected }) => it('arraySwap', () => {
      const actual = arraySwap(arr, idx1, idx2)
      if (expected === null) {
        expect(actual).toBe(false)
      } else {
        expect(arr).toStrictEqual(expected)
        expect(actual).toBe(true)
      }
    }))
  })

  describe('calculateOptimalSubtitleDisplayTimeMs', () => {
    const testCases = [
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
        expected: 1000,
      },
      {
        text: 'texttexttext',
        expected: 1000,
      },
    ]

    testCases.forEach(({ text, expected }) => it(`calculateOptimalSubtitleDisplayTimeMs ${text}`, () => {
      const actual = calculateOptimalSubtitleDisplayTimeMs(text)
      expect(actual).toBe(expected)
    }))
  })

  describe('clamp', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ min, val, max, expected }) => it(`clamp ${min} > ${val} < ${max}`, () => {
      const actual = clamp(min, val, max)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('humanDuration', () => {
    const testCases = [
      {
        duration: SECOND,
        expected: '1s',
      },
      {
        duration: MINUTE,
        expected: '1m',
      },
      {
        duration: HOUR,
        expected: '1h',
      },
      {
        duration: HOUR + 34 * SECOND,
        expected: '1h 0m 34s',
      },
      {
        duration: DAY,
        expected: '1d',
      },
      {
        duration: 45 * MS,
        expected: '45ms',
      },
      {
        duration: DAY + 5 * HOUR + 40 * MINUTE + 34 * SECOND,
        expected: '1d 5h 40m 34s',
      },
      {
        duration: 2163000,
        expected: '36m 3s',
      },
    ]

    testCases.forEach(({ duration, expected }) => it(`humanDuration ${expected}`, () => {
      const actual = humanDuration(duration)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('unicodeLength', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ str, expected }) => it(`unicodeLength ${str}`, () => {
      const actual = unicodeLength(str)
      expect(actual).toBe(expected)
    }))
  })

  describe('toNumberUnitString', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ number, unit, expected }) => it(`toNumberUnitString ${number} ${unit}`, () => {
      const actual = toNumberUnitString(number, unit)
      expect(actual).toBe(expected)
    }))
  })

  describe('getProp', () => {
    const testCases = [
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
    ]

    testCases.forEach(({ obj, keys, defaultVal, expected }) => it('getProp', () => {
      const actual = getProp(obj, keys, defaultVal)
      expect(actual).toBe(expected)
    }))
  })

  describe('withoutLeading', () => {
    const testCases = [
      {
        name: 'empty',
        string: '',
        prefix: '',
        expected: '',
      },
      {
        name: 'prefix not found',
        string: 'hello',
        prefix: 'ello',
        expected: 'hello',
      },
      {
        name: 'prefix found',
        string: 'hello',
        prefix: 'hel',
        expected: 'lo',
      },
      {
        name: 'multiple found',
        string: '///bla',
        prefix: '/',
        expected: 'bla',
      },
    ]

    testCases.forEach(({ name, string, prefix, expected }) => it(name, () => {
      const actual = withoutLeading(string, prefix)
      expect(actual).toBe(expected)
    }))
  })

  describe('daysUntil', () => {
    const dateStr = (date: Date) => `${pad(date.getFullYear(), '0000')}-${pad(date.getMonth() + 1, '00')}-${pad(date.getDate(), '00')}`
    const now = new Date()

    const testCases = [
      {
        name: '2 days ago',
        date: dateStr(new Date(now.getTime() - 2 * DAY)),
        expected: '-2 days until XXX',
      },
      {
        name: 'today',
        date: dateStr(now),
        expected: 'Today is XXX',
      },
      {
        name: 'in 1 day',
        date: dateStr(new Date(now.getTime() + 1 * DAY)),
        expected: '1 day until XXX',
      },
      {
        name: 'invalid date',
        date: 'bla',
        expected: '???',
      },
    ]

    testCases.forEach(({ name, date, expected }) => it(name, () => {
      const actual = daysUntil(
        date,
        '{days} days until XXX',
        '{days} day until XXX',
        'Today is XXX',
        '???',
      )
      expect(actual).toBe(expected)
    }))
  })

  describe('dateformat', () => {
    const date = new Date('2020-01-01 10:00:00')

    const testCases = [
      {
        date: date,
        format: 'YYYY MM DD hh mm ss',
        expected: '2020 01 01 10 00 00',
      },
      {
        date: date,
        format: 'Month',
        expected: 'January',
      },
      {
        date: date,
        format: 'Month.en',
        expected: 'January',
      },
      {
        date: date,
        format: 'Month.de',
        expected: 'Januar',
      },
    ]

    testCases.forEach(({ date, format, expected }) => it(`dateformat ${format}`, () => {
      const actual = dateformat(format, date)
      expect(actual).toBe(expected)
    }))
  })
})
