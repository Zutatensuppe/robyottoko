import { getText, asQueryArgs } from '../net/xhr'
import { DictSearchResponseDataEntry } from '../types'

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
): any[] => {
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

  let searchWords: string[] = []
  let fromArrSearch: string[] = []
  let fromArr: string[] = []
  let toArr: string[] = []
  const matchedSentence = normalize(matchedWords.join(' '))
  if (arr1NoPunct.includes(matchedSentence)) {
    fromArrSearch = arr1NoPunct
    fromArr = arr1
    toArr = arr2
    searchWords = [matchedSentence]
  } else if (arr2NoPunct.includes(matchedSentence)) {
    fromArrSearch = arr2NoPunct
    fromArr = arr2
    toArr = arr1
    searchWords = [matchedSentence]
  } else {
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
  }

  const results = []
  for (const i in fromArr) {
    if (!fromArrSearch[i]) {
      continue
    }
    if (!searchWords.includes(fromArrSearch[i])) {
      continue
    }
    const idx = results.findIndex(item => item.from === fromArr[i])
    if (idx < 0) {
      results.push({ from: fromArr[i], to: [toArr[i]] })
    } else {
      results[idx].to.push(toArr[i])
    }
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
