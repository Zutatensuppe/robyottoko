const countdown = require('../../commands/countdown.js')
const jishoOrgLookup = require('../../commands/jishoOrgLookup.js')
const text = require('../../commands/text.js')
const randomText = require('../../commands/randomText.js')
const playMedia = require('../../commands/playMedia.js')
const fn = require('../../fn.js')
const chatters = require('../../commands/chatters.js')
const Db = require('../../Db.js')
const TwitchHelixClient = require('../../services/TwitchHelixClient.js')
const WebServer = require('../../net/WebServer.js')
const WebSocketServer = require('../../net/WebSocketServer.js')

const log = fn.logger('GeneralModule.js')

class GeneralModule {
  constructor(
    /** @type Db */ db,
    user,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db
    this.user = user
    this.chatClient = chatClient
    this.helixClient = helixClient
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
        cmd.data.sound.volume = cmd.data.sound.volume || 100
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
          cmdObj = Object.assign({}, cmd, {fn: jishoOrgLookup()})
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, {fn: Array.isArray(cmd.data.text)
              ? randomText(cmd.data.text)
              : text(cmd.data.text)})
          break;
        case 'media':
          cmdObj = Object.assign({}, cmd, {fn: playMedia(this.wss, this.user.id, cmd.data)})
          break;
        case 'countdown':
          cmdObj = Object.assign({}, cmd, {fn: countdown(cmd.data)})
          break;
        case 'chatters':
          cmdObj = Object.assign({}, cmd, {fn: chatters(this.db, this.helixClient)})
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
              next: new Date().getTime() + (trigger.data.minSeconds * fn.SECOND)
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
          t.command.fn(t.command, this.chatClient, null, null, null)
          t.lines = 0
          t.next = now + (t.minSeconds * fn.SECOND)
        }
      })
    }, 1 * fn.SECOND)
  }

  widgets () {
    return {
      'media': async (req, res, next) => {
        res.send(await fn.render('widget.twig', {
          title: 'Media Widget',
          page: 'media',
          page_data: {
            wsBase: this.wss.connectstring(),
            widgetToken: req.params.widget_token,
          },
        }))
      },
    }
  }

  getRoutes () {
    return {
      get: {
        '/commands/': async (req, res, next) => {
          res.send(await fn.render('base.twig', {
            title: 'Commands',
            page: 'commands',
            page_data: {
              wsBase: this.wss.connectstring(),
              widgetToken: req.userWidgetToken,
              user: req.user,
              token: req.cookies['x-token'],
            },
          }))
        },
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
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients (eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
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
    return {}
  }

  async onChatMsg (
    client,
    /** @type string */ target,
    context,
    /** @type string */ msg
  ) {
    let keys = Object.keys(this.commands)
    // make sure longest commands are found first
    // so that in case commands `!draw` and `!draw bad` are set up
    // and `!draw bad` is written in chat, that command only will be
    // executed and not also `!draw`
    keys = keys.sort((a, b) => b.length - a.length)
    for (const key of keys) {
      const rawCmd = fn.parseKnownCommandFromMessage(msg, key)
      if (!rawCmd) {
        continue
      }
      const cmdDefs = this.commands[key] || []
      await fn.tryExecuteCommand(rawCmd, cmdDefs, client, target, context, msg)
      break
    }
    this.timers.forEach(t => {
      t.lines++
    })
  }
}

module.exports = GeneralModule
