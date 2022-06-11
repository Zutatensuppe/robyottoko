import countdown from '../../commands/countdown'
import madochanCreateWord from '../../commands/madochanCreateWord'
import randomText from '../../commands/randomText'
import playMedia from '../../commands/playMedia'
import fn from '../../fn'
import { logger, nonce, parseHumanDuration, SECOND } from '../../common/fn'
import chatters from '../../commands/chatters'
import { commands as commonCommands, newCommandTrigger } from '../../common/commands'
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
  RandomTextCommand, SetChannelGameIdCommand, SetChannelTitleCommand,
  CountdownAction, AddStreamTagCommand, RemoveStreamTagCommand,
  CommandTriggerType, CommandAction,
} from '../../types'
import dictLookup from '../../commands/dictLookup'
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
  shouldSave: boolean
}

interface WsData {
  event: string
  data: GeneralModuleWsEventData
}

class GeneralModule implements Module {
  public name = 'general'

  // @ts-ignore
  public bot: Bot
  // @ts-ignore
  public user: User
  // @ts-ignore
  private data: GeneralModuleData
  // @ts-ignore
  private commands: FunctionCommand[]
  // @ts-ignore
  private timers: GeneralModuleTimer[]

  private interval: NodeJS.Timer | null = null

  private channelPointsCustomRewards: Record<string, string[]> = {}

