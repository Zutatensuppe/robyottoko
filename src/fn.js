const fetch = require('node-fetch')
const fs = require('fs')

const load = (m, def) => {
  try {
    let raw = fs.readFileSync(__dirname + '/data/' + m + '.data.json')
    let data = JSON.parse(raw)
    return data ? Object.assign({}, def, data) : def
  } catch (e) {
    console.log(e)
    return def
  }
}
const save = (m, data) => {
  fs.writeFileSync(__dirname + '/data/' + m + '.data.json', JSON.stringify(data))
}

const shuffle = (array) => {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
      // Pick a random index
      let index = Math.floor(Math.random() * counter);

      // Decrease counter by 1
      counter--;

      // And swap the last element with it
      let temp = array[counter];
      array[counter] = array[index];
      array[index] = temp;
  }

  return array;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandom(array) {
  return array[getRandomInt(0, array.length - 1)]
}

const render = async (template, data) => {
  const {TwingEnvironment, TwingLoaderFilesystem} = require('twing');
  const loader = new TwingLoaderFilesystem(__dirname + '/templates')
  const twing = new TwingEnvironment(loader)
  return twing.render(template, data)
}

const fnRandom = (values) => () => getRandom(values)

const sleep = (t) => {
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
const isMod = (ctx) => !!ctx.mod || isBroadcaster(ctx)
const isSubscriber = (ctx) => !!ctx.subscriber || isBroadcaster(ctx)

const sayFn = (client, target) => (msg) => {
  const targets = target ? [target] : client.channels
  targets.forEach(t => {
    console.log(`saying in ${t}: ${msg}`)
    client.say(t, msg).catch(_ => {})
  })
}

const mayExecute = (context, cmd) => {
  if (!cmd.restrict_to) {
    return true
  }
  if (cmd.restrict_to.includes('mod') && !isMod(context)) {
    return false
  }
  if (cmd.restrict_to.includes('sub') && !isSubscriber(context)) {
    return false
  }
  if (cmd.restrict_to.includes('broadcaster') && !isBroadcaster(context)) {
    return false
  }
  return true
}

const parseCommand = (msg) => {
  const command = msg.trim().split(' ')
  return {name: command[0], args: command.slice(1)}
}

module.exports = {
  sayFn,
  mayExecute,
  parseCommand,
  render,
  load,
  save,
  getRandomInt,
  getRandom,
  shuffle,
  sleep,
  fnRandom,
  lookupWord,
  isBroadcaster,
  isMod,
  isSubscriber,
}
