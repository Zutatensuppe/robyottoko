const cmds = require('./../commands.js')
const fn = require('./../fn.js')

class GeneralModule {
  constructor(client, storage) {
    this.data = storage.load({
      timers: [],
      commands: [],
    })
    this.commands = {}
    this.timers = []

    this.data.commands.forEach((cmd) => {
      switch (cmd.action) {
        case 'jisho_org_lookup':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: cmds.jishoOrgLookup()})
          break;
        case 'text':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: Array.isArray(cmd.data.text)
              ? cmds.randomText(cmd.data.text)
              : cmds.text(cmd.data.text)})
          break;
        case 'countdown':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: cmds.countdown(cmd.data)})
          break;
      }
    })
    this.timers = this.data.timers.map(c => Object.assign({}, c, {
      lines: 0,
      say: null,
      next: new Date().getTime() + (c.minSeconds * 1000)
    }))

    const say = fn.sayFn(client)
    setInterval(() => {
      const now = new Date().getTime()
      this.timers.forEach(t => {
        if (t.lines >= t.minLines && now > t.next) {
          say(t.message)
          t.lines = 0
          t.next = now + (t.minSeconds * 1000)
        }
      })
    }, 1000)
  }

  getCommands () {
    return commands
  }

  onMsg (client, target, context, msg) {
    this.timers.forEach(t => {
      t.lines++
    })
  }
}

let instance
module.exports = {
  name: 'general',
  init: (client, storage) => {
    instance = new GeneralModule(client, storage)
  },
  getRoutes: () => false,
  getWsEvents: () => false,
  getCommands: () => instance.getCommands(),
  onMsg: (client, target, context, msg) => {
    instance.onMsg(client, target, context, msg)
  }
}