  constructor(
    bot: Bot,
    user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.bot = bot
      this.user = user
      const initData = await this.reinit()
      this.data = initData.data
      this.commands = initData.commands
      this.timers = initData.timers
      if (initData.shouldSave) {
        await this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
      }
      this.inittimers()
      return this;
    })();
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
          await fn.applyVariableChanges(cmdDef, this, rawCmd, context)
          await cmdDef.fn(rawCmd, client, target, context)
          t.lines = 0
          t.next = now + t.minInterval
        }
      })
    }, 1 * SECOND)
  }

  fix(commands: any[]): Command[] {
    return (commands || []).map((cmd: any) => {
      if (cmd.command) {
        cmd.triggers = [newCommandTrigger(cmd.command, cmd.commandExact || false)]
        delete cmd.command
      }
      cmd.variables = cmd.variables || []
      cmd.variableChanges = cmd.variableChanges || []
      if (cmd.action === CommandAction.TEXT) {
        if (!Array.isArray(cmd.data.text)) {
          cmd.data.text = [cmd.data.text]
        }
      }
      if (cmd.action === CommandAction.MEDIA) {
        if (cmd.data.excludeFromGlobalWidget) {
          cmd.data.widgetIds = [cmd.id]
        } else if (typeof cmd.data.widgetIds === 'undefined') {
          cmd.data.widgetIds = []
        }
        if (typeof cmd.data.excludeFromGlobalWidget !== 'undefined') {
          delete cmd.data.excludeFromGlobalWidget
        }
        cmd.data.minDurationMs = cmd.data.minDurationMs || 0
        cmd.data.sound.volume = cmd.data.sound.volume || 100

        if (!cmd.data.sound.urlpath && cmd.data.sound.file) {
          cmd.data.sound.urlpath = `/uploads/${encodeURIComponent(cmd.data.sound.file)}`
        }

        if (!cmd.data.image.urlpath && cmd.data.image.file) {
          cmd.data.image.urlpath = `/uploads/${encodeURIComponent(cmd.data.image.file)}`
        }

        if (!cmd.data.image_url || cmd.data.image_url === 'undefined') {
          cmd.data.image_url = ''
        }
        if (!cmd.data.video) {
          cmd.data.video = {
            url: cmd.data.video || cmd.data.twitch_clip?.url || '',
            volume: cmd.data.twitch_clip?.volume || 100,
          }
        }
        if (typeof cmd.data.twitch_clip !== 'undefined') {
          delete cmd.data.twitch_clip
        }
      }
      if (cmd.action === CommandAction.COUNTDOWN) {
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
        cmd.action = CommandAction.DICT_LOOKUP
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

  async reinit(): Promise<GeneralModuleInitData> {
    let shouldSave = false
    const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {
      commands: [],
      settings: {
        volume: 100,
      },
      adminSettings: {
        showImages: true,
        autocommands: []
      },
    })
    data.commands = this.fix(data.commands)
    // add ids to commands that dont have one yet
    for (const command of data.commands) {
      if (!command.id) {
        command.id = nonce(10)
        shouldSave = true
      }
    }

    if (!data.adminSettings) {
      data.adminSettings = {}
    }
    if (typeof data.adminSettings.showImages === 'undefined') {
      data.adminSettings.showImages = true
    }
    if (typeof data.adminSettings.autocommands === 'undefined') {
      data.adminSettings.autocommands = []
    }
    if (!data.adminSettings.autocommands.includes('!bot')) {
      const txtCommand = commonCommands.text.NewCommand() as RandomTextCommand
      txtCommand.triggers = [newCommandTrigger('!bot')]
      txtCommand.data.text = ['Version $bot.version $bot.website < - $bot.features - Source code at $bot.github']
      data.commands.push(txtCommand)
      data.adminSettings.autocommands.push('!bot')
      shouldSave = true
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
        case CommandAction.MEDIA_VOLUME:
          cmdObj = Object.assign({}, cmd, { fn: this.mediaVolumeCmd.bind(this) })
          break;
        case CommandAction.MADOCHAN_CREATEWORD:
          cmdObj = Object.assign({}, cmd, { fn: madochanCreateWord(cmd) })
          break;
        case CommandAction.DICT_LOOKUP:
          cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd, this.bot, this.user) })
          break;
        case CommandAction.TEXT:
          cmdObj = Object.assign({}, cmd, { fn: randomText(cmd, this.bot, this.user) })
          break;
        case CommandAction.MEDIA:
          cmdObj = Object.assign({}, cmd, { fn: playMedia(cmd, this.bot, this.user) })
          break;
        case CommandAction.COUNTDOWN:
          cmdObj = Object.assign({}, cmd, { fn: countdown(cmd, this.bot, this.user) })
          break;
        case CommandAction.CHATTERS:
          cmdObj = Object.assign({}, cmd, { fn: chatters(this.bot, this.user) })
          break;
        case CommandAction.SET_CHANNEL_TITLE:
          cmdObj = Object.assign({}, cmd, { fn: setChannelTitle(cmd, this.bot, this.user) })
          break;
        case CommandAction.SET_CHANNEL_GAME_ID:
          cmdObj = Object.assign({}, cmd, { fn: setChannelGameId(cmd, this.bot, this.user) })
          break;
        case CommandAction.ADD_STREAM_TAGS:
          cmdObj = Object.assign({}, cmd, { fn: addStreamTags(cmd, this.bot, this.user) })
          break;
        case CommandAction.REMOVE_STREAM_TAGS:
          cmdObj = Object.assign({}, cmd, { fn: removeStreamTags(cmd, this.bot, this.user) })
          break;
      }
      if (!cmdObj) {
        return
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === CommandTriggerType.FIRST_CHAT) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.COMMAND) {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === CommandTriggerType.TIMER) {
          const interval = parseHumanDuration(trigger.data.minInterval)
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
    return { data, commands, timers, shouldSave } as GeneralModuleInitData
  }

  getRoutes() {
    return {}
  }

  async _channelPointsCustomRewards(): Promise<Record<string, string[]>> {
    const helixClient = this.bot.getUserTwitchClientManager(this.user).getHelixClient()
    if (helixClient) {
      return await helixClient.getAllChannelPointsCustomRewards(this.bot, this.user)
    }
    return {}
  }

  async wsdata(eventName: string): Promise<WsData> {
    return {
      event: eventName,
      data: {
        commands: this.data.commands,
        settings: this.data.settings,
        adminSettings: this.data.adminSettings,
        globalVariables: await this.bot.getUserVariables(this.user).all(),
        channelPointsCustomRewards: this.channelPointsCustomRewards,
        mediaWidgetUrl: await this.bot.getWidgets().getWidgetUrl('media', this.user.id),
      },
    }
  }

  async updateClient(eventName: string, ws: Socket): Promise<void> {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws)
  }

  async updateClients(eventName: string): Promise<void> {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName))
  }

  async saveSettings(): Promise<void> {
    await this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
    // no need for calling reinit, that would also recreate timers and stuff
    // but updating settings shouldnt mess with those
    await this.updateClients('init')
  }

  async saveCommands(): Promise<void> {
    await this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
    const initData = await this.reinit()
    this.data = initData.data
    this.commands = initData.commands
    this.timers = initData.timers
    await this.updateClients('init')
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.channelPointsCustomRewards = await this._channelPointsCustomRewards()
        await this.updateClient('init', ws)
      },
      'save': async (ws: Socket, data: GeneralSaveEventData) => {
        this.data.commands = this.fix(data.commands)
        this.data.settings = data.settings
        this.data.adminSettings = data.adminSettings
        await this.saveCommands()
      },
    }
  }

  async volume(vol: number) {
    if (vol < 0) {
      vol = 0
    }
    if (vol > 100) {
      vol = 100
    }
    this.data.settings.volume = parseInt(`${vol}`, 10)
    await this.saveSettings()
  }

  async mediaVolumeCmd(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    _context: TwitchChatContext | null,
  ) {
    if (!client || !command) {
      return
    }

    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Current volume: ${this.data.settings.volume}`)
    } else {
      await this.volume(parseInt(command.args[0], 10))
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
