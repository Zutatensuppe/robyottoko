const { joinIntoChunks, humanDuration } = require('./fn.js')

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
