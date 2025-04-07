import { describe, expect, it } from 'vitest'
import { asQueryArgs, QueryArgsData } from './xhr'

describe('src/net/xhr.ts', () => {
  describe('asQueryArgs', () => {
    const testCases = [
      {
        data: {} as QueryArgsData,
        expected: '',
      },
      {
        data: { hello: '^^%&&+ 10~~', world: 1123 } as QueryArgsData,
        expected: '?hello=%5E%5E%25%26%26%2B%2010~~&world=1123',
      },
    ]

    testCases.forEach(({ data, expected }) => it('asQueryArgs', () => {
      const actual = asQueryArgs(data)
      expect(actual).toBe(expected)
    }))
  })
})
