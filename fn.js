
const fetch = require('node-fetch')

const fs = require('fs')

const load = (m, def) => {
  try {
    let raw = fs.readFileSync(m + '.data.json')
    let data = JSON.parse(raw)
    return data || def
  } catch {
    return def
  }
}
const save = (m, data) => {
  fs.writeFileSync(m + '.data.json', JSON.stringify(data))
}

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

const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id']
const isMod = (ctx) => !!ctx.mod
const isSubscriber = (ctx) => !!ctx.subscriber

module.exports = {
  load,
  save,
  getRandomInt,
  getRandom,
  timer,
  fnRandom,
  lookupWord,
  isBroadcaster,
  isMod,
  isSubscriber,
}
