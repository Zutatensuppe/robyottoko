import { Command, FunctionCommand, TwitchChatContext } from "../types";
import { arrayIncludesIgnoreCase } from "./fn";

export enum CommandRestrict {
  MOD = 'mod',
  SUB = 'sub',
  BROADCASTER = 'broadcaster',
  REGULAR = 'regular',
}

export const MOD_OR_ABOVE: CommandRestrict[] = [
  CommandRestrict.MOD,
  CommandRestrict.BROADCASTER,
]

export const permissions = [
  { value: CommandRestrict.BROADCASTER, label: "Broadcaster" },
  { value: CommandRestrict.MOD, label: "Moderators" },
  { value: CommandRestrict.SUB, label: "Subscribers" },
  { value: CommandRestrict.REGULAR, label: "Regular Users" },
]

export const permissionsStr = (restrict: CommandRestrict[]): string => {
  if (restrict.length === 0) {
    return "Everyone";
  }
  const parts: string[] = [];
  permissions.forEach(p => {
    if (restrict.includes(p.value)) {
      parts.push(p.label);
    }
  })
  return parts.join(", ");
}

export const isBroadcaster = (ctx: TwitchChatContext) => ctx['room-id'] === ctx['user-id']
export const isMod = (ctx: TwitchChatContext) => !!ctx.mod
export const isSubscriber = (ctx: TwitchChatContext) => !!ctx.subscriber && !isBroadcaster(ctx)
export const isRegular = (ctx: TwitchChatContext) => !isBroadcaster(ctx) && !isMod(ctx) && !isSubscriber(ctx)

export const userTypeOk = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
  if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.MOD) && isMod(ctx)) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.SUB) && isSubscriber(ctx)) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.BROADCASTER) && isBroadcaster(ctx)) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.REGULAR) && isRegular(ctx)) {
    return true
  }
  return false
}

const userInAllowList = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
  // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
  return arrayIncludesIgnoreCase(cmd.allow_users || [], ctx.username)
}

const userInDisallowList = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
  // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
  return arrayIncludesIgnoreCase(cmd.disallow_users || [], ctx.username)
}

export const mayExecute = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
  if (typeof cmd.enabled !== 'undefined' && cmd.enabled === false) {
    return false
  }
  if (userInAllowList(ctx, cmd)) {
    return true
  }
  return userTypeOk(ctx, cmd) && !userInDisallowList(ctx, cmd)
}
