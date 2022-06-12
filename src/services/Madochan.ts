import { asJson, request } from '../net/xhr'

interface MadochanCreateWordRequestData {
  model: string
  weirdness: number
  definition: string
}

interface MadochanCreateWordResponseData {
  word: string
}

const createWord = async (
  createWordRequestData: MadochanCreateWordRequestData
): Promise<MadochanCreateWordResponseData> => {
  const url = 'https://madochan.hyottoko.club/api/v1/_create_word'
  const resp = await request('post', url, asJson(createWordRequestData))
  const json = (await resp.json()) as MadochanCreateWordResponseData
  return json
}

export default {
  createWord,
  defaultModel: '100epochs800lenhashingbidirectional.h5',
  defaultWeirdness: 1,
}
