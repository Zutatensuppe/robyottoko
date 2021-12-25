import countdown from '../../commands/countdown'
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
import { ChatMessageContext, Command, FunctionCommand, GlobalVariable, TwitchChannelPointsRedemption, TwitchChatClient, TwitchChatContext, RawCommand } from '../../types'
import ModuleStorage from '../ModuleStorage'
import Cache from '../../services/Cache'
import TwitchClientManager from '../../net/TwitchClientManager'
import dictLookup from '../../commands/dictLookup'
import { commandHasTrigger, newCommandTrigger, newTrigger } from '../../util'

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
  private commands: FunctionCommand[]
  private rewardRedemptions: FunctionCommand[]
  private timers: GeneralModuleTimer[]

  private interval: NodeJS.Timer | null = null

  constructor(
    db: Db,
    user: User,
    variables: Variables,
    clientManager: TwitchClientManager,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer,
  ) {
    this.db = db
    this.user = user
    this.variables = variables
    this.chatClient = clientManager.getChatClient()
    this.helixClient = clientManager.getHelixClient()
    this.storage = storage
    this.wss = wss
    const initData = this.reinit()
    this.data = initData.data
    this.commands = initData.commands
    this.rewardRedemptions = initData.redemptions
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
    const redemptions: FunctionCommand[] = []
    const timers: GeneralModuleTimer[] = []

    commands.push({
      triggers: [newCommandTrigger('!media volume')],
      restrict_to: ['mod', 'broadcaster'],
      fn: this.mediaVolumeCmd.bind(this),
    })

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
        case 'dict_lookup':
          cmdObj = Object.assign({}, cmd, { fn: dictLookup(cmd.data.lang, cmd.data.phrase, this.variables, cmd) })
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
            redemptions.push(cmdObj)
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
    return { data, commands, redemptions, timers } as GeneralModuleInitData
  }

  widgets() {
    return {
      'media': (req: any, res: any, next: Function) => {
        return {
          title: 'Media Widget',
          page: 'media',
          wsUrl: `${this.wss.connectstring()}/${this.name}`,
          widgetToken: req.params.widget_token,
        }
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
    this.rewardRedemptions = initData.redemptions
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
    context: TwitchChatContext | null,
    msg: string | null,
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

  async onChatMsg(chatMessageContext: ChatMessageContext) {
    this.timers.forEach(t => {
      t.lines++
    })
  }

  async handleRewardRedemption(redemption: TwitchChannelPointsRedemption) {
    if (!this.chatClient) {
      return
    }
    // reward redemption should all have exact key/name of the reward, no sorting
    // required
    for (const rewardRedemption of this.rewardRedemptions) {
      for (const trigger of rewardRedemption.triggers) {
        if (
          trigger.type !== 'reward_redemption'
          || trigger.data.command !== redemption.reward.title
        ) {
          continue
        }

        const twitchChannel = this.db.get('twitch_channel', { channel_id: redemption.channel_id })
        if (!twitchChannel) {
          continue
        }
        const rawCmd: RawCommand = {
          name: redemption.reward.title,
          args: redemption.user_input ? [redemption.user_input] : [],
        }
        const cmdDefs = this.rewardRedemptions.filter((r) => commandHasTrigger(r, trigger))
        const target = twitchChannel.channel_name
        const twitchChatContext = {
          "room-id": redemption.channel_id,
          "user-id": redemption.user.id,
          "display-name": redemption.user.display_name,
          username: redemption.user.login,
          mod: false, // no way to tell without further looking up user somehow
          subscriber: redemption.reward.is_sub_only, // this does not really tell us if the user is sub or not, just if the redemption was sub only
        }
        const msg = redemption.reward.title
        await fn.tryExecuteCommand(this, rawCmd, cmdDefs, this.chatClient, target, twitchChatContext, msg)

        // dont trigger same redemption twice, so break
        break
      }
    }
  }
}

export default GeneralModule
