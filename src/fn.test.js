const { joinIntoChunks, humanDuration, parseISO8601Duration, DAY } = require('./fn.js')

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

test('humanDuration', () => {
  let d, actual, expected

  d = 1000
  actual = humanDuration(d)
  expected = '1s'
  expect(actual).toStrictEqual(expected)

  d = 1000 * 60
  actual = humanDuration(d)
  expected = '1m 0s'
  expect(actual).toStrictEqual(expected)

  d = 1000 * 60 * 60
  actual = humanDuration(d)
  expected = '1h 0m 0s'
  expect(actual).toStrictEqual(expected)

  d = 1000 * 60 * 60 * 24
  actual = humanDuration(d)
  expected = '1d 0h 0m 0s'
  expect(actual).toStrictEqual(expected)

  d = 1000 * 60 * 60 * 24
    + 1000 * 60 * 60 * 5
    + 1000 * 60 * 40
    + 1000 * 34
  actual = humanDuration(d)
  expected = '1d 5h 40m 34s'
  expect(actual).toStrictEqual(expected)
})
