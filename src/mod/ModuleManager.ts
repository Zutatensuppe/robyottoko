import { User } from "../repo/Users"
import { Module } from "../types"

class ModuleManager {
  private instances: Record<number, Module[]> = {}

  add(userId: number, mod: Module) {
    this.instances[userId] = this.instances[userId] || []
    this.instances[userId].push(mod)
  }

  all(userId: number): Module[] {
    return this.instances[userId] || []
  }

  get(userId: number, name: string): Module | null {
    for (const m of this.all(userId)) {
      if (m.name === name) {
        return m
      }
    }
    return null
  }

  async updateForUser(userId: number, changedUser: User): Promise<void> {
    const promises: Promise<void>[] = []
    for (const mod of this.all(userId)) {
      promises.push(mod.userChanged(changedUser))
    }
    await Promise.all(promises)
  }
}

export default ModuleManager
