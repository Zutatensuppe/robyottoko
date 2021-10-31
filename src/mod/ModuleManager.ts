import { Module } from "../types"

class ModuleManager {
  private instances: Record<number, Module[]>

  constructor() {
    this.instances = {}
  }

  add(userId: number, mod: Module) {
    this.instances[userId] = this.instances[userId] || []
    this.instances[userId].push(mod)
  }

  all(userId: number): Module[] {
    return this.instances[userId] || []
  }
}

export default ModuleManager
