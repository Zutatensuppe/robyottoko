import { logger, humanDuration, parseHumanDuration, SECOND } from '../../common/fn'
import { Socket } from '../../net/WebSocketServer'
import { Bot, ChatMessageContext, FunctionCommand, Module, RawCommand, RewardRedemptionContext, TwitchChatClient, TwitchChatContext } from '../../types'
import { User } from '../../services/Users'
import { default_settings, default_state, PomoEffect, PomoModuleData, PomoModuleWsData, PomoModuleWsEffectData, PomoModuleWsSaveData } from './PomoModuleCommon'
import fn, { doReplacements } from '../../fn'
import { newCommandTrigger } from '../../common/commands'
import { MOD_OR_ABOVE } from '../../common/permissions'

const log = logger('PomoModule.ts')

class PomoModule implements Module {
  public name = 'pomo'

  // @ts-ignore
  public bot: Bot
  // @ts-ignore
  public user: User
  // @ts-ignore
  private data: PomoModuleData
  // @ts-ignore
  private commands: FunctionCommand[]

  private timeout: NodeJS.Timeout | null = null;

  constructor(
    bot: Bot,
    user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.bot = bot
      this.user = user

      this.data = await this.reinit()
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
          fn: this.cmdPomoExit.bind(this),
        },
      ];
      return this;
    })();
  }

  async replaceText(
    text: string,
    command: RawCommand | null,
    context: TwitchChatContext | null,
  ): Promise<string> {
    text = await doReplacements(text, command, context, null, this.bot, this.user)
    text = text.replace(/\$pomo\.duration/g, humanDuration(this.data.state.durationMs, [' ms', ' s', ' min', ' hours', ' days']))
    text = text.replace(/\$pomo\.name/g, this.data.state.name)
    return text
  }

  async effect(
    effect: PomoEffect,
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
  ) {
    if (effect.chatMessage) {
      const say = client ? fn.sayFn(client, target) : ((msg: string) => { log.info('say(), client not set, msg', msg) })
      say(await this.replaceText(effect.chatMessage, command, context))
    }
    this.updateClients({ event: 'effect', data: effect })
  }

  tick(
    command: RawCommand | null,
    context: TwitchChatContext | null,
  ) {
    if (!this.data.state.running) {
      return
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    this.timeout = setTimeout(async () => {
      if (!this.data || !this.data.state.startTs || !this.data.state.running) {
        return
      }
      const client = this.bot.getUserTwitchClientManager(this.user).getChatClient()

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
            await this.effect(n.effect, command, client, null, context)
          }
        } else {
          anyNotificationsLeft = true
        }
      }

      if (dateEnd < now) {
        // is over and should maybe be triggered!
        if (!doneDate || dateEnd > doneDate) {
          await this.effect(this.data.settings.endEffect, command, client, null, context)
        }
      } else {
        anyNotificationsLeft = true
      }

      this.data.state.doneTs = JSON.stringify(now)
      await this.save()

      if (anyNotificationsLeft && this.data.state.running) {
        this.tick(command, context);
      }
    }, 1 * SECOND);
  }

  async cmdPomoStart(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
  ) {
    this.data.state.running = true
    this.data.state.startTs = JSON.stringify(new Date())
    this.data.state.doneTs = this.data.state.startTs
    // todo: parse args and use that
    this.data.state.name = command?.args.slice(1).join(' ') || ''

    let duration = command?.args[0] || '25m'
    duration = duration.match(/^\d+$/) ? `${duration}m` : duration
    this.data.state.durationMs = parseHumanDuration(duration)
    await this.save()
    this.tick(command, context)
    this.updateClients(await this.wsdata('init'))

    await this.effect(this.data.settings.startEffect, command, client, target, context)
  }

  async cmdPomoExit(
    command: RawCommand | null,
    client: TwitchChatClient | null,
    target: string | null,
    context: TwitchChatContext | null,
  ) {
    this.data.state.running = false
    await this.save()
    this.tick(command, context)
    this.updateClients(await this.wsdata('init'))

    await this.effect(this.data.settings.stopEffect, command, client, target, context)
  }

  async userChanged(user: User) {
    this.user = user
  }

  async save(): Promise<void> {
    await this.bot.getUserModuleStorage(this.user).save(this.name, this.data)
  }

  saveCommands() {
    // pass
  }

  async reinit(): Promise<PomoModuleData> {
    const data = await this.bot.getUserModuleStorage(this.user).load(this.name, {})

    return {
      settings: default_settings(data.settings),
      state: default_state(data.state),
    }
  }

  getRoutes() {
    return {}
  }

  async wsdata(event: string): Promise<PomoModuleWsData> {
    return {
      event,
      data: {
        settings: this.data.settings,
        state: this.data.state,
        widgetUrl: await this.bot.getWidgets().getWidgetUrl('pomo', this.user.id),
      }
    }
  }

  updateClient(data: PomoModuleWsData, ws: Socket) {
    this.bot.getWebSocketServer().notifyOne([this.user.id], this.name, data, ws)
  }

  updateClients(data: PomoModuleWsData | PomoModuleWsEffectData) {
    this.bot.getWebSocketServer().notifyAll([this.user.id], this.name, data)
  }

  getWsEvents() {
    return {
      'conn': async (ws: Socket) => {
        this.updateClient(await this.wsdata('init'), ws)
      },
      'save': async (_ws: Socket, data: PomoModuleWsSaveData) => {
        this.data.settings = data.settings
        await this.save()
        this.data = await this.reinit()
        this.updateClients(await this.wsdata('init'))
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
