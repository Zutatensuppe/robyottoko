import countdown from '../../commands/countdown'
import madochanCreateWord from '../../commands/madochanCreateWord'
import randomText from '../../commands/randomText'
import playMedia from '../../commands/playMedia'
import fn from '../../fn'
import { logger } from '../../common/fn'
import chatters from '../../commands/chatters'
import setChannelTitle from '../../commands/setChannelTitle'
import setChannelGameId from '../../commands/setChannelGameId'
import { Socket } from '../../net/WebSocketServer'
import { User } from '../../services/Users'
import {
  ChatMessageContext, Command, FunctionCommand,
  TwitchChatClient, TwitchChatContext, RawCommand,
  RewardRedemptionContext, Bot, Module,
  MediaCommand, DictLookupCommand, CountdownCommand,
  MadochanCommand, MediaVolumeCommand, ChattersCommand,
  RandomTextCommand, SetChannelGameIdCommand, SetChannelTitleCommand, CountdownAction, AddStreamTagCommand, RemoveStreamTagCommand
} from '../../types'
import dictLookup from '../../commands/dictLookup'
import { newCommandTrigger } from '../../common/commands'
import { GeneralModuleAdminSettings, GeneralModuleSettings, GeneralModuleWsEventData, GeneralSaveEventData } from './GeneralModuleCommon'
import addStreamTags from '../../commands/addStreamTags'
import removeStreamTags from '../../commands/removeStreamTags'

const log = logger('GeneralModule.ts')

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

interface WsData {
  event: string
  data: GeneralModuleWsEventData
}

class GeneralModule implements Module {
  public name = 'general'

  public bot: Bot
  public user: User

  private data: GeneralModuleData
  private commands: FunctionCommand[]
  private timers: GeneralModuleTimer[]

  private interval: NodeJS.Timer | null = null

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user
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
          const client = this.bot.getUserTwitchClientManager(this.user).getChatClient()
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
      if (cmd.action === 'text') {
        if (!Array.isArray(cmd.data.text)) {
          cmd.data.text = [cmd.data.text]
        }
      }
      if (cmd.action === 'media') {
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0
        cmd.data.sound.volume = cmd.data.sound.volume || 100

        if (!cmd.data.sound.urlpath && cmd.data.sound.file) {
          cmd.data.sound.urlpath = `/uploads/${encodeURIComponent(cmd.data.sound.file)}`
        }

        if (!cmd.data.image.urlpath && cmd.data.image.file) {
          cmd.data.image.urlpath = `/uploads/${encodeURIComponent(cmd.data.image.file)}`
        }
      }
      if (cmd.action === 'countdown') {
        cmd.data.actions = cmd.data.actions.map((action: CountdownAction) => {
          if (typeof action.value === 'string') {
            return action
          }
          if (action.value.sound && !action.value.sound.urlpath && action.value.sound.file) {
            action.value.sound.urlpath = `/uploads/${encodeURIComponent(action.value.sound.file)}`
          }

          if (action.value.image && !action.value.image.urlpath && action.value.image.file) {
            action.value.image.urlpath = `/uploads/${encodeURIComponent(action.value.image.file)}`
          }
          return action
        })
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
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {
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

    data.commands.forEach((cmd: MediaCommand | MediaVolumeCommand | MadochanCommand
      | DictLookupCommand | RandomTextCommand | CountdownCommand | ChattersCommand
      | SetChannelTitleCommand | SetChannelGameIdCommand
      | AddStreamTagCommand | RemoveStreamTagCommand) => {
      if (cmd.triggers.length === 0) {
        return
      }
      let cmdObj = null
      switch (cmd.action) {
        case 'media_volume':
          cmdObj = Object.assign({}, cmd, { fn: this.mediaVolumeCmd.bind(this) })
          break;
        case 'madochan_createword':
          cmdObj = Object.assign({}, cmd, { fn: madochanCreateWord(cmd) })
          break;
        case 'dict_lookup':
          cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd, this.bot, this.user) })
          break;
        case 'text':
          cmdObj = Object.assign({}, cmd, { fn: randomText(cmd, this.bot, this.user) })
          break;
        case 'media':
          cmdObj = Object.assign({}, cmd, { fn: playMedia(cmd, this.bot, this.user) })
          break;
        case 'countdown':
          cmdObj = Object.assign({}, cmd, { fn: countdown(cmd, this.bot, this.user) })
          break;
        case 'chatters':
          cmdObj = Object.assign({}, cmd, { fn: chatters(this.bot, this.user) })
          break;
        case 'set_channel_title':
          cmdObj = Object.assign({}, cmd, { fn: setChannelTitle(cmd, this.bot, this.user) })
          break;
        case 'set_channel_game_id':
          cmdObj = Object.assign({}, cmd, { fn: setChannelGameId(cmd, this.bot, this.user) })
          break;
        case 'add_stream_tags':
          cmdObj = Object.assign({}, cmd, { fn: addStreamTags(cmd, this.bot, this.user) })
          break;
        case 'remove_stream_tags':
          cmdObj = Object.assign({}, cmd, { fn: removeStreamTags(cmd, this.bot, this.user) })
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

  getRoutes() {
    return {}
  }

  wsdata(eventName: string): WsData {
    return {
      event: eventName,
      data: {
        commands: this.data.commands,
        settings: this.data.settings,
        adminSettings: this.data.adminSettings,
        globalVariables: this.bot.getUserVariables(this.user).all(),
      },
    }
  }

  updateClient(eventName: string, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName: string) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  saveSettings() {
    this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
    // no need for calling reinit, that would also recreate timers and stuff
    // but updating settings shouldnt mess with those
    this.updateClients('init')
  }

  saveCommands() {
    this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
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
