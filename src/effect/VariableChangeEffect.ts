import { logger } from "../common/fn";
import { GlobalVariable, VariableChangeEffectData } from "../types";
import { Effect } from "./Effect";

const log = logger('VariableChangeEffect.ts')

const _toInt = (value: any) => parseInt(`${value}`, 10)

const _increase = (value: any, by: any) => (_toInt(value) + _toInt(by))

const _decrease = (value: any, by: any) => (_toInt(value) - _toInt(by))

export class VariableChangeEffect extends Effect<VariableChangeEffectData> {
  async apply(): Promise<void> {
    const op = this.effect.data.change
    const name = await this.doReplacements(this.effect.data.name)
    const value = await this.doReplacements(this.effect.data.value)

    const changed = this.changeLocalVariable(op, name, value)
      || await this.changeGlobalVariable(op, name, value)
    if (!changed) {
      log.warn({ op, name, value }, 'variable not changed')
    }
  }

  private changeLocalVariable(op: string, name: string, value: string): boolean {
    // check if there is a local variable for the change
    if (!this.originalCmd.variables) {
      return false
    }

    const idx = this.originalCmd.variables.findIndex(v => (v.name === name))
    if (idx === -1) {
      return false
    }

    if (op === 'set') {
      this.originalCmd.variables[idx].value = value
    } else if (op === 'increase_by') {
      this.originalCmd.variables[idx].value = _increase(this.originalCmd.variables[idx].value, value)
    } else if (op === 'decrease_by') {
      this.originalCmd.variables[idx].value = _decrease(this.originalCmd.variables[idx].value, value)
    } else {
      log.warn({ op, name, value }, 'bad op')
    }

    // return true, because the variable was found, just the op is wrong :(
    return true
  }

  private async changeGlobalVariable(op: string, name: string, value: string): Promise<boolean> {
    const variables = this.contextModule.bot.getRepos().variables
    const globalVars: GlobalVariable[] = await variables.all(this.contextModule.user.id)
    const idx = globalVars.findIndex(v => (v.name === name))
    if (idx === -1) {
      return false
    }

    if (op === 'set') {
      await variables.set(this.contextModule.user.id, name, value)
    } else if (op === 'increase_by') {
      await variables.set(this.contextModule.user.id, name, _increase(globalVars[idx].value, value))
    } else if (op === 'decrease_by') {
      await variables.set(this.contextModule.user.id, name, _decrease(globalVars[idx].value, value))
    } else {
      log.warn({ op, name, value }, 'bad op')
    }
    return true
  }
}
