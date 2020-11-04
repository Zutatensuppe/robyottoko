const cmds = require('../../commands.js')
const config = require('../../config.js')
const fn = require('../../fn.js')

class GeneralModule {
  constructor(user, client, storage, cache, ws, wss) {
    this.user = user
    this.client = client
    this.storage = storage
    this.cache = cache
    this.ws = ws
    this.wss = wss
    this.name = 'general'
    this.reinit()
  }

  fix (commands) {
    return (commands || []).map(cmd => {
      if (cmd.command) {
        cmd.triggers = [{type: 'command', data: {command: cmd.command}}]
        delete cmd.command
      }
      if (cmd.action === 'media') {
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0
      }
      cmd.triggers = cmd.triggers.map(trigger => {
        trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0
        trigger.data.minSeconds = parseInt(trigger.data.minSeconds, 10) || 0
        return trigger
      })
      return cmd
    })
  }

  reinit () {
    this.data = this.storage.load(this.name, {
      commands: [],
    })
    this.data.commands = this.fix(this.data.commands)

    this.commands = {}
    this.timers = []
    this.interval = null

    this.data.commands.forEach((cmd) => {
      if (cmd.triggers.length === 0) {
        return
      }
      let cmdObj = null
      switch (cmd.action) {
        case 'jisho_org_lookup':
          cmdObj = Object.assign({}, cmd, {fn: cmds.jishoOrgLookup()})
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, {fn: Array.isArray(cmd.data.text)
              ? cmds.randomText(cmd.data.text)
              : cmds.text(cmd.data.text)})
          break;
        case 'media':
          cmdObj = Object.assign({}, cmd, {fn: (command, client, target, context, msg) => {
              this.wss.notifyAll([this.user.id], {
                event: 'playmedia',
                data: cmd.data,
              })
            }})
          break;
        case 'countdown':
          cmdObj = Object.assign({}, cmd, {fn: cmds.countdown(cmd.data)})
          break;
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === 'command') {
          if (trigger.data.command) {
            this.commands[trigger.data.command] = this.commands[trigger.data.command] || []
            this.commands[trigger.data.command].push(cmdObj)
          }
        } else if (trigger.type === 'timer') {
          if (trigger.data.minLines || trigger.data.minSeconds) {
            this.timers.push({
              lines: 0,
              minLines: trigger.data.minLines,
              minSeconds: trigger.data.minSeconds,
              command: cmdObj,
              next: new Date().getTime() + (trigger.data.minSeconds * 1000)
            })
          }
        }
      }
    })

    if (this.interval) {
      clearInterval(this.interval)
    }

    this.interval = setInterval(() => {
      const now = new Date().getTime()
      this.timers.forEach(t => {
        if (t.lines >= t.minLines && now > t.next) {
          t.command.fn(t.command, this.client, null, null, null)
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
            widget_token: req.params.widget_token,
            user: req.user,
            token: req.cookies['x-token'],
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
            token: req.cookies['x-token'],
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
    this.wss.notifyOne([this.user.id], this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    this.wss.notifyAll([this.user.id], this.wsdata(eventName))
  }

  getWsEvents () {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'save': (ws, {commands}) => {
        this.data.commands = this.fix(commands)
        this.storage.save(this.name, this.data)
        this.reinit()
        this.updateClients('init')
      },
    }
  }
  getCommands () {
    return this.commands
  }

  onChatMsg (client, target, context, msg) {
    this.timers.forEach(t => {
      t.lines++
    })
  }
}

module.exports = GeneralModule
