class ModuleManager {
  constructor() {
    this.instances = {}
  }

  add (user_id, module) {
    this.instances[user_id] = this.instances[user_id] || []
    this.instances[user_id].push(module)
  }

  all (user_id) {
    return this.instances[user_id] || []
  }
}

module.exports = ModuleManager
