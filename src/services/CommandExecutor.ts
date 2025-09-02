'use strict'

import { getUniqueCommandsByTriggers } from '../common/commands'
import { humanDuration, logger, parseHumanDuration, toJSONDateString } from '../common/fn'
import { mayExecute } from '../common/permissions'
import { doReplacements } from '../fn'
import type { Bot, CommandExecutionContext, CommandTrigger, FunctionCommand, Module, RawCommand } from '../types'
import type { User } from '../repo/Users'
import type { CommandExecutionRepo, Row } from '../repo/CommandExecutionRepo'
import type { TwitchEventContext } from './twitch'

const log = logger('CommandExecutor.ts')

export class CommandExecutor {
  public async executeMatchingCommands(
    bot: Bot,
    user: User,
    rawCmd: RawCommand | null,
    context: TwitchEventContext,
    triggers: CommandTrigger[],
    date: Date,
    contextModule?: Module,
  ): Promise<void> {
    const promises: Promise<void>[] = []
    const ctx: CommandExecutionContext = { rawCmd, context, date }
    for (const m of bot.getModuleManager().all(user.id)) {
      if (contextModule && contextModule.name !== m.name) {
        continue
      }
      const cmdDefs = getUniqueCommandsByTriggers(m.getCommands(), triggers)
      promises.push(this.tryExecuteCommands(m, cmdDefs, ctx, bot, user))
    }
    await Promise.all(promises)
  }

  private isInTimeout(
    timeoutMs: number,
    last: Row | null,
    ctx: CommandExecutionContext,
    user: User,
  ): boolean {
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
      user: user.name,
      target: user.twitch_login,
      command: ctx.rawCmd?.name || '<unknown>',
    }, `Skipping command due to timeout. ${humanDuration(timeoutMsLeft)} left`)
    return true
  }

  private async isInGlobalTimeout(
    cmdDef: FunctionCommand,
    repo: CommandExecutionRepo,
    ctx: CommandExecutionContext,
    user: User,
  ): Promise<boolean> {
    const durationMs = cmdDef.cooldown.global ? parseHumanDuration(cmdDef.cooldown.global) : 0
    if (!durationMs) {
      return false
    }
    const last = await repo.getLastExecuted({
      command_id: cmdDef.id,
    })
    return this.isInTimeout(durationMs, last, ctx, user)
  }

  private async isInPerUserTimeout(
    cmdDef: FunctionCommand,
    repo: CommandExecutionRepo,
    ctx: CommandExecutionContext,
    user: User,
  ): Promise<boolean> {
    if (!ctx.context || !ctx.context.userLoginName) {
      return false
    }
    const durationMs = cmdDef.cooldown.perUser ? parseHumanDuration(cmdDef.cooldown.perUser) : 0
    if (!durationMs) {
      return false
    }
    const last = await repo.getLastExecuted({
      command_id: cmdDef.id,
      trigger_user_name: ctx.context.userLoginName,
    })
    return this.isInTimeout(durationMs, last, ctx, user)
  }

  private async trySay(
    message: string,
    ctx: CommandExecutionContext,
    cmdDef: FunctionCommand,
    bot: Bot,
    user: User,
  ): Promise<void> {
    if (!message) {
      return
    }

    const m = await doReplacements(message, ctx.rawCmd, ctx.context, cmdDef, bot, user)
    const say = bot.sayFn(user)
    say(m)
  }

  private async tryExecuteCommands(
    contextModule: Module,
    cmdDefs: FunctionCommand[],
    ctx: CommandExecutionContext,
    bot: Bot,
    user: User,
  ): Promise<void> {
    const promises: Promise<void>[] = []
    const repo = bot.getRepos().commandExecutionRepo
    for (const cmdDef of cmdDefs) {
      if (!ctx.context || !mayExecute(ctx.context, cmdDef)) {
        continue
      }
      if (await this.isInGlobalTimeout(cmdDef, repo, ctx, user)) {
        await this.trySay(cmdDef.cooldown.globalMessage, ctx, cmdDef, bot, user)
        continue
      }
      if (await this.isInPerUserTimeout(cmdDef, repo, ctx, user)) {
        await this.trySay(cmdDef.cooldown.perUserMessage, ctx, cmdDef, bot, user)
        continue
      }

      log.info({
        user: user.name,
        target: user.twitch_login,
        command: ctx.rawCmd?.name || '<unknown>',
        module: contextModule.name,
      }, 'Executing command')

      // eslint-disable-next-line no-async-promise-executor
      const p = new Promise<void>(async (resolve) => {
        await bot.getEffectsApplier().applyEffects(cmdDef, contextModule, ctx.rawCmd, ctx.context)
        const r = await cmdDef.fn(ctx)
        if (r) {
          log.info({
            user: user.name,
            target: user.twitch_login,
            return: r,
          }, 'Returned from command')
        }
        log.info({
          user: user.name,
          target: user.twitch_login,
          command: ctx.rawCmd?.name || '<unknown>',
        }, 'Executed command')
        resolve()
      })
      promises.push(p)

      await repo.insert({
        command_id: cmdDef.id,
        executed_at: toJSONDateString(ctx.date),
        trigger_user_name: ctx.context.userLoginName || null,
      })
    }
    await Promise.all(promises)
  }
}
