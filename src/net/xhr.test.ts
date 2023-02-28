import { asQueryArgs, QueryArgsData } from './xhr'

test.each([
  {
    data: {} as QueryArgsData,
    expected: '',
  },
  {
    data: { hello: '^^%&&+ 10~~', world: 1123 } as QueryArgsData,
    expected: '?hello=%5E%5E%25%26%26%2B%2010~~&world=1123',
  },
])('asQueryArgs', ({ data, expected }) => {
  const actual = asQueryArgs(data)
  expect(actual).toBe(expected)
})
