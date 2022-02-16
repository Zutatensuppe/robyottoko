import { Command, FunctionCommand, TwitchChatContext } from "../types";

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

export const mayExecute = (context: TwitchChatContext, cmd: Command | FunctionCommand) => {
  if (!cmd.restrict_to || cmd.restrict_to.length === 0) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.MOD) && isMod(context)) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.SUB) && isSubscriber(context)) {
    return true
  }
  if (cmd.restrict_to.includes(CommandRestrict.BROADCASTER) && isBroadcaster(context)) {
    return true
  }
  return false
}
