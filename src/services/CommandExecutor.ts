'use strict'

import { getUniqueCommandsByTriggers } from "../common/commands"
import { logger } from "../common/fn"
import { mayExecute } from "../common/permissions"
import fn from "../fn"
import { Bot, CommandExecutionContext, CommandTrigger, FunctionCommand, Module, RawCommand, TwitchChatContext } from "../types"
import { User } from "./Users"

const log = logger('CommandExecutor.ts')

export class CommandExecutor {
  async executeMatchingCommands(
    bot: Bot,
    user: User,
    rawCmd: RawCommand | null,
    target: string,
    context: TwitchChatContext,
    triggers: CommandTrigger[],
  ): Promise<void> {
    const promises: Promise<void>[] = []
    const ctx: CommandExecutionContext = { rawCmd, target, context }
    for (const m of bot.getModuleManager().all(user.id)) {
      const cmdDefs = getUniqueCommandsByTriggers(m.getCommands(), triggers)
      promises.push(this.tryExecuteCommands(m, cmdDefs, ctx))
    }
    await Promise.all(promises)
  }

  async tryExecuteCommands(
    contextModule: Module,
    cmdDefs: FunctionCommand[],
    ctx: CommandExecutionContext,
  ): Promise<void> {
    const promises = []
    for (const cmdDef of cmdDefs) {
      if (!ctx.context || !mayExecute(ctx.context, cmdDef)) {
        continue
      }
      log.info(`${ctx.target}| * Executing ${ctx.rawCmd?.name || '<unknown>'} command`)
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise(async (resolve) => {
        await fn.applyVariableChanges(cmdDef, contextModule, ctx.rawCmd, ctx.context)
        const r = await cmdDef.fn(ctx)
        if (r) {
          log.info(`${ctx.target}| * Returned: ${r}`)
        }
        log.info(`${ctx.target}| * Executed ${ctx.rawCmd?.name || '<unknown>'} command`)
        resolve(true)
      })
      promises.push(p)
    }
    await Promise.all(promises)
  }
}