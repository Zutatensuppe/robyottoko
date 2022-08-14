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
} from './fn'
import { Command, CommandTrigger } from './types'

test('accentFolded', () => {
  const actual = accentFolded('Błogosławieni Miłosierni (Krysiek Remix)')
  const expected = 'Blogoslawieni Milosierni (Krysiek Remix)'
  expect(actual).toBe(expected)
})

test.each([
  { input: '10', current: 50, expected: 10 },
  { input: '+10', current: 50, expected: 60 },
  { input: '-10', current: 50, expected: 40 },
  { input: '-55', current: 50, expected: -5 },
  { input: '+55', current: 50, expected: 105 },
  { input: '--10', current: 50, expected: 50 },
  { input: '++10', current: 50, expected: 50 },
  { input: 'zz0z0', current: 50, expected: 50 },
])('determineNewVolume', ({ input, current, expected }) => {
  const actual = determineNewVolume(input, current)
  expect(actual).toBe(expected)
})

describe('fn.joinIntoChunks', () => {
  test.each([
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
  ])('joinIntoChunks', ({ strings, glue, maxChunkLen, expected }) => {
    const actual = joinIntoChunks(strings, glue, maxChunkLen)
    expect(actual).toStrictEqual(expected)
  })
})

describe('fn.parseISO8601Duration', () => {
  // @see https://en.wikipedia.org/wiki/ISO_8601#Durations
  test.each`
  duration            | expected
  ${'P1Y'}            | ${31536000000}
  ${'P1M'}            | ${2592000000}
  ${'P1D'}            | ${24 * 3600000}
  ${'PT1H'}           | ${3600000}
  ${'PT1M'}           | ${60000}
  ${'PT1S'}           | ${1000}
  ${'P1Y1M1D'}        | ${34214400000}
  ${'P1Y3M3D'}        | ${39571200000}
  ${'P1Y3M3DT7H6M'}   | ${39596760000}
  ${'P1Y3M3DT7H6M9S'} | ${39596769000}
  ${'PT3M14S'}        | ${194000}
  ${'PT3M15S'}        | ${195000}
  ${'PT3M27S'}        | ${207000}
  ${'PT3M44S'}        | ${224000}
  ${'PT4M3S'}         | ${243000}
  `('parseISO8601Duration $duration', ({ duration, expected }) => {
    // P(n)Y(n)M(n)DT(n)H(n)M(n)S
    const actual = parseISO8601Duration(duration)
    expect(actual).toStrictEqual(expected)
  })
})

test.each([
  {
    array: [
      'Welle Erdball - Starfighter F104S',
      'Smash Mouth - All Star (Official Music Video)',
    ],
    search: 'all star',
    expected: 1,
  },
])('findIdxFuzzy', ({ array, search, expected }) => {
  const actual = findIdxFuzzy(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each([
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
])('findIdxBySearchExactPart', ({ array, search, expected }) => {
  const actual = findIdxBySearchExactPart(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each([
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
])('findIdxBySearchInOrder', ({ array, search, expected }) => {
  const actual = findIdxBySearchInOrder(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each([
  {
    array: ['abc', 'lel'],
    search: 'lel',
    expected: 1,
  },
])('findIdxBySearch', ({ array, search, expected }) => {
  const actual = findIdxBySearch(array, search)
  expect(actual).toStrictEqual(expected)
})

describe('fn.parseKnownCommandFromTriggerAndMessage', () => {
  test.each([
    {
      msg: '!sr good good',
      command: '!sr good',
      commandExact: false,
      expected: { name: '!sr good', args: ['good'] },
    },
    {
      msg: '!sr good',
      command: '!sr good',
      commandExact: false,
      expected: { name: '!sr good', args: [] },
    },
    {
      msg: '!sr hello',
      command: '!sr',
      commandExact: false,
      expected: { name: '!sr', args: ['hello'] },
    },
    {
      msg: '!sr',
      command: '!sr',
      commandExact: false,
      expected: { name: '!sr', args: [] },
    },
    {
      msg: '!sr good good',
      command: '!sr good',
      commandExact: true,
      expected: null,
    },
    {
      msg: '!sr good',
      command: '!sr good',
      commandExact: true,
      expected: { name: '!sr good', args: [] },
    },
    {
      msg: '!sr hello',
      command: '!sr',
      commandExact: true,
      expected: null,
    },
    {
      msg: '!sr',
      command: '!sr',
      commandExact: true,
      expected: { name: '!sr', args: [] },
    },
  ])('parseKnownCommandFromTriggerAndMessage $msg', ({ msg, command, commandExact, expected }) => {
    const trigger = { type: 'command', data: { command, commandExact } } as CommandTrigger
    const actual = parseCommandFromTriggerAndMessage(msg, trigger)
    expect(actual).toStrictEqual(expected)
  })
})

describe('fn.doReplacements', () => {
  test.each([
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
        "room-id": "",
        "user-id": "",
        "display-name": "mondgesicht",
        username: "bla",
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
  ])('doReplacements $text', async ({ text, command, context, originalCmd, expected }) => {
    const actual = await doReplacements(text, command, context, originalCmd, null, null)
    expect(actual).toBe(expected)
  })
})

describe('fn.safeFileName', () => {
  test.each([
    {
      _name: 'is ok',
      string: 'heLLo0193',
      expected: 'heLLo0193',
    },
    {
      _name: 'empty',
      string: '',
      expected: '',
    },
    {
      _name: 'contains some bad chars',
      string: 'Some:%file_zname.p0000g.champ',
      expected: 'Some__file_zname.p0000g.champ',
    },
    {
      _name: 'contains only chars',
      string: '%@#$',
      expected: '____',
    },
    {
      _name: 'contains slashes and backslashes',
      string: 'file/Z0zo\\zozo.jpg',
      expected: 'file_Z0zo_zozo.jpg',
    },
  ])('$_name', ({ _name, string, expected }) => {
    const actual = safeFileName(string)
    expect(actual).toBe(expected)
  })
})
