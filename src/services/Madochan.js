const { postJson, asJson } = require('../net/xhr')

/*
interface createWordRequestData {
  model string,
  weirdness number,
  definition string,
}
*/
const createWord = async (createWordRequestData) => {
  const url = 'https://madochan.hyottoko.club/api/v1/_create_word'
  const json = await postJson(url, asJson(createWordRequestData))
  return json
}

module.exports = {
  createWord,
  defaultModel: '100epochs800lenhashingbidirectional.h5',
  defaultWeirdness: 1,
}
