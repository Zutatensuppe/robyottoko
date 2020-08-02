const fn = require('./../fn.js')

class CoreModule
{
  constructor(user, client, storage, modules) {
    this.user = user
    this.modules = modules
  }

  allcmds () {
    const cmds = {}
    for (let mi of this.modules.all(this.user)) {
      Object.keys(mi.getCommands() || {}).forEach((key) => { cmds[key] = mi.getCommands()[key] })
    }
    return cmds
  }

  getRoutes () {
    return null
  }

  getWsEvents () {
    return null
  }

  getCommands () {
    return {
      '!commands': {
        fn: () => 'Commands: ' + Object.keys(this.allcmds()).filter(a => !['!commands'].includes(a)).join(' ')
      },
    }
  }
  async onMsg (client, target, context, msg) {
    const command = fn.parseCommand(msg)
    const cmd = this.allcmds()[command.name] || null
    if (!cmd || !fn.mayExecute(context, cmd)) {
      console.log(target + '| ' + msg)
      return
    }

    const r = await cmd.fn(command, client, target, context, msg)
    console.log(r)
    if (r) {
      fn.sayFn(client, target)(r)
    }
    console.log(target + '| ' + `* Executed ${command.name} command`)
  }
}

module.exports = {
  name: 'core',
  create: (user, client, storage, modules) => {
    return new CoreModule(user, client, storage, modules)
  },
}
