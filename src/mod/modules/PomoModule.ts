import { logger, humanDuration } from '../../common/fn'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, FunctionCommand, Module, RawCommand, RewardRedemptionContext, TwitchChatClient, TwitchChatContext } from '../../types'
import { User } from '../../services/Users'
import { default_settings, default_state, PomoModuleData, PomoModuleWsData, PomoModuleWsEffectData, PomoModuleWsSaveData } from './PomoModuleCommon'
import fn, { doReplacements, parseHumanDuration } from '../../fn'
import { newCommandTrigger } from '../../common/commands'
import { MOD_OR_ABOVE } from '../../common/permissions'

const log = logger('PomoModule.ts')

class PomoModule implements Module {
  public name = 'pomo'

  public bot: Bot
  public user: User

  private data: PomoModuleData

  private commands: FunctionCommand[]

  private timeout: NodeJS.Timeout | null = null;

  constructor(
    bot: Bot,
    user: User,
  ) {
    this.bot = bot
    this.user = user

    this.data = this.reinit()
    this.tick(null, null)

    this.commands = [
      {
        triggers: [newCommandTrigger('!pomo')],
        restrict_to: MOD_OR_ABOVE,
        fn: this.cmdPomoStart.bind(this),
      },
      {
        triggers: [newCommandTrigger('!pomo exit', true)],
        restrict_to: MOD_OR_ABOVE,
        fn: this.cmdPomoEnd.bind(this),
      },
    ];
  }

  async replaceText(
    text: string,
    command: RawCommand | null,
    context: TwitchChatContext | null,
  ): Promise<string> {
    const variables = this.bot.getUserVariables(this.user)
    text = await doReplacements(text, command, context, variables, null)
    text = text.replace(/\$pomo\.duration/g, humanDuration(this.data.state.durationMs, [' ms', ' s', ' min', ' hours', ' days']))
    text = text.replace(/\$pomo\.name/g, this.data.state.name)
    return text
  }

  tick(
    command: RawCommand | null,
    context: TwitchChatContext | null,
  ) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.timeout = setTimeout(async () => {
      if (!this.data || !this.data.state.startTs) {
        return null;
      }
      const client = this.bot.getUserTwitchClientManager(this.user).getChatClient()
      const say = client ? fn.sayFn(client, null) : ((msg: string) => { log.info('say(), client not set, msg', msg) })

      const dateStarted = new Date(JSON.parse(this.data.state.startTs));
      const dateEnd = new Date(dateStarted.getTime() + this.data.state.durationMs);
      const doneDate = this.data.state.doneTs ? new Date(JSON.parse(this.data.state.doneTs)) : dateStarted
      const now = new Date();

      let anyNotificationsLeft = false
      for (const n of this.data.settings.notifications) {
        const nDateEnd = new Date(dateEnd.getTime() + parseHumanDuration(`${n.offsetMs}`, true))
        if (nDateEnd < now) {
          // is over and should maybe be triggered!
          if (!doneDate || nDateEnd > doneDate) {
            if (n.effect.chatMessage) {
              say(await this.replaceText(n.effect.chatMessage, command, context))
            }
            this.updateClients({ event: 'effect', data: n.effect })
          }
        } else {
          anyNotificationsLeft = true
        }
      }

      if (dateEnd < now) {
        // is over and should maybe be triggered!
        if (!doneDate || dateEnd > doneDate) {
          if (this.data.settings.endEffect.chatMessage) {
            say(await this.replaceText(this.data.settings.endEffect.chatMessage, command, context))
          }
          this.updateClients({ event: 'effect', data: this.data.settings.endEffect })
        }
      } else {
        anyNotificationsLeft = true
      }

      this.data.state.doneTs = JSON.stringify(now)
      this.save()

      if (anyNotificationsLeft && this.data.state.running) {
        this.tick(command, context);
      }
    }, 1000);
  }

  async cmdPomoStart(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    _msg: string | null,
  ) {
    const say = client ? fn.sayFn(client, target) : ((msg: string) => { log.info('say(), client not set, msg', msg) })

    this.data.state.running = true
    this.data.state.startTs = JSON.stringify(new Date())
    this.data.state.doneTs = this.data.state.startTs
    // todo: parse args and use that
    this.data.state.name = command?.args.slice(1).join(' ') || ''

    let duration = command?.args[0] || '25m'
    duration = duration.match(/^\d+$/) ? `${duration}m` : duration
    this.data.state.durationMs = parseHumanDuration(duration)
    this.save()
    this.tick(command, context)
    this.updateClients(this.wsdata('init'))

    if (this.data.settings.startEffect.chatMessage) {
      say(await this.replaceText(this.data.settings.startEffect.chatMessage, command, context))
    }
    this.updateClients({ event: 'effect', data: this.data.settings.startEffect })
  }

  async cmdPomoEnd(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
    _msg: string | null,
  ) {
    const say = client ? fn.sayFn(client, target) : ((msg: string) => { log.info('say(), client not set, msg', msg) })

    this.data.state.running = false
    this.save()
    this.tick(command, context)
    this.updateClients(this.wsdata('init'))

    if (this.data.settings.stopEffect.chatMessage) {
      say(await this.replaceText(this.data.settings.stopEffect.chatMessage, command, context))
    }
    this.updateClients({ event: 'effect', data: this.data.settings.stopEffect })
  }

  async userChanged(user: User) {
    this.user = user
  }

  save() {
    this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
  }

  saveCommands() {
    // pass
  }

  reinit(): PomoModuleData {
    const data = this.bot.getUserModuleStorage(this.user).load(this.name, {})

    return {
      settings: default_settings(data.settings),
      state: default_state(data.state),
    }
  }

  getRoutes() {
    return {}
  }

  wsdata(event: string): PomoModuleWsData {
    return { event, data: this.data }
  }

  updateClient(data: PomoModuleWsData, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: PomoModuleWsData | PomoModuleWsEffectData) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data)
  }

  getWsEvents() {
    return {
      'conn': (ws: Socket) => {
        this.updateClient(this.wsdata('init'), ws)
      },
      'save': (_ws: Socket, data: PomoModuleWsSaveData) => {
        this.data.settings = data.settings
        this.save()
        this.data = this.reinit()
        this.updateClients(this.wsdata('init'))
      },
    }
  }

  getCommands() {
    return this.commands
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }

  async onRewardRedemption(_RewardRedemptionContext: RewardRedemptionContext) {
    // pass
  }
}

export default PomoModule
