import type { TwitchEventContext } from '../services/twitch'
import type { Command, FunctionCommand } from '../types'
import { arrayIncludesIgnoreCase } from './fn'

export enum CommandRestrictEnum {
  MOD = 'mod',
  VIP = 'vip',
  SUB = 'sub',
  BROADCASTER = 'broadcaster',
  REGULAR = 'regular',
}

export interface CommandRestrict {
  active: boolean
  to: CommandRestrictEnum[]
}

export const MOD_OR_ABOVE: CommandRestrictEnum[] = [
  CommandRestrictEnum.MOD,
  CommandRestrictEnum.BROADCASTER,
]

export const permissions = [
  { value: CommandRestrictEnum.BROADCASTER, label: 'Broadcaster' },
  { value: CommandRestrictEnum.MOD, label: 'Moderators' },
  { value: CommandRestrictEnum.VIP, label: 'Vips' },
  { value: CommandRestrictEnum.SUB, label: 'Subscribers' },
  { value: CommandRestrictEnum.REGULAR, label: 'Regular Users' },
]

export const permissionsStr = (restrict: CommandRestrict): string => {
  if (restrict.active === false) {
    return 'Everyone'
  }
  const parts: string[] = []
  permissions.forEach(p => {
    if (restrict.to.includes(p.value)) {
      parts.push(p.label)
    }
  })
  return parts.join(', ')
}

export const isBroadcaster = (ctx: TwitchEventContext) => ctx.channelId === ctx.userId
export const isMod = (ctx: TwitchEventContext) => !!ctx.isMod
export const isSubscriber = (ctx: TwitchEventContext) => !!ctx.isSubscriber && !isBroadcaster(ctx)
export const isRegular = (ctx: TwitchEventContext) => !isBroadcaster(ctx) && !isMod(ctx) && !isSubscriber(ctx)
export const isVip = (ctx: TwitchEventContext) => !!ctx.isVip

export const userTypeOk = (ctx: TwitchEventContext, cmd: Command | FunctionCommand): boolean => {
  if (!cmd.restrict.active) {
    return true
  }
  if (cmd.restrict.to.includes(CommandRestrictEnum.MOD) && isMod(ctx)) {
    return true
  }
  if (cmd.restrict.to.includes(CommandRestrictEnum.SUB) && isSubscriber(ctx)) {
    return true
  }
  if (cmd.restrict.to.includes(CommandRestrictEnum.VIP) && isVip(ctx)) {
    return true
  }
  if (cmd.restrict.to.includes(CommandRestrictEnum.BROADCASTER) && isBroadcaster(ctx)) {
    return true
  }
  if (cmd.restrict.to.includes(CommandRestrictEnum.REGULAR) && isRegular(ctx)) {
    return true
  }
  return false
}

const userInAllowList = (ctx: TwitchEventContext, cmd: Command | FunctionCommand): boolean => {
  // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
  return arrayIncludesIgnoreCase(cmd.allow_users || [], ctx.userLoginName || '')
}

const userInDisallowList = (ctx: TwitchEventContext, cmd: Command | FunctionCommand): boolean => {
  // compare lowercase, otherwise may be confusing why nC_para_ doesnt disallow nc_para_
  return arrayIncludesIgnoreCase(cmd.disallow_users || [], ctx.userLoginName || '')
}

export const mayExecute = (ctx: TwitchEventContext, cmd: Command | FunctionCommand): boolean => {
  if (typeof cmd.enabled !== 'undefined' && cmd.enabled === false) {
    return false
  }
  if (userInAllowList(ctx, cmd)) {
    return true
  }
  return userTypeOk(ctx, cmd) && !userInDisallowList(ctx, cmd)
}
