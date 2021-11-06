import countdown from '../../commands/countdown'
import jishoOrgLookup from '../../commands/jishoOrgLookup'
import madochanCreateWord from '../../commands/madochanCreateWord'
import text from '../../commands/text'
import randomText from '../../commands/randomText'
import playMedia from '../../commands/playMedia'
import fn from '../../fn'
import chatters from '../../commands/chatters'
import Db from '../../Db'
import TwitchHelixClient from '../../services/TwitchHelixClient'
import WebServer from '../../WebServer'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Madochan from '../../services/Madochan'
import Variables from '../../services/Variables'
import { User } from '../../services/Users'
import { Command, FunctionCommand, GlobalVariable, TwitchChatClient, TwitchChatContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import Cache from '../../services/Cache'

const log = fn.logger('GeneralModule.ts')

export interface GeneralModuleSettings {
  volume: number
}

export interface GeneralModuleAdminSettings {
  showImages: boolean
}

interface GeneralModuleData {
  commands: Command[]
  settings: GeneralModuleSettings
  adminSettings: GeneralModuleAdminSettings
}

interface GeneralModuleTimer {
  lines: number
  minLines: number
  minInterval: number
  command: FunctionCommand
  next: number
}

interface GeneralModuleInitData {
  data: GeneralModuleData
  commands: Record<string, FunctionCommand[]>
  timers: GeneralModuleTimer[]
}

export interface GeneralModuleWsEventData {
  commands: Command[]
  settings: GeneralModuleSettings
  adminSettings: GeneralModuleAdminSettings
  globalVariables: GlobalVariable[]
}

interface WsData {
  event: string
  data: GeneralModuleWsEventData
}


export interface GeneralSaveEventData {
  event: "save";
  commands: Command[];
  settings: GeneralModuleSettings;
  adminSettings: GeneralModuleAdminSettings;
}

class GeneralModule {
  public name = 'general'
  public variables: Variables

  private db: Db
  private user: User
  private chatClient: TwitchChatClient | null
  private helixClient: TwitchHelixClient | null
  private storage: ModuleStorage
  private wss: WebSocketServer

  private data: GeneralModuleData
  private commands: Record<string, FunctionCommand[]>
  private timers: GeneralModuleTimer[]

  private interval: NodeJS.Timer | null = null

  constructor(
    db: Db,
    user: User,
    variables: Variables,
    chatClient: TwitchChatClient | null,
    helixClient: TwitchHelixClient | null,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer,
  ) {
    this.db = db
    this.user = user
    this.variables = variables
    this.chatClient = chatClient
    this.helixClient = helixClient
    this.storage = storage
    this.wss = wss
    const initData = this.reinit()
    this.data = initData.data
    this.commands = initData.commands
    this.timers = initData.timers
    this.inittimers()
  }

  inittimers() {
    this.interval = null
    if (this.interval) {
      clearInterval(this.interval)
    }

    this.interval = setInterval(() => {
      const now = new Date().getTime()
      this.timers.forEach(t => {
        if (t.lines >= t.minLines && now > t.next) {
          t.command.fn(null, this.chatClient, null, null, null)
          t.lines = 0
          t.next = now + t.minInterval
        }
      })
    }, 1 * fn.SECOND)
  }

  fix(commands: any[]): Command[] {
    return (commands || []).map((cmd: any) => {
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
      cmd.triggers = cmd.triggers.map((trigger: any) => {
        trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0
        return trigger
      })
      return cmd
    })
  }

  reinit(): GeneralModuleInitData {
    const data = this.storage.load(this.name, {
      commands: [],
      settings: {
        volume: 100,
      },
      adminSettings: {
        showImages: true,
      },
    })
    data.commands = this.fix(data.commands)
    if (!data.adminSettings) {
      data.adminSettings = {}
    }
    if (typeof data.adminSettings.showImages === 'undefined') {
      data.adminSettings.showImages = true
    }

    const commands: Record<string, FunctionCommand[]> = {}
    const timers: GeneralModuleTimer[] = []

    data.commands.forEach((cmd: any) => {
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
            commands[trigger.data.command] = commands[trigger.data.command] || []
            commands[trigger.data.command].push(cmdObj)
          }
        } else if (trigger.type === 'timer') {
          // fix for legacy data
          if (trigger.data.minSeconds) {
            trigger.data.minInterval = trigger.data.minSeconds * 1000
          }

          const interval = fn.parseHumanDuration(trigger.data.minInterval)
          if (trigger.data.minLines || interval) {
            timers.push({
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
    return { data, commands, timers } as GeneralModuleInitData
  }

  widgets() {
    return {
      'media': async (req: any, res: any, next: Function) => {
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

  wsdata(eventName: string): WsData {
    return {
      event: eventName,
      data: {
        commands: this.data.commands,
        settings: this.data.settings,
        adminSettings: this.data.adminSettings,
        globalVariables: this.variables.all(),
      },
    };
  }

  updateClient(eventName: string, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  saveCommands() {
    this.storage.save(this.name, this.data)
    const initData = this.reinit()
    this.data = initData.data
    this.commands = initData.commands
    this.timers = initData.timers
    this.updateClients('init')
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient('init', ws)
      },
      'save': (ws: Socket, data: GeneralSaveEventData) => {
        this.data.commands = this.fix(data.commands)
        this.data.settings = data.settings
        this.data.adminSettings = data.adminSettings
        this.storage.save(this.name, this.data)
        const initData = this.reinit()
        this.data = initData.data
        this.commands = initData.commands
        this.timers = initData.timers
        this.updateClients('init')
      },
    }
  }
  getCommands() {
    return {}
  }

  async onChatMsg(
    client: TwitchChatClient,
    target: string,
    context: TwitchChatContext,
    msg: string,
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
