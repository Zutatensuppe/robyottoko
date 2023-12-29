import { getChannelPointsCustomRewards } from '../../fn'
import { logger, clamp, parseHumanDuration, SECOND } from '../../common/fn'
import { commands as commonCommands, newCommandTrigger } from '../../common/commands'
import { Socket } from '../../net/WebSocketServer'
import { User } from '../../repo/Users'
import {
  ChatMessageContext,
  Command,
  FunctionCommand,
  Bot,
  Module,
  GeneralCommand,
  CommandTriggerType,
  MODULE_NAME,
  WIDGET_TYPE,
  CommandEffectType,
  CommandAction,
} from '../../types'
import {
  default_admin_settings,
  default_settings,
  GeneralModuleAdminSettings,
  GeneralModuleEmotesEventData,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
  GeneralSaveEventData,
} from './GeneralModuleCommon'
import { NextFunction, Response } from 'express'

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
  executing: boolean
}

interface GeneralModuleInitData {
  data: GeneralModuleData
  commands: FunctionCommand[]
  redemptions: FunctionCommand[]
  timers: GeneralModuleTimer[]
  shouldSave: boolean
  enabled: boolean
}

interface WsData {
  event: string
  data: GeneralModuleWsEventData
}

const noop = () => { return }

class GeneralModule implements Module {
  public name = MODULE_NAME.GENERAL

  // @ts-ignore
  private enabled: boolean
  // @ts-ignore
  private data: GeneralModuleData
  // @ts-ignore
  private commands: FunctionCommand[]
  // @ts-ignore
  private timers: GeneralModuleTimer[]

  private newMessages = 0

  private interval: ReturnType<typeof setTimeout> | null = null

  private channelPointsCustomRewards: Record<string, string[]> = {}

  constructor(
    public readonly bot: Bot,
    public user: User,
  ) {
    // @ts-ignore
    return (async () => {
      const initData = await this.reinit()
      this.enabled = initData.enabled
      this.data = initData.data
      this.commands = initData.commands
      this.timers = initData.timers
      if (initData.shouldSave) {
        await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
      }
      this.inittimers()
      return this
    })()
  }

  getCurrentMediaVolume() {
    return this.data.settings.volume
  }

  async userChanged(user: User) {
    this.user = user
  }

