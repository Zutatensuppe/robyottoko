import Db from '../../Db.js'
import fn from '../../fn.js'
import WebServer from '../../WebServer.js'
import WebSocketServer from '../../net/WebSocketServer.js'
import TwitchHelixClient from '../../services/TwitchHelixClient.js'
import Variables from '../../services/Variables.js'

class DrawcastModule {
  constructor(
    /** @type Db */ db,
    user,
    /** @type Variables */ variables,
    chatClient,
    /** @type TwitchHelixClient */ helixClient,
    storage,
    cache,
    /** @type WebServer */ ws,
    /** @type WebSocketServer */ wss,
  ) {
    this.user = user
    this.variables = variables
    this.wss = wss
    this.storage = storage
    this.name = 'vote'

    this.ws = ws
    this.reinit()
  }

  reinit() {
    const data = this.storage.load(this.name, {
      votes: {},
    })
    this.data = data
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

  saveCommands(commands) {
    // pass
  }

  wsdata(eventName) {
    return {
      event: eventName,
      data: Object.assign({}, this.data),
    };
  }

  updateClient(eventName, ws) {
    this.wss.notifyOne([this.user.id], this.name, this.wsdata(eventName), ws)
  }

  updateClients(eventName) {
    this.wss.notifyAll([this.user.id], this.name, this.wsdata(eventName))
  }

  getWsEvents() {
    return {}
  }

  vote(type, thing, client, target, context) {
    const say = fn.sayFn(client, target)
    this.data.votes[type] = this.data.votes[type] || {}
    this.data.votes[type][context.username] = thing
    say(`Thanks ${context.username}, registered your "${type}" vote: ${thing}`)
    this.save()
  }

  async playCmd(command, client, target, context, msg) {
    const say = fn.sayFn(client, target)
    if (command.args.length === 0) {
      say(`Usage: !play THING`)
      return
    }

    const thing = command.args.join(' ')
    const type = 'play'
    this.vote(type, thing, client, target, context)
  }

  async voteCmd(command, client, target, context, msg) {
    const say = fn.sayFn(client, target)

    // maybe open up for everyone, but for now use dedicated
    // commands like !play THING
    if (!fn.isMod(context) && !fn.isBroadcaster()) {
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
      const usersByValues = {}
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

  onChatMsg(client, target, context, msg) {
  }
}

export default DrawcastModule
