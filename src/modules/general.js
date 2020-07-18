const cmds = require('./../commands.js')
const fn = require('./../fn.js')

const commands = {}

const _data = fn.load('general', {
  timers: [],
  commands: []
})
_data.commands.forEach((cmd) => {
  switch (cmd.action) {
    case 'jisho_org_lookup':
      commands[cmd.command] = Object.assign({}, cmd, {fn: cmds.jishoOrgLookup()})
      break;
    case 'text':
      commands[cmd.command] = Object.assign({}, cmd, {fn: Array.isArray(cmd.data.text)
        ? cmds.randomText(cmd.data.text)
        : cmds.text(cmd.data.text)})
      break;
    case 'countdown':
      commands[cmd.command] = Object.assign({}, cmd, {fn: cmds.countdown(cmd.data)})
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