  inittimers() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    // TODO: handle timeouts. commands executed via timer
    // are not added to command_execution database and also the
    // timeouts are not checked
    this.interval = setInterval(() => {
      const newMessages = this.newMessages
      this.newMessages = 0

      const date = new Date()
      const now = date.getTime()
      this.timers.forEach(async (t) => {
        if (t.executing) {
          return
        }
        t.lines += newMessages
        if (t.lines >= t.minLines && now > t.next) {
          t.executing = true
          const cmdDef = t.command
          const rawCmd = null
          const context = null
          await this.bot.getEffectsApplier().applyEffects(cmdDef, this, rawCmd, context)
          await cmdDef.fn({ rawCmd, context, date })
          t.lines = 0
          t.next = now + t.minInterval
          t.executing = false
        }
      })
    }, 1 * SECOND)
  }

  async reinit(): Promise<GeneralModuleInitData> {
    const { data, enabled } = await this.bot.getRepos().module.load(this.user.id, this.name, {
      commands: [],
      settings: default_settings(),
      adminSettings: default_admin_settings(),
    })
    data.settings = default_settings(data.settings)

    let shouldSave = false
    for (const command of data.commands) {
      if (command.action === 'text') {
        command.action = CommandAction.GENERAL
        command.data = {}
        shouldSave = true
      }
    }

    // do not remove for now, new users gain the !bot command by this
    if (!data.adminSettings.autocommands.includes('!bot')) {
      const command = commonCommands.general.NewCommand() as GeneralCommand
      command.triggers = [newCommandTrigger('!bot')]
      command.effects.push({
        type: CommandEffectType.CHAT,
        data: {
          text: ['$bot.message'],
        },
      })
      data.commands.push(command)
      data.adminSettings.autocommands.push('!bot')
      shouldSave = true
    }

    const commands: FunctionCommand[] = []
    const timers: GeneralModuleTimer[] = []

    data.commands.forEach((cmd: GeneralCommand) => {
      if (cmd.triggers.length === 0) {
        return
      }
      let cmdObj = null
      switch (cmd.action) {
        case CommandAction.GENERAL:
          cmdObj = Object.assign({}, cmd, { fn: noop })
          break
      }
      if (!cmdObj) {
        return
      }
      for (const trigger of cmd.triggers) {
        if (trigger.type === CommandTriggerType.FIRST_CHAT) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.COMMAND) {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command.value) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === CommandTriggerType.REWARD_REDEMPTION) {
          // TODO: check why this if is required, maybe for protection against '' command?
          if (trigger.data.command.value) {
            commands.push(cmdObj)
          }
        } else if (trigger.type === CommandTriggerType.FOLLOW) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.SUB) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.RAID) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.BITS) {
          commands.push(cmdObj)
        } else if (trigger.type === CommandTriggerType.TIMER) {
          const interval = parseHumanDuration(trigger.data.minInterval)
          if (trigger.data.minLines || interval) {
            timers.push({
              lines: 0,
              minLines: trigger.data.minLines,
              minInterval: interval,
              command: cmdObj,
              next: new Date().getTime() + interval,
              executing: false,
            })
          }
        }
      }
    })
    return { data, commands, timers, shouldSave, enabled } as GeneralModuleInitData
  }

  getRoutes() {
    return {
      get: {
        '/api/general/channel-emotes': async (req: any, res: Response, _next: NextFunction) => {
          const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient()
          const channelId = await client?.getUserIdByNameCached(req.query.channel_name, this.bot.getCache())
          const emotes = channelId ? await client?.getChannelEmotes(channelId) : null
          res.send(emotes)
        },
        '/api/general/global-emotes': async (_req: any, res: Response, _next: NextFunction) => {
          const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient()
          const emotes = await client?.getGlobalEmotes()
          res.send(emotes)
        },
        '/api/general/extract-emotes': async (req: any, res: Response, _next: NextFunction) => {
          let userId: string = ''
          const client = this.bot.getUserTwitchClientManager(this.user).getHelixClient()
          if (req.query.channel && req.query.channel !== this.user.twitch_login) {
            userId = await client?.getUserIdByNameCached(
              req.query.channel || this.user.twitch_login,
              this.bot.getCache(),
            ) || ''
          } else {
            userId = this.user.twitch_id
          }

          if (userId && client) {
            await this.bot.getEmoteParser().loadAssetsForChannel(
              req.query.channel || this.user.twitch_login,
              userId,
              client,
            )
          }

          const emotes = this.bot.getEmoteParser().extractEmotes(
            req.query.emotesInput,
            null,
            req.query.channel || this.user.twitch_login,
          )
          res.send(emotes)
        },
      },
    }
  }

  async wsdata(eventName: string): Promise<WsData> {
    return {
      event: eventName,
      data: {
        enabled: this.enabled,
        commands: this.data.commands,
        settings: this.data.settings,
        adminSettings: this.data.adminSettings,
        globalVariables: await this.bot.getRepos().variables.all(this.user.id),
        channelPointsCustomRewards: this.channelPointsCustomRewards,
        mediaWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.MEDIA, this.user.id),
        emoteWallWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.EMOTE_WALL, this.user.id),
        rouletteWidgetUrl: await this.bot.getWidgets().getWidgetUrl(WIDGET_TYPE.ROULETTE, this.user.id),
      },
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  async setEnabled(enabled: boolean): Promise<void> {
    this.enabled = enabled
    if (!this.enabled) {
      if (this.interval) {
        clearInterval(this.interval)
        this.interval = null
      }
    }
  }

  async updateClient(eventName: string, ws: Socket): Promise<void> {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, await this.wsdata(eventName), ws)
  }

  async updateClients(eventName: string): Promise<void> {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, await this.wsdata(eventName))
  }

  async save(): Promise<void> {
    await this.bot.getRepos().module.save(this.user.id, this.name, this.data)
    const initData = await this.reinit()
    this.enabled = initData.enabled
    this.data = initData.data
    this.commands = initData.commands
    this.timers = initData.timers
  }

  async saveCommands(): Promise<void> {
    await this.save()
  }

  getWsEvents() {
    return {
      conn: async (ws: Socket) => {
        this.channelPointsCustomRewards = await getChannelPointsCustomRewards(this.bot, this.user)
        await this.updateClient('init', ws)
      },
      save: async (_ws: Socket, data: GeneralSaveEventData) => {
        this.data.commands = data.commands
        this.data.settings = data.settings
        this.data.adminSettings = data.adminSettings
        await this.save()
      },
      roulette_start: async (_ws: Socket, evt: any) => {
        // console.log('roulette_start', evt)
        const msg = evt.data.rouletteData.startMessage
        if (msg) {
          const say = this.bot.sayFn(this.user)
          say(msg)
        }
      },
      roulette_end: async (_ws: Socket, evt: any) => {
        // console.log('roulette_end', evt)
        const msg = evt.data.rouletteData.endMessage.replace(/\$entry\.text/g, evt.data.winner)
        if (msg) {
          const say = this.bot.sayFn(this.user)
          say(msg)
        }
      },
    }
  }

  async volume(vol: number) {
    this.data.settings.volume = clamp(0, vol, 100)
    await this.save()
  }

  getCommands() {
    return this.commands
  }

  async onChatMsg(chatMessageContext: ChatMessageContext) {
    this.newMessages++

    const emotes = this.bot.getEmoteParser().extractEmotes(
      chatMessageContext.msgOriginal,
      chatMessageContext.context,
      this.user.twitch_login,
    )
    if (emotes) {
      const data: GeneralModuleEmotesEventData = {
        displayFn: this.data.settings.emotes.displayFn,
        emotes,
      }
      // extract emotes and send them to the clients
      this.bot.getWebSocketServer().notifyAll([this.user.id], 'general', {
        event: 'emotes',
        data,
      })
    }
  }
}

export default GeneralModule
