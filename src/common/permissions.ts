import { Command, FunctionCommand, TwitchChatContext } from "../types";
import { arrayIncludesIgnoreCase } from "./fn";

export enum CommandRestrict {
  MOD = 'mod',
  SUB = 'sub',
  BROADCASTER = 'broadcaster',
}

export const MOD_OR_ABOVE: CommandRestrict[] = [
  CommandRestrict.MOD,
  CommandRestrict.BROADCASTER,
]

export const permissions = [
  { value: CommandRestrict.BROADCASTER, label: "Broadcaster" },
  { value: CommandRestrict.MOD, label: "Moderators" },
  { value: CommandRestrict.SUB, label: "Subscribers" },
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
export const isSubscriber = (ctx: TwitchChatContext) => !!ctx.subscriber

const userTypeOk = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
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
  return false
}

const userAllowed = (ctx: TwitchChatContext, cmd: Command | FunctionCommand): boolean => {
  if (!cmd.disallow_users || cmd.disallow_users.length === 0) {
    return true
  }
  // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
  return arrayIncludesIgnoreCase(cmd.disallow_users, ctx.username)
}

export const mayExecute = (context: TwitchChatContext, cmd: Command | FunctionCommand) => {
  return userTypeOk(context, cmd) && userAllowed(context, cmd)
}
