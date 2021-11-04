import Db from '../../Db'
import fn from '../../fn'
import WebServer from '../../WebServer'
import WebSocketServer from '../../net/WebSocketServer'
import TwitchHelixClient from '../../services/TwitchHelixClient'
import Variables from '../../services/Variables'
import { User } from '../../services/Users'
import { RawCommand, TwitchChatClient, TwitchChatContext } from '../../types'
import ModuleStorage from '../ModuleStorage'
import Cache from '../../services/Cache'

interface VoteModuleData {
  votes: Record<string, Record<string, string>>
}

class VoteModule {
  public name = 'vote'
  public variables: Variables
  private user: User
  private wss: WebSocketServer
  private storage: ModuleStorage
  private ws: WebServer
  private data: VoteModuleData

  constructor(
    db: Db,
    user: User,
    variables: Variables,
    chatClient: TwitchChatClient,
    helixClient: TwitchHelixClient,
    storage: ModuleStorage,
    cache: Cache,
    ws: WebServer,
    wss: WebSocketServer,
  ) {
    this.user = user
    this.variables = variables
    this.wss = wss
    this.storage = storage

    this.ws = ws
    this.data = this.reinit()
  }

  reinit() {
    const data = this.storage.load(this.name, {
      votes: {},
    })
    return data as VoteModuleData
  }

  save() {
    this.storage.save(this.name, {
      votes: this.data.votes,
    })
  }

  widgets() {
    return {}
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

  vote(
    type: string,
    thing: string,
    client: TwitchChatClient,
    target: string,
    context: TwitchChatContext,
  ) {
    const say = fn.sayFn(client, target)
    this.data.votes[type] = this.data.votes[type] || {}
    this.data.votes[type][context['display-name']] = thing
    say(`Thanks ${context['display-name']}, registered your "${type}" vote: ${thing}`)
    this.save()
  }

  async playCmd(
    command: RawCommand,
    client: TwitchChatClient,
    target: string,
    context: TwitchChatContext,
    msg: string,
  ) {
    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Usage: !play THING`)
      return
    }

    const thing = command.args.join(' ')
    const type = 'play'
    this.vote(type, thing, client, target, context)
  }

  async voteCmd(
    command: RawCommand,
    client: TwitchChatClient,
    target: string,
    context: TwitchChatContext,
    msg: string,
  ) {
    const say = fn.sayFn(client, target)

    // maybe open up for everyone, but for now use dedicated
    // commands like !play THING
    if (!fn.isMod(context) && !fn.isBroadcaster(context)) {
      say('Not allowed to execute !vote command')
    }

    if (command.args.length < 2) {
      say(`Usage: !vote TYPE THING`)
      return
    }

    if (command.args[0] === 'show') {
      const type = command.args[1]
      if (!this.data.votes[type]) {
        say(`No votes for "${type}".`)
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

    if (command.args[0] === 'clear') {
      if (!fn.isBroadcaster(context)) {
        say('Not allowed to execute !vote clear')
      }
      const type = command.args[1]
      if (this.data.votes[type]) {
        delete this.data.votes[type]
      }
      this.save()
      say(`Cleared votes for "${type}". ✨`)
      return
    }

    const type = command.args[0]
    const thing = command.args.slice(1).join(' ')
    this.vote(type, thing, client, target, context)
  }

  getCommands() {
    return {
      '!vote': [{
        fn: this.voteCmd.bind(this),
      }],

      // make configurable
      '!play': [{
        fn: this.playCmd.bind(this),
      }],
    }
  }

  onChatMsg(
    client: TwitchChatClient,
    target: string,
    context: TwitchChatContext,
    msg: string,
  ) {
  }
}

export default VoteModule
