const cmds = require('./../commands.js')
const fn = require('./../fn.js')

const commands = {}

const _data = fn.load('general', {
  timers: [],
  commands: []
})
_data.commands.forEach(({action, command, data}) => {
  switch (action) {
    case 'jisho_org_lookup':
      commands[command] = cmds.jishoOrgLookup();
      break;
    case 'text':
      commands[command] = Array.isArray(data.text)
        ? cmds.randomText(data.text)
        : cmds.text(data.text)
      break;
    case 'countdown':
      commands[command] = cmds.countdown(data)
      break;
  }
})

const timers = _data.timers.map(c => Object.assign({}, c, {
  lines: 0,
  say: null,
  next: new Date().getTime() + (c.minSeconds * 1000)
}))

module.exports = {
  init: (client) => {
    const say = fn.sayFn(client)
    setInterval(() => {
      const now = new Date().getTime()
      timers.forEach(t => {
        if (t.lines >= t.minLines && now > t.next) {
          say(t.message)
          t.lines = 0
          t.next = now + (t.minSeconds * 1000)
        }
      })
    }, 1000)
  },
  cmds: commands,
  onMsg: (client, target, context, msg) => {
    timers.forEach(t => {
      t.lines++
    })
  }
}
