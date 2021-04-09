function ModuleManager() {
  const instances = {}
  return {
    add: (userId, mod) => {
      instances[userId] = instances[userId] || []
      instances[userId].push(mod)
    },
    all: (userId) => (instances[userId] || []),
  }
}

module.exports = ModuleManager
