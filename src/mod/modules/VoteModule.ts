import { User } from '../../repo/Users'
import { Bot, ChatMessageContext, CommandExecutionContext, Module, MODULE_NAME, TwitchChatContext } from '../../types'
import { newCommandTrigger } from '../../common/commands'
import { isBroadcaster, isMod } from '../../common/permissions'
import { logger } from '../../common/fn'

const log = logger('VoteModule.ts')

interface VoteModuleData {
  votes: Record<string, Record<string, string>>
}

class VoteModule implements Module {
  public name = MODULE_NAME.VOTE

  // @ts-ignore
  private data: VoteModuleData

  constructor(
    public readonly bot: Bot,
    public user: User,
  ) {
    // @ts-ignore
    return (async () => {
      this.data = await this.reinit()
      return this;
    })();
  }

  async userChanged(user: User) {
    this.user = user
  }

  async reinit(): Promise<VoteModuleData> {
    const data = await this.bot.getRepos().module.load(this.user.id, this.name, {
      votes: {},
    })
    return data as VoteModuleData
  }

  async save(): Promise<void> {
    await this.bot.getRepos().module.save(this.user.id, this.name, {
      votes: this.data.votes,
    })
  }

  getRoutes() {
    return {}
  }

  saveCommands() {
    // pass
  }

  getWsEvents() {
    return {}
  }

  async vote(
    type: string,
    thing: string,
    target: string,
    context: TwitchChatContext,
  ): Promise<void> {
    if (!context['display-name']) {
      log.error('context has no display name set')
      return
    }
    const say = this.bot.sayFn(this.user, target)
    this.data.votes[type] = this.data.votes[type] || {}
    this.data.votes[type][context['display-name']] = thing
    say(`Thanks ${context['display-name']}, registered your "${type}" vote: ${thing}`)
    await this.save()
  }

  async playCmd(ctx: CommandExecutionContext): Promise<void> {
    if (!ctx.rawCmd || !ctx.context || !ctx.target) {
      return
    }

    const say = this.bot.sayFn(this.user, ctx.target)
    if (ctx.rawCmd.args.length === 0) {
      say(`Usage: !play THING`)
      return
    }

    const thing = ctx.rawCmd.args.join(' ')
    const type = 'play'
    await this.vote(type, thing, ctx.target, ctx.context)
  }

  async voteCmd(ctx: CommandExecutionContext): Promise<void> {
    if (!ctx.rawCmd || !ctx.context || !ctx.target) {
      return
    }

    const say = this.bot.sayFn(this.user, ctx.target)

    // maybe open up for everyone, but for now use dedicated
    // commands like !play THING

    if (!isMod(ctx.context) && !isBroadcaster(ctx.context)) {
      say('Not allowed to execute !vote command')
    }

    if (ctx.rawCmd.args.length < 2) {
      say(`Usage: !vote TYPE THING`)
      return
    }

    if (ctx.rawCmd.args[0] === 'show') {
      const type = ctx.rawCmd.args[1]
      if (!this.data.votes[type]) {
        say(`No votes for "${type}".`)
        return
      }

      const usersByValues: Record<string, string[]> = {}
      for (const user of Object.keys(this.data.votes[type])) {
        const val = this.data.votes[type][user]
        usersByValues[val] = usersByValues[val] || []
        usersByValues[val].push(user)
      }
      const list = []
      for (const val of Object.keys(usersByValues)) {
        list.push({ value: val, users: usersByValues[val] })
      }
      list.sort((a, b) => {
        return b.users.length - a.users.length
      })

      const medals = ['🥇', '🥈', '🥉'];
      let i = 0;
      for (const item of list.slice(0, 3)) {
        say(`${medals[i]} ${item.value}: ${item.users.length} vote${item.users.length > 1 ? 's' : ''} (${item.users.join(', ')})`)
        i++;
      }
      return
    }

    if (ctx.rawCmd.args[0] === 'clear') {
      if (!isBroadcaster(ctx.context)) {
        say('Not allowed to execute !vote clear')
      }
      const type = ctx.rawCmd.args[1]
      if (this.data.votes[type]) {
        delete this.data.votes[type]
      }
      await this.save()
      say(`Cleared votes for "${type}". ✨`)
      return
    }

    const type = ctx.rawCmd.args[0]
    const thing = ctx.rawCmd.args.slice(1).join(' ')
    await this.vote(type, thing, ctx.target, ctx.context)
  }

  getCommands() {
    return [
      // TODO: make configurable
      {
        id: 'vote',
        triggers: [newCommandTrigger('!vote')],
        fn: this.voteCmd.bind(this),
        cooldown: {
          global: '0',
          perUser: '0',
        },
        restrict: {
          active: false,
          to: [],
        },
      },
      {
        id: 'play',
        triggers: [newCommandTrigger('!play')],
        fn: this.playCmd.bind(this),
        cooldown: {
          global: '0',
          perUser: '0',
        },
        restrict: {
          active: false,
          to: [],
        },
      },
    ]
  }

  async onChatMsg(_chatMessageContext: ChatMessageContext) {
    // pass
  }
}

export default VoteModule
