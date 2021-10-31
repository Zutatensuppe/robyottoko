import { arrayMove, joinIntoChunks, humanDuration, parseISO8601Duration, DAY, HOUR, MINUTE, SECOND, MS, parseHumanDuration } from './fn'

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
