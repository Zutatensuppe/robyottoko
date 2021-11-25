import { getText, asQueryArgs } from '../net/xhr'
import { DictSearchResponseDataEntry } from '../types'

export const LANG_TO_URL_MAP: Record<string, string> = {
  de: 'https://www.dict.cc/',
  ru: 'https://enru.dict.cc/',
  es: 'https://enes.dict.cc/',
  it: 'https://enit.dict.cc/',
  fr: 'https://enfr.dict.cc/',
}

// TODO: change from regex to parsing the html ^^
const parseResult = (
  text: string
): any[] => {
  const normalize = (str: string): string => {
    return str.toLowerCase().replace(/[\.\!\?]/, '')
  }
  const stringToArray = (str: string): string[] => {
    const arr: string[] = []
    str.replace(/"([^"]*)"/g, (m: string, m1: string): string => {
      arr.push(m1)
      return m
    })
    return arr
  }

  let m: RegExpMatchArray | null = null

  m = text.match(/<link rel="canonical" href="https:\/\/[^\.]+\.dict\.cc\/\?s=([^"]+)">/)
  const matchedWords = m ? decodeURIComponent(m[1]).split('+') : []
  if (matchedWords.length === 0) {
    return []
  }

  m = text.match(/var c1Arr = new Array\(([^)]*)\)/)
  const arr1 = m ? stringToArray(m[1]) : []
  const arr1NoPunct = arr1.map(item => normalize(item))
  m = text.match(/var c2Arr = new Array\(([^)]*)\)/)
  const arr2 = m ? stringToArray(m[1]) : []
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
    for (let matchedWord of matchedWords) {
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
  for (let i in fromArr) {
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
