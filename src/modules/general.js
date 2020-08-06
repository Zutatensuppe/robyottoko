const cmds = require('./../commands.js')
const config = require('./../config.js')
const fn = require('./../fn.js')
const web = require('./../web.js')

class GeneralModule {
  constructor(user, client, storage) {
    this.user = user
    this.client = client
    this.storage = storage
    this.reinit()
  }

  reinit () {
    this.data = this.storage.load({
      timers: [],
      commands: [],
    })
    this.commands = {}
    this.timers = []
    this.interval = null

    this.data.commands.forEach((cmd) => {
      if (!cmd.command) {
        return
      }
      switch (cmd.action) {
        case 'jisho_org_lookup':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: cmds.jishoOrgLookup()})
          break;
        case 'text':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: Array.isArray(cmd.data.text)
              ? cmds.randomText(cmd.data.text)
              : cmds.text(cmd.data.text)})
          break;
        case 'media':
          this.commands[cmd.command] = Object.assign({}, cmd, {fn: (command, client, target, context, msg) => {
              web.notifyAll([this.user], {
                event: 'playmedia',
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

  widgets () {
    return {
      'media': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('widget.twig', {
            page: 'media',
            token: req.params.widget_token,
            user: req.user,
            ws: config.ws,
          }),
        }
      }
    }
  }

  getRoutes () {
    return {
      '/commands/': async (req, res) => {
        return {
          code: 200,
          type: 'text/html',
          body: await fn.render('base.twig', {
            title: 'Commands',
            page: 'commands',
            user: req.user,
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
    web.notifyOne([this.user], this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    web.notifyAll([this.user], this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('general/init', ws)
      },
      'uploaded': (ws) => {
        this.reinit()
        this.updateClients('general/init')
      },
      'save': (ws, {commands}) => {
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
  create: (user, client, storage) => {
    return new GeneralModule(user, client, storage)
  },
}
