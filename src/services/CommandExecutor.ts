'use strict'

import { getUniqueCommandsByTriggers } from "../common/commands"
import { logger } from "../common/fn"
import { mayExecute } from "../common/permissions"
import fn from "../fn"
import { Bot, CommandTrigger, FunctionCommand, Module, RawCommand, TwitchChatContext } from "../types"
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
    for (const m of bot.getModuleManager().all(user.id)) {
      const commands = m.getCommands()
      const cmdDefs = getUniqueCommandsByTriggers(commands, triggers)
      promises.push(this.tryExecuteCommand(m, rawCmd, cmdDefs, target, context))
    }
    await Promise.all(promises)
  }

  async tryExecuteCommand(
    contextModule: Module,
    rawCmd: RawCommand | null,
    cmdDefs: FunctionCommand[],
    target: string,
    context: TwitchChatContext
  ): Promise<void> {
    const client = contextModule.bot.getUserTwitchClientManager(contextModule.user).getChatClient()
    const promises = []
    for (const cmdDef of cmdDefs) {
      if (!mayExecute(context, cmdDef)) {
        continue
      }
      log.info(`${target}| * Executing ${rawCmd?.name || '<unknown>'} command`)
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise(async (resolve) => {
        await fn.applyVariableChanges(cmdDef, contextModule, rawCmd, context)
        const r = await cmdDef.fn(rawCmd, client, target, context)
        if (r) {
          log.info(`${target}| * Returned: ${r}`)
        }
        log.info(`${target}| * Executed ${rawCmd?.name || '<unknown>'} command`)
        resolve(true)
      })
      promises.push(p)
    }
    await Promise.all(promises)
  }
}
