import countdown from '../../commands/countdown.js'
import jishoOrgLookup from '../../commands/jishoOrgLookup.ts'
import madochanCreateWord from '../../commands/madochanCreateWord.ts'
import text from '../../commands/text.ts'
import randomText from '../../commands/randomText.ts'
import playMedia from '../../commands/playMedia.ts'
import fn from '../../fn.ts'
import chatters from '../../commands/chatters.ts'
import Db from '../../Db.ts'
import TwitchHelixClient from '../../services/TwitchHelixClient.ts'
import WebServer from '../../WebServer.js'
import WebSocketServer from '../../net/WebSocketServer.ts'
import Madochan from '../../services/Madochan.ts'
import Variables from '../../services/Variables.ts'

const log = fn.logger('GeneralModule.js')

class GeneralModule {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss
  ) {
    this.db = db
    this.user = user
    this.variables = variables
    this.chatClient = chatClient
    this.helixClient = helixClient
    this.storage = storage
    this.cache = cache
    this.ws = ws
    this.wss = wss
    this.name = 'general'
    this.reinit()
  }

  fix(commands) {
    return (commands || []).map(cmd => {
      if (cmd.command) {
        cmd.triggers = [{ type: 'command', data: { command: cmd.command } }]
        delete cmd.command
      }
      cmd.variables = cmd.variables || []
      cmd.variableChanges = cmd.variableChanges || []
      if (cmd.action === 'media') {
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0
        cmd.data.sound.volume = cmd.data.sound.volume || 100
      }
      cmd.triggers = cmd.triggers.map(trigger => {
        trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0
        return trigger
      })
      return cmd
    })
  }

  reinit() {
    this.data = this.storage.load(this.name, {
      commands: [],
      settings: {
        volume: 100,
      },
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
        case 'madochan_createword':
          cmdObj = Object.assign({}, cmd, {
            fn: madochanCreateWord(
              `${cmd.data.model}` || Madochan.defaultModel,
              parseInt(cmd.data.weirdness, 10) || Madochan.defaultWeirdness,
            )
          })
          break;
        case 'jisho_org_lookup':
          cmdObj = Object.assign({}, cmd, { fn: jishoOrgLookup() })
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, {
            fn: Array.isArray(cmd.data.text)
              ? randomText(this.variables, cmd)
              : text(this.variables, cmd)
          })
          break;
        case 'media':
          cmdObj = Object.assign({}, cmd, { fn: playMedia(this.wss, this.user.id, cmd) })
          break;
        case 'countdown':
          cmdObj = Object.assign({}, cmd, { fn: countdown(this.variables, this.wss, this.user.id, cmd) })
          break;
        case 'chatters':
          cmdObj = Object.assign({}, cmd, { fn: chatters(this.db, this.helixClient) })
          break;
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === 'command') {
          if (trigger.data.command) {
            this.commands[trigger.data.command] = this.commands[trigger.data.command] || []
            this.commands[trigger.data.command].push(cmdObj)
          }
        } else if (trigger.type === 'timer') {
          // fix for legacy data
          if (trigger.data.minSeconds) {
            trigger.data.minInterval = trigger.data.minSeconds * 1000
          }

          const interval = fn.parseHumanDuration(trigger.data.minInterval)
          if (trigger.data.minLines || interval) {
            this.timers.push({
              lines: 0,
              minLines: trigger.data.minLines,
              minInterval: interval,
              command: cmdObj,
              next: new Date().getTime() + interval,
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
          t.next = now + t.minInterval
        }
      })
    }, 1 * fn.SECOND)
  }

  widgets() {
    return {
      'media': async (req, res, next) => {
        res.render('widget.spy', {
          title: 'Media Widget',
          page: 'media',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        })
      },
    }
  }

  getRoutes() {
    return {
    }
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: {
        commands: this.data.commands,
        settings: this.data.settings,
        globalVariables: this.variables.all(),
      },
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  saveCommands() {
    this.storage.save(this.name, this.data)
    this.reinit()
    this.updateClients('init')
  }

  getWsEvents() {
    return {
      'conn': (ws) => {
        this.updateClient('init', ws)
      },
      'save': (ws, { commands, settings }) => {
        this.data.commands = this.fix(commands)
        this.data.settings = settings
        this.storage.save(this.name, this.data)
        this.reinit()
        this.updateClients('init')
      },
    }
  }
  getCommands() {
    return {}
  }

  async onChatMsg(
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
      await fn.tryExecuteCommand(this, rawCmd, cmdDefs, client, target, context, msg, this.variables)
      break
    }
    this.timers.forEach(t => {
      t.lines++
    })
  }
}

export default GeneralModule
