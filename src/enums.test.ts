import { describe, expect, it } from 'vitest'
import { MODULE_NAME, tryParseModuleName } from './enums'

describe('tryParseModuleName', () => {
  const cases: [string, MODULE_NAME | null][] = [
    ['sr', MODULE_NAME.SR],
    ['general', MODULE_NAME.GENERAL],
    ['pomo', MODULE_NAME.POMO],
    ['avatar', MODULE_NAME.AVATAR],
    ['drawcast', MODULE_NAME.DRAWCAST],
    ['speech-to-text', MODULE_NAME.SPEECH_TO_TEXT],
    ['vote', MODULE_NAME.VOTE],
    ['unknown', null],
    ['', null],
    ['GENERAL', null],
    ['Sr', null],
  ]

  it.each(cases)('tryParseModuleName(%j) => %j', (input, expected) => {
    expect(tryParseModuleName(input)).toBe(expected)
  })
})
