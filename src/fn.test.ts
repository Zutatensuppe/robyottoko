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
  extractEmotes,
  normalizeChatMessage,
} from './fn'
import { ChatMessageContext, Command, CommandTrigger } from './types'

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
  ])('parseKnownCommandFromTriggerAndMessage $msg', ({ msg, command, expected }) => {
    const trigger = { type: 'command', data: { command } } as CommandTrigger
    const actual = parseCommandFromTriggerAndMessage(msg, trigger)
    expect(actual).toStrictEqual(expected)
  })
})

describe('fn', () => {
  test.each([
    {
      text: '!sr next 󠀀',
      expected: '!sr next',
    },
  ])('normalizeChatMessage $text', ({ text, expected }) => {
    const actual = normalizeChatMessage(text)
    expect(actual).toBe(expected)
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

describe('fn.extractEmotes', () => {
  test.each([
    {
      _name: 'no emotes',
      ctx: {
        msgOriginal: 'lalahdlfadofho  sadf ',
        msgNormalized: 'lalahdlfadofho  sadf ',
        context: {},
      },
      expected: []
    },
    {
      _name: 'unicode emotes 1',
      ctx: {
        msgOriginal: '👩‍⚕️',
        msgNormalized: '👩‍⚕️',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f469-200d-2695-fe0f.svg' },
      ],
    },
    {
      _name: 'unicode emotes 2',
      ctx: {
        msgOriginal: ' 👨‍👩‍👧‍👦 ',
        msgNormalized: ' 👨👩👧👦 ',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f469-200d-1f467-200d-1f466.svg' },
      ],
    },
    {
      _name: 'unicode emotes 2 alternative',
      ctx: {
        msgOriginal: ' 👨👩👧👦 ',
        msgNormalized: ' 👨👩👧👦 ',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f469.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f467.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f466.svg' },
      ],
    },
    {
      _name: 'unicode emotes 3',
      ctx: {
        msgOriginal: '👨‍🦲',
        msgNormalized: '👨🦲',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468-200d-1f9b2.svg' },
      ],
    },
    {
      _name: 'unicode emotes 3 alternative',
      ctx: {
        msgOriginal: '👨🦲',
        msgNormalized: '👨🦲',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f468.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f9b2.svg' },
      ],
    },
    {
      _name: 'unicode emotes 4',
      ctx: {
        msgOriginal: ' 🙇‍♀️ ',
        msgNormalized: ' 🙇♀️ ',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f647-200d-2640-fe0f.svg' },
      ],
    },
    {
      _name: 'unicode emotes 4 alternative',
      ctx: {
        msgOriginal: ' 🙇♀️ ',
        msgNormalized: ' 🙇♀️ ',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f647.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/2640.svg' },
      ],
    },
    {
      _name: 'unicode emotes 5',
      ctx: {
        msgOriginal: '🍀🍀🐸',
        msgNormalized: '🍀🍀🐸',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f340.svg' },
        { url: 'https://cdn.betterttv.net/assets/emoji/1f438.svg' },
      ],
    },
    {
      _name: 'pride flag',
      ctx: {
        msgOriginal: '🏳️‍🌈',
        msgNormalized: '🏳️‍🌈',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-1f308.svg' },
      ],
    },
    {
      _name: 'trans flag',
      ctx: {
        msgOriginal: '🏳️‍⚧️',
        msgNormalized: '🏳️‍⚧️',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f3f3-fe0f-200d-26a7-fe0f.svg' },
      ],
    },
    {
      _name: 'ukraine flag',
      ctx: {
        msgOriginal: '🇺🇦',
        msgNormalized: '🇺🇦',
        context: {},
      },
      expected: [
        { url: 'https://cdn.betterttv.net/assets/emoji/1f1fa-1f1e6.svg' },
      ],
    },
    {
      _name: 'twitch emotes',
      ctx: {
        msgOriginal: 'blub bla bla',
        msgNormalized: 'blub bla bla',
        context: {
          emotes: {
            emotesv2_6087b156a30f4741a1d96acdc39e1905: [ '0-9', '10-19' ],
          },
        },
      },
      expected: [
        { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/2.0' },
        { url: 'https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_6087b156a30f4741a1d96acdc39e1905/default/dark/2.0' },
      ],
    },
  ])('$_name', ({ _name, ctx, expected }) => {
    const actual = extractEmotes(ctx as ChatMessageContext)
    expect(actual).toStrictEqual(expected)
  })
})
