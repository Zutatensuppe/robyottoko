const cmds = require('./../commands.js')
const config = require('./../config.js')
const fn = require('./../fn.js')
const fs = require('fs')

class GeneralModule {
  constructor(client, storage, websocket) {
    this.client = client
    this.websocket = websocket
    this.storage = storage
    this.reinit()
  }

  reinit () {
    this.data = this.storage.load({
      timers: [],
      commands: [],
      availableSounds: [],
    })
    this.data.availableSounds = fs.readdirSync('./data/uploads/').filter(f => f.match(/\.(mp3|mp4)$/))
    this.commands = {}
    this.timers = []
    this.interval = null

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
        case 'sound':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: (command, client, target, context, msg) => {
              this.websocket.notifyAll({
                event: 'playsound',
                data: cmd.data,
              })
            }})
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

    const say = fn.sayFn(this.client)
    if (this.interval) {
      clearInterval(this.interval)
    }
    this.interval = setInterval(() => {
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

  getRoutes () {
    return {
      '/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('general.twig', {
            ws: config.ws,
          }),
        }
      },
      '/commands/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('commands.twig', {
            ws: config.ws,
          }),
        }
      },
    }
  }

  wsdata (eventName) {
    return {
      event: eventName,
      data: this.data
    };
  }

  updateClient (eventName, ws) {
    this.websocket.notifyOne(this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    this.websocket.notifyAll(this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('general/init', ws)
      },
      'uploaded': () => {
        this.reinit()
        this.updateClients('general/init')
      },
      'save': ({commands}) => {
        this.data.commands = commands
        this.storage.save(this.data)
        this.reinit()
        this.updateClients('general/init')
      },
    }
  }

  getCommands () {
    return this.commands
  }

  onMsg (client, target, context, msg) {
    this.timers.forEach(t => {
      t.lines++
    })
  }
}

module.exports = {
  name: 'general',
  create: (client, storage, websocket, modules) => {
    return new GeneralModule(client, storage, websocket)
  },
}
