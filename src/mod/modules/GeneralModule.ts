import countdown from '../../commands/countdown'
import madochanCreateWord from '../../commands/madochanCreateWord'
import text from '../../commands/text'
import randomText from '../../commands/randomText'
import playMedia from '../../commands/playMedia'
import fn from '../../fn'
import { logger } from '../../common/fn'
import chatters from '../../commands/chatters'
import Db from '../../Db'
import WebSocketServer, { Socket } from '../../net/WebSocketServer'
import Madochan from '../../services/Madochan'
import Variables from '../../services/Variables'
import { User } from '../../services/Users'
import {
  ChatMessageContext, Command, FunctionCommand,
  GlobalVariable, TwitchChatClient, TwitchChatContext, RawCommand,
  RewardRedemptionContext, Bot, Module,
  MediaCommand, DictLookupCommand, CountdownCommand,
  MadochanCommand, MediaVolumeCommand, ChattersCommand, RandomTextCommand
} from '../../types'
import ModuleStorage from '../ModuleStorage'
import TwitchClientManager from '../../net/TwitchClientManager'
import dictLookup from '../../commands/dictLookup'
import { newCommandTrigger } from '../../util'

const log = logger('GeneralModule.ts')

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
  commands: FunctionCommand[]
  redemptions: FunctionCommand[]
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

class GeneralModule implements Module {
  public name = 'general'
  public variables: Variables

  private db: Db
  private user: User
  private clientManager: TwitchClientManager
  private storage: ModuleStorage
  private wss: WebSocketServer

  private data: GeneralModuleData
  private commands: FunctionCommand[]
  private timers: GeneralModuleTimer[]

  private interval: NodeJS.Timer | null = null

  constructor(
    bot: Bot,
    user: User,
    variables: Variables,
    clientManager: TwitchClientManager,
    storage: ModuleStorage,
  ) {
    this.db = bot.getDb()
    this.user = user
    this.variables = variables
    this.clientManager = clientManager
    this.storage = storage
    this.wss = bot.getWebSocketServer()
    const initData = this.reinit()
    this.data = initData.data
    this.commands = initData.commands
    this.timers = initData.timers
    this.inittimers()
  }

  async userChanged(user: User) {
    this.user = user
  }

  inittimers() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    this.interval = setInterval(() => {
      const now = new Date().getTime()
      this.timers.forEach(async (t) => {
        if (t.lines >= t.minLines && now > t.next) {
          const cmdDef = t.command
          const rawCmd = null
          const client = this.clientManager.getChatClient()
          const target = null
          const context = null
          const msg = null
          await fn.applyVariableChanges(cmdDef, this, rawCmd, context)
          await cmdDef.fn(rawCmd, client, target, context, msg)
          t.lines = 0
          t.next = now + t.minInterval
        }
      })
    }, 1 * fn.SECOND)
  }

  fix(commands: any[]): Command[] {
    return (commands || []).map((cmd: any) => {
      if (cmd.command) {
        cmd.triggers = [newCommandTrigger(cmd.command, cmd.commandExact || false)]
        delete cmd.command
      }
      cmd.variables = cmd.variables || []
      cmd.variableChanges = cmd.variableChanges || []
      if (cmd.action === 'media') {
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0
        cmd.data.sound.volume = cmd.data.sound.volume || 100
      }
      if (cmd.action === 'jisho_org_lookup') {
        cmd.action = 'dict_lookup'
        cmd.data = { lang: 'ja', phrase: '' }
      }
      cmd.triggers = cmd.triggers.map((trigger: any) => {
        trigger.data.minLines = parseInt(trigger.data.minLines, 10) || 0
        if (trigger.data.minSeconds) {
          trigger.data.minInterval = trigger.data.minSeconds * 1000
        }
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

    const commands: FunctionCommand[] = []
    const timers: GeneralModuleTimer[] = []

    data.commands.forEach((cmd: MediaCommand | MediaVolumeCommand | MadochanCommand | DictLookupCommand | RandomTextCommand | CountdownCommand | ChattersCommand) => {
      if (cmd.triggers.length === 0) {
        return
      }
      let cmdObj = null
      switch (cmd.action) {
        case 'media_volume':
          cmdObj = Object.assign({}, cmd, {
            fn: this.mediaVolumeCmd.bind(this),
          })
          break;
        case 'madochan_createword':
          cmdObj = Object.assign({}, cmd, {
            fn: madochanCreateWord(
              `${cmd.data.model}` || Madochan.defaultModel,
              parseInt(cmd.data.weirdness, 10) || Madochan.defaultWeirdness,
            )
          })
          break;
        case 'dict_lookup':
          cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd.data.lang, cmd.data.phrase, this.variables, cmd) })
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, {
            fn: Array.isArray(cmd.data.text)
              ? randomText(this.variables, cmd)
              // @ts-ignore
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
          cmdObj = Object.assign({}, cmd, { fn: chatters(this.db, this.clientManager.getHelixClient()) })
          break;
      }
      if (!cmdObj) {
        return
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === 'command') {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === 'reward_redemption') {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === 'timer') {
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
    }
  }

  updateClient(eventName: string, ws: Socket) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  saveSettings() {
    this.storage.save(this.name, this.data)
    // no need for calling reinit, that would also recreate timers and stuff
    // but updating settings shouldnt mess with those
    this.updateClients('init')
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
        this.saveCommands()
      },
    }
  }

  volume(vol: number) {
    if (vol < 0) {
      vol = 0
    }
    if (vol > 100) {
      vol = 100
    }
    this.data.settings.volume = parseInt(`${vol}`, 10)
    this.saveSettings()
  }

  async mediaVolumeCmd(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    _context: TwitchChatContext | null,
    _msg: string | null,
  ) {
    if (!client || !command) {
      return
    }

    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Current volume: ${this.data.settings.volume}`)
    } else {
      this.volume(parseInt(command.args[0], 10))
      say(`New volume: ${this.data.settings.volume}`)
    }
  }

  getCommands() {
    return this.commands
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    this.timers.forEach(t => {
      t.lines++
    })
  }

  async onRewardRedemption(_RewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default GeneralModule
