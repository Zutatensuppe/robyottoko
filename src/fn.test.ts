import {
  arrayMove,
  joinIntoChunks,
  humanDuration,
  parseISO8601Duration,
  DAY,
  HOUR,
  MINUTE,
  SECOND,
  MS,
  doReplacements,
  parseHumanDuration,
  findIdxBySearchInOrder,
  findIdxBySearch,
  findIdxBySearchExactPart,
  parseCommandFromTriggerAndMessage,
} from './fn'
import Variables from './services/Variables'
import { Command, CommandTrigger } from './types'

test('joinIntoChunks', () => {
  let actual = joinIntoChunks(['hyottoko', 'van', 'megaport'], ', ', 12)
  let expected = ['hyottoko', 'van', 'megaport']
  expect(actual).toStrictEqual(expected)

  actual = joinIntoChunks(['hyottoko', 'van', 'port'], ', ', 12)
  expected = ['hyottoko', 'van, port']
  expect(actual).toStrictEqual(expected)

  actual = joinIntoChunks(['hyottoko', 'van', 'megaport'], ', ', 13)
  expected = ['hyottoko, van', 'megaport']
  expect(actual).toStrictEqual(expected)
})

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


test.each`
arr                     | from | to   | expected
${['a', 'b', 'c', 'd']} | ${2} | ${0} | ${['c', 'a', 'b', 'd']}
${['a', 'b', 'c', 'd']} | ${0} | ${2} | ${['b', 'c', 'a', 'd']}
`('arrayMove', ({ arr, from, to, expected }) => {
  const actual = arrayMove(arr, from, to)
  expect(actual).toStrictEqual(expected)
})

test.each`
array             | search   | expected
${['abc', 'lel']} | ${'lel'} | ${1}
${['Trio Da Da Da Official Video', 'Panda! Go Panda! (Panda Kopanda) intro theme']} | ${'da da da'} | ${0}
${['Panda! Go Panda! (Panda Kopanda) intro theme', 'Trio Da Da Da Official Video']} | ${'da da da'} | ${1}
`('findIdxBySearchExactPart', ({ array, search, expected }) => {
  const actual = findIdxBySearchExactPart(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each`
array             | search   | expected
${['abc', 'lel']} | ${'lel'} | ${1}
${['Trio Da Da Da Official Video', 'Panda! Go Panda! (Panda Kopanda) intro theme']} | ${'da da da'} | ${0}
${['Panda! Go Panda! (Panda Kopanda) intro theme', 'Trio Da Da Da Official Video']} | ${'da da da'} | ${0}
`('findIdxBySearchInOrder', ({ array, search, expected }) => {
  const actual = findIdxBySearchInOrder(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each`
array             | search   | expected
${['abc', 'lel']} | ${'lel'} | ${1}
`('findIdxBySearch', ({ array, search, expected }) => {
  const actual = findIdxBySearch(array, search)
  expect(actual).toStrictEqual(expected)
})

test.each`
msg                | command       | commandExact | expected
${'!sr good good'} | ${'!sr good'} | ${false}     | ${{ name: '!sr good', args: ['good'] }}
${'!sr good'}      | ${'!sr good'} | ${false}     | ${{ name: '!sr good', args: [] }}
${'!sr hello'}     | ${'!sr'}      | ${false}     | ${{ name: '!sr', args: ['hello'] }}
${'!sr'}           | ${'!sr'}      | ${false}     | ${{ name: '!sr', args: [] }}
${'!sr good good'} | ${'!sr good'} | ${true}      | ${null}
${'!sr good'}      | ${'!sr good'} | ${true}      | ${{ name: '!sr good', args: [] }}
${'!sr hello'}     | ${'!sr'}      | ${true}      | ${null}
${'!sr'}           | ${'!sr'}      | ${true}      | ${{ name: '!sr', args: [] }}
`('parseKnownCommandFromTriggerAndMessage $msg', ({ msg, command, commandExact, expected }) => {
  const trigger = { type: 'command', data: { command, commandExact } } as CommandTrigger
  const actual = parseCommandFromTriggerAndMessage(msg, trigger)
  expect(actual).toStrictEqual(expected)
})



describe('fn.doReplacements', () => {
  test.each([
    {
      text: 'lalala',
      command: null,
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'lalala',
    },
    {
      text: 'bla $user.name',
      command: null,
      context: null,
      variables: {} as Variables,
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
      },
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'mondgesicht',
    },
    {
      text: '$args',
      command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'arg1 arg2 arg3 arg4 arg5',
    },
    {
      text: '$args()',
      command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'arg1 arg2 arg3 arg4 arg5',
    },
    {
      text: '$args(1:)',
      command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'arg2 arg3 arg4 arg5',
    },
    {
      text: '$args(2:3)',
      command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'arg3 arg4',
    },
    {
      text: '$args(:2)',
      command: { name: 'cmd', args: ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'] },
      context: null,
      variables: {} as Variables,
      originalCmd: {} as Command,
      expected: 'arg1 arg2 arg3',
    },
  ])('doReplacements $text', async ({ text, command, context, variables, originalCmd, expected }) => {
    const actual = await doReplacements(text, command, context, variables, originalCmd)
    expect(actual).toBe(expected)
  })
})
