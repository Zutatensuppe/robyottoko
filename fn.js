
const fetch = require('node-fetch')


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom(array) {
  return array[getRandomInt(0, array.length - 1)]
}

const fnRandom = (values) => () => getRandom(values)

const timer = (t) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, t * 1000)
  })
}

const lookupWord = async (w, p = 1) => {
  return fetch('https://jisho.org/api/v1/search/words?keyword=' + encodeURIComponent(w) + '&page=' + p)
    .then(r => r.json())
    .then(j => j.data)
}

module.exports = {
  getRandomInt,
  getRandom,
  timer,
  fnRandom,
  lookupWord,
}
