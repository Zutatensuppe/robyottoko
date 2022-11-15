'use strict'

import { getUniqueCommandsByTriggers } from "../common/commands"
import { humanDuration, logger, parseHumanDuration } from "../common/fn"
import { mayExecute } from "../common/permissions"
import fn from "../fn"
import { Bot, CommandExecutionContext, CommandTrigger, FunctionCommand, Module, RawCommand, TwitchChatContext } from "../types"
import { User } from "../repo/Users"
import { CommandExecutionRepo, Row } from "../repo/CommandExecutionRepo"

const log = logger('CommandExecutor.ts')

export class CommandExecutor {
  async executeMatchingCommands(
    bot: Bot,
    user: User,
    rawCmd: RawCommand | null,
    target: string,
    context: TwitchChatContext,
    triggers: CommandTrigger[],
    date: Date,
  ): Promise<void> {
    const promises: Promise<void>[] = []
    const ctx: CommandExecutionContext = { rawCmd, target, context, date }
    for (const m of bot.getModuleManager().all(user.id)) {
      const cmdDefs = getUniqueCommandsByTriggers(m.getCommands(), triggers)
      promises.push(this.tryExecuteCommands(m, cmdDefs, ctx, bot.getRepos().commandExecutionRepo))
    }
    await Promise.all(promises)
  }

  isInTimeout(timeoutMs: number, last: Row | null, ctx: CommandExecutionContext): boolean {
    if (!last) {
      return false
    }
    const lastExecution = new Date(last?.executed_at)
    const diffMs = ctx.date.getTime() - lastExecution.getTime()
    const timeoutMsLeft = timeoutMs - diffMs
    if (timeoutMsLeft <= 0) {
      return false
    }
    // timeout still active
    log.info({
      target: ctx.target,
      command: ctx.rawCmd?.name || '<unknown>',
    }, `Skipping command due to timeout. ${humanDuration(timeoutMsLeft)} left`)
    return true
  }

  async isInGlobalTimeout(
    cmdDef: FunctionCommand,
    repo: CommandExecutionRepo,
    ctx: CommandExecutionContext,
  ): Promise<boolean> {
    const durationMs = cmdDef.timeout.global ? parseHumanDuration(cmdDef.timeout.global) : 0
    if (!durationMs) {
      return false
    }
    const last = await repo.getLastExecuted({
      command_id: cmdDef.id,
    })
    return this.isInTimeout(durationMs, last, ctx)
  }

  async isInPerUserTimeout(
    cmdDef: FunctionCommand,
    repo: CommandExecutionRepo,
    ctx: CommandExecutionContext,
  ): Promise<boolean> {
    if (!ctx.context || !ctx.context.username) {
      return false
    }
    const durationMs = cmdDef.timeout.perUser ? parseHumanDuration(cmdDef.timeout.perUser) : 0
    if (!durationMs) {
      return false
    }
    const last = await repo.getLastExecuted({
      command_id: cmdDef.id,
      trigger_user_name: ctx.context.username,
    })
    return this.isInTimeout(durationMs, last, ctx)
  }

  async tryExecuteCommands(
    contextModule: Module,
    cmdDefs: FunctionCommand[],
    ctx: CommandExecutionContext,
    repo: CommandExecutionRepo,
  ): Promise<void> {
    const promises = []
    for (const cmdDef of cmdDefs) {
      if (!ctx.context || !mayExecute(ctx.context, cmdDef)) {
        continue
      }
      if (await this.isInGlobalTimeout(cmdDef, repo, ctx)) {
        continue
      }
      if (await this.isInPerUserTimeout(cmdDef, repo, ctx)) {
        continue
      }

      log.info({
        target: ctx.target,
        command: ctx.rawCmd?.name || '<unknown>',
      }, 'Executing command')
      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise(async (resolve) => {
        await fn.applyEffects(cmdDef, contextModule, ctx.rawCmd, ctx.context)
        const r = await cmdDef.fn(ctx)
        if (r) {
          log.info({
            target: ctx.target,
            return: r,
          }, 'Returned from command')
        }
        log.info({
          target: ctx.target,
          command: ctx.rawCmd?.name || '<unknown>',
        }, 'Executed command')
        resolve(true)
      })
      promises.push(p)

      await repo.insert({
        command_id: cmdDef.id,
        executed_at: ctx.date,
        trigger_user_name: ctx.context.username || null,
      })
    }
    await Promise.all(promises)
  }
}
