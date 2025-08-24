import { describe, expect, it } from 'vitest'
import {
  accentFolded,
  determineNewVolume,
  doReplacements,
  findIdxBySearch,
  findIdxBySearchExactPart,
  findIdxBySearchInOrder,
  findIdxFuzzy,
  joinIntoChunks,
  parseCommandFromTriggerAndMessage,
  parseISO8601Duration,
  safeFileName,
  normalizeChatMessage,
} from './fn'
import type { Command, CommandTrigger, FunctionCommand, RawCommand } from './types'
import type { TwitchEventContext } from './services/twitch'

describe('src/fn.ts', () => {
  describe('accentFolded', () => {
    const testCases = [
      {
        raw: 'Błogosławieni Miłosierni (Krysiek Remix)',
        expected: 'Blogoslawieni Milosierni (Krysiek Remix)',
      },
    ]

    testCases.forEach(({ raw, expected }) => it('accentFolded', () => {
      const actual = accentFolded(raw)
      expect(actual).toBe(expected)
    }))
  })

  describe('determineNewVolume', () => {
    const testCases = [
      { input: '10', current: 50, expected: 10 },
      { input: '+10', current: 50, expected: 60 },
      { input: '-10', current: 50, expected: 40 },
      { input: '-55', current: 50, expected: -5 },
      { input: '+55', current: 50, expected: 105 },
      { input: '--10', current: 50, expected: 50 },
      { input: '++10', current: 50, expected: 50 },
      { input: 'zz0z0', current: 50, expected: 50 },
    ]

    testCases.forEach(({ input, current, expected }) => it('determineNewVolume', () => {
      const actual = determineNewVolume(input, current)
      expect(actual).toBe(expected)
    }))
  })

  describe('joinIntoChunks', () => {
    const testCases = [
      {
        strings: ['hyottoko', 'van', 'megaport'],
        glue: ', ',
        maxChunkLen: 12,
        expected: ['hyottoko', 'van', 'megaport'],
      },
      {
        strings: ['hyottoko', 'van', 'port'],
        glue: ', ',
        maxChunkLen: 12,
        expected: ['hyottoko', 'van, port'],
      },
      {
        strings: ['hyottoko', 'van', 'megaport'],
        glue: ', ',
        maxChunkLen: 13,
        expected: ['hyottoko, van', 'megaport'],
      },
    ]

    testCases.forEach(({ strings, glue, maxChunkLen, expected }) => it('joinIntoChunks', () => {
      const actual = joinIntoChunks(strings, glue, maxChunkLen)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('parseISO8601Duration', () => {
    // @see https://en.wikipedia.org/wiki/ISO_8601#Durations
    const testCases = [
      {
        duration: 'P1Y',
        expected: 31536000000,
      },
      {
        duration: 'P1M',
        expected: 2592000000,
      },
      {
        duration: 'P1D',
        expected: 24 * 3600000,
      },
      {
        duration: 'PT1H',
        expected: 3600000,
      },
      {
        duration: 'PT1M',
        expected: 60000,
      },
      {
        duration: 'PT1S',
        expected: 1000,
      },
      {
        duration: 'P1Y1M1D',
        expected: 34214400000,
      },
      {
        duration: 'P1Y3M3D',
        expected: 39571200000,
      },
      {
        duration: 'P1Y3M3DT7H6M',
        expected: 39596760000,
      },
      {
        duration: 'P1Y3M3DT7H6M9S',
        expected: 39596769000,
      },
      {
        duration: 'PT3M14S',
        expected: 194000,
      },
      {
        duration: 'PT3M15S',
        expected: 195000,
      },
      {
        duration: 'PT3M27S',
        expected: 207000,
      },
      {
        duration: 'PT3M44S',
        expected: 224000,
      },
      {
        duration: 'PT4M3S',
        expected: 243000,
      },
    ]

    testCases.forEach(({ duration, expected }) => it('parseISO8601Duration', () => {
      // P(n)Y(n)M(n)DT(n)H(n)M(n)S
      const actual = parseISO8601Duration(duration)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('findIdxFuzzy', () => {
    const testCases = [
      {
        array: [
          'Welle Erdball - Starfighter F104S',
          'Smash Mouth - All Star (Official Music Video)',
        ],
        search: 'all star',
        expected: 1,
      },
    ]

    testCases.forEach(({ array, search, expected }) => it('findIdxFuzzy', () => {
      const actual = findIdxFuzzy(array, search)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('findIdxBySearchExactPart', () => {
    const testCases = [
      {
        array: ['abc', 'lel'],
        search: 'lel',
        expected: 1,
      },
      {
        array: ['Trio Da Da Da Official Video', 'Panda! Go Panda! (Panda Kopanda) intro theme'],
        search: 'da da da',
        expected: 0,
      },
      {
        array: ['Panda! Go Panda! (Panda Kopanda) intro theme', 'Trio Da Da Da Official Video'],
        search: 'da da da',
        expected: 1,
      },
    ]

    testCases.forEach(({ array, search, expected }) => it('findIdxBySearchExactPart', () => {
      const actual = findIdxBySearchExactPart(array, search)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('findIdxBySearchInOrder', () => {
    const testCases = [
      {
        array: ['abc', 'lel'],
        search: 'lel',
        expected: 1,
      },
      {
        array: ['Trio Da Da Da Official Video', 'Panda! Go Panda! (Panda Kopanda) intro theme'],
        search: 'da da da',
        expected: 0,
      },
      {
        array: ['Panda! Go Panda! (Panda Kopanda) intro theme', 'Trio Da Da Da Official Video'],
        search: 'da da da',
        expected: 1,
      },
      {
        array: ['Błogosławieni Miłosierni (Krysiek Remix)', 'Blogoslawieni Milosierni (Krysiek Remix)'],
        search: 'blogo',
        expected: 0,
      },
    ]

    testCases.forEach(({ array, search, expected }) => it('findIdxBySearchInOrder', () => {
      const actual = findIdxBySearchInOrder(array, search)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('findIdxBySearch', () => {
    const testCases = [
      {
        array: ['abc', 'lel'],
        search: 'lel',
        expected: 1,
      },
    ]

    testCases.forEach(({ array, search, expected }) => it('findIdxBySearch', () => {
      const actual = findIdxBySearch(array, search)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('parseCommandFromTriggerAndMessage', () => {
    const testCases = [
      {
        msg: '!sr good good',
        command: {
          value: '!sr good',
          match: 'startsWith',
        },
        expected: { name: '!sr good', args: ['good'] },
      },
      {
        msg: '!sr good',
        command: {
          value: '!sr good',
          match: 'startsWith',
        },
        expected: { name: '!sr good', args: [] },
      },
      {
        msg: '!sr hello',
        command: {
          value: '!sr',
          match: 'startsWith',
        },
        expected: { name: '!sr', args: ['hello'] },
      },
      {
        msg: '!sr',
        command: {
          value: '!sr',
          match: 'startsWith',
        },
        expected: { name: '!sr', args: [] },
      },
      {
        msg: '!sr good good',
        command: {
          value: '!sr good',
          match: 'exact',
        },
        expected: null,
      },
      {
        msg: '!sr good',
        command: {
          value: '!sr good',
          match: 'exact',
        },
        expected: { name: '!sr good', args: [] },
      },
      {
        msg: '!sr hello',
        command: {
          value: '!sr',
          match: 'exact',
        },
        expected: null,
      },
      {
        msg: '!sr',
        command: {
          value: '!sr',
          match: 'exact',
        },
        expected: { name: '!sr', args: [] },
      },
      {
        msg: '!sr LULgood good',
        command: {
          value: 'LUL',
          match: 'anywhere',
        },
        expected: null,
      },
      {
        msg: '!sr LUL good good',
        command: {
          value: 'LUL',
          match: 'anywhere',
        },
        expected: { name: 'LUL', args: [] },
      },
      {
        msg: 'LUL good good',
        command: {
          value: 'LUL',
          match: 'anywhere',
        },
        expected: { name: 'LUL', args: [] },
      },
      {
        msg: 'good good LUL',
        command: {
          value: 'LUL',
          match: 'anywhere',
        },
        expected: { name: 'LUL', args: [] },
      },
      {
        msg: 'good good LUL',
        command: {
          value: 'good LUL',
          match: 'anywhere',
        },
        expected: { name: 'good LUL', args: [] },
      },
    ]

    testCases.forEach(({ msg, command, expected }) => it(`parseCommandFromTriggerAndMessage ${msg}`, () => {
      const trigger = { type: 'command', data: { command } } as CommandTrigger
      const actual = parseCommandFromTriggerAndMessage(msg, trigger)
      expect(actual).toStrictEqual(expected)
    }))
  })

  describe('normalizeChatMessage', () => {
    const testCases = [
      {
        text: '!sr next 󠀀',
        expected: '!sr next',
      },
    ]

    testCases.forEach(({ text, expected }) => it(text, () => {
      const actual = normalizeChatMessage(text)
      expect(actual).toBe(expected)
    }))
  })

  describe('doReplacements', () => {
    const testCases: {
      text: string
      command: RawCommand | null,
      context: TwitchEventContext | null,
      originalCmd: Command | FunctionCommand | null,
      expected: string
    }[] = [
      {
        text: 'lalala',
        command: null,
        context: null,
        originalCmd: {} as Command,
        expected: 'lalala',
      },
      {
        text: 'bla $user.name',
        command: null,
        context: null,
        originalCmd: {} as Command,
        expected: 'bla ',
      },
      {
        text: '$user.name',
        command: null,
        context: {
          'room-id': '',
          'user-id': '',
          'display-name': 'mondgesicht',
          username: 'bla',
          mod: false,
          subscriber: false,
          badges: {},
        },
        originalCmd: {} as Command,
        expected: 'mondgesicht',
      },
      {
        text: '$args',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg1 arg2 arg3 arg4 arg5',
      },
      {
        text: '$args()',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg1 arg2 arg3 arg4 arg5',
      },
      {
        text: '$args(1:)',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg2 arg3 arg4 arg5',
      },
      {
        text: '$args(2:3)',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg3 arg4',
      },
      {
        text: '$args(:2)',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg1 arg2 arg3',
      },
      {
        text: '$args(0) $args(1)',
        command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
        context: null,
        originalCmd: {} as Command,
        expected: 'arg1 arg2',
      },
      {
        text: 'bla $user($args).name',
        command: { name: 'cmd', args: ['@exampleuser'] },
        context: {
          'room-id': '',
          'user-id': '',
          'display-name': 'exampleuser',
          username: 'exampleuser',
          mod: false,
          subscriber: false,
          badges: {},
        },
        originalCmd: {} as Command,
        expected: 'bla exampleuser',
      },
      {
        text: 'bla $user($args).name',
        command: { name: 'cmd', args: ['exampleuser'] },
        context: {
          'room-id': '',
          'user-id': '',
          'display-name': 'exampleuser',
          username: 'exampleuser',
          mod: false,
          subscriber: false,
          badges: {},
        },
        originalCmd: {} as Command,
        expected: 'bla exampleuser',
      },
    ]

    testCases.forEach(({ text, command, context, originalCmd, expected }) => it(text, async () => {
      const actual = await doReplacements(text, command, context, originalCmd, null, null)
      expect(actual).toBe(expected)
    }))
  })

  describe('safeFileName', () => {
    const testCases = [
      {
        name: 'is ok',
        string: 'heLLo0193',
        expected: 'heLLo0193',
      },
      {
        name: 'empty',
        string: '',
        expected: '',
      },
      {
        name: 'contains some bad chars',
        string: 'Some:%file_zname.p0000g.champ',
        expected: 'Some__file_zname.p0000g.champ',
      },
      {
        name: 'contains only chars',
        string: '%@#$',
        expected: '____',
      },
      {
        name: 'contains slashes and backslashes',
        string: 'file/Z0zo\\zozo.jpg',
        expected: 'file_Z0zo_zozo.jpg',
      },
    ]

    testCases.forEach(({ name, string, expected }) => it(name, () => {
      const actual = safeFileName(string)
      expect(actual).toBe(expected)
    }))
  })
})
