const path = require('path')
const { getText } = require('./net/xhr')

const logger = (filename, ...pre) => {
  const b = path.basename(filename)
  return (...args) => console.log(`[${b}]`, ...pre, ...args)
}

const log = logger(__filename)

const MS = 1
const SECOND = 1000 * MS
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const YEAR = 356 * DAY

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

function nonce(length) {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
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
    setTimeout(resolve, t * SECOND)
  })
}

const isBroadcaster = (ctx) => ctx['room-id'] === ctx['user-id']
const isMod = (ctx) => !!ctx.mod || isBroadcaster(ctx)
const isSubscriber = (ctx) => !!ctx.subscriber || isBroadcaster(ctx)

const sayFn = (client, target) => (msg) => {
  const targets = target ? [target] : client.channels
  targets.forEach(t => {
    log(`saying in ${t}: ${msg}`)
    client.say(t, msg).catch(_ => {})
  })
}

const mayExecute = (context, cmd) => {
  if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
    return true
  }
  if (cmd.restrict_to.includes('mod') && isMod(context)) {
    return true
  }
  if (cmd.restrict_to.includes('sub') && isSubscriber(context)) {
    return true
  }
  if (cmd.restrict_to.includes('broadcaster') && isBroadcaster(context)) {
    return true
  }
  return false
}

const parseCommandFromMessage = (msg) => {
  const command = msg.trim().split(' ')
  return {name: command[0], args: command.slice(1)}
}

async function replaceAsync(str, regex, asyncFn) {
  const promises = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);
  });
  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift());
}

const parseResponseText = async (text, command) => {
  const replaces = [
    {
      regex: /\$([a-z][a-z0-9]*)(?!\()/g,
      replacer: (m0, m1) => {
        switch (m1) {
          case 'args': return command.args.join(' ')
        }
        return m0
      }
    },
    {
      regex: /\$customapi\(([^$\)]*)\)\[\'([A-Za-z0-9_ -]+)\'\]/g,
      replacer: async (m0, m1, m2) => {
        const txt = await getText(await parseResponseText(m1, command))
        return JSON.parse(txt)[m2]
      },
    },
    {
      regex: /\$customapi\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return await getText(await parseResponseText(m1, command))
      },
    },
    {
      regex: /\$urlencode\(([^$\)]*)\)/g,
      replacer: async (m0, m1) => {
        return encodeURIComponent(await parseResponseText(m1, command))
      },
    },
  ]
  let replaced = text
  let orig
  do {
    orig = replaced
    for (let replace of replaces) {
      replaced = await replaceAsync(replaced, replace.regex, replace.replacer)
    }
  } while (orig !== replaced)
  return replaced
}

const split = (str, delimiter = ',', maxparts = -1) => {
  const split = str.split(delimiter)
  if (maxparts === -1) {
    return split
  }

  if (split.length <= maxparts) {
    return split
  }

  return [
    ...split.slice(0, maxparts - 1),
    split.slice(maxparts - 1).join(delimiter),
  ]
}

module.exports = {
  logger,
  sayFn,
  mayExecute,
  parseCommandFromMessage,
  render,
  getRandomInt,
  getRandom,
  shuffle,
  sleep,
  fnRandom,
  isBroadcaster,
  isMod,
  isSubscriber,
  parseResponseText,
  nonce,
  split,
  MS,
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  YEAR,
}
