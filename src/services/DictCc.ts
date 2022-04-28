import { getText, asQueryArgs } from '../net/xhr'
import { DictSearchResponseDataEntry } from '../types'

interface DictCCParseResultEntry {
  from: string
  to: string[]
}

export const LANG_TO_URL_MAP: Record<string, string> = {
  de: 'https://www.dict.cc/',
  ru: 'https://enru.dict.cc/',
  es: 'https://enes.dict.cc/',
  it: 'https://enit.dict.cc/',
  fr: 'https://enfr.dict.cc/',
  pt: 'https://enpt.dict.cc/',
}

/**
 * Exctract searched words and word lists for both languages
 * from a dict.cc result html
 * TODO: change from regex to parsing the html ^^
 */
const extractInfo = (
  text: string
): { words: string[], arr1: string[], arr2: string[] } => {
  const stringToArray = (str: string): string[] => {
    const arr: string[] = []
    str.replace(/"([^"]*)"/g, (m: string, m1: string): string => {
      arr.push(m1)
      return m
    })
    return arr
  }
  const arrayByRegex = (regex: RegExp): string[] => {
    const m = text.match(regex)
    return m ? stringToArray(m[1]) : []
  }

  const m = text.match(/<link rel="canonical" href="https:\/\/[^.]+\.dict\.cc\/\?s=([^"]+)">/)
  const words = m ? decodeURIComponent(m[1]).split('+') : []
  if (!words.length) {
    return { words, arr1: [], arr2: [] }
  }

  return {
    words,
    arr1: arrayByRegex(/var c1Arr = new Array\((.*)\);/),
    arr2: arrayByRegex(/var c2Arr = new Array\((.*)\);/),
  }
}

const parseResult = (
  text: string
): DictCCParseResultEntry[] => {
  const normalize = (str: string): string => {
    return str.toLowerCase().replace(/[.!?]/, '')
  }
  const info = extractInfo(text)
  const matchedWords = info.words
  if (!matchedWords) {
    return []
  }

  const arr1 = info.arr1
  const arr2 = info.arr2

  const arr1NoPunct = arr1.map(item => normalize(item))
  const arr2NoPunct = arr2.map(item => normalize(item))

  const results: DictCCParseResultEntry[] = []
  const collectResults = (
    searchWords: string[],
    fromArrSearch: string[],
    fromArr: string[],
    toArr: string[],
  ) => {
    const _results: DictCCParseResultEntry[] = []
    for (const i in fromArr) {
      if (!fromArrSearch[i]) {
        continue
      }
      if (!searchWords.includes(fromArrSearch[i])) {
        continue
      }
      if (fromArr[i] === toArr[i]) {
        // from and to is exactly the same, so skip it
        continue;
      }
      const idx = _results.findIndex(item => item.from === fromArr[i])
      if (idx < 0) {
        _results.push({ from: fromArr[i], to: [toArr[i]] })
      } else {
        _results[idx].to.push(toArr[i])
      }
    }

    results.push(..._results)
  }

  const matchedSentence = normalize(matchedWords.join(' '))
  if (arr1NoPunct.includes(matchedSentence)) {
    const fromArrSearch = arr1NoPunct
    const fromArr = arr1
    const toArr = arr2
    const searchWords = [matchedSentence]
    collectResults(searchWords, fromArrSearch, fromArr, toArr)
  }
  if (arr2NoPunct.includes(matchedSentence)) {
    const fromArrSearch = arr2NoPunct
    const fromArr = arr2
    const toArr = arr1
    const searchWords = [matchedSentence]
    collectResults(searchWords, fromArrSearch, fromArr, toArr)
  }
  if (results.length === 0) {
    let fromArrSearch: string[] = []
    let fromArr: string[] = []
    let toArr: string[] = []
    let searchWords: string[] = []
    for (const matchedWord of matchedWords) {
      if (arr1.includes(matchedWord)) {
        fromArr = fromArrSearch = arr1
        toArr = arr2
      } else {
        fromArr = fromArrSearch = arr2
        toArr = arr1
      }
    }
    searchWords = matchedWords
    collectResults(searchWords, fromArrSearch, fromArr, toArr)
  }

  return results
}

const searchWord = async (
  keyword: string,
  lang: string,
): Promise<DictSearchResponseDataEntry[]> => {
  const baseUrl = LANG_TO_URL_MAP[lang]
  if (!baseUrl) {
    return []
  }

  const url = baseUrl + asQueryArgs({ s: keyword })
  const text = await getText(url)
  return parseResult(text)
}

export default {
  searchWord,
  parseResult,
  LANG_TO_URL_MAP,
}
