const { joinIntoChunks } = require('./fn.js')

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
