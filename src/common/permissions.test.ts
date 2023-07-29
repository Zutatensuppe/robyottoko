import { Command, TwitchEventContext } from '../types'
import { CommandRestrictEnum, mayExecute, userTypeOk } from './permissions'

describe(('mayExecute'), () => {

  const regularUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla' } as TwitchEventContext
  const modUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', mod: true } as TwitchEventContext
  const subUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', subscriber: true } as TwitchEventContext
  const broadcasterUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'user1', subscriber: true } as TwitchEventContext

  const nonRestrictedCommand = { restrict: { active: false } } as unknown as Command
  const modSubBroadcasterRestrictedCommand = { restrict: { active: true, to: [CommandRestrictEnum.MOD, CommandRestrictEnum.SUB, CommandRestrictEnum.BROADCASTER] } } as unknown as Command
  const disallowedUserCommand = { disallow_users: ['bla'], restrict: { active: false } } as unknown as Command
  const allowedUserCommand = { allow_users: ['bla'], disallow_users: ['bla'], restrict: { active: true, to: [CommandRestrictEnum.MOD, CommandRestrictEnum.SUB, CommandRestrictEnum.BROADCASTER] } } as unknown as Command

  test.each([
    {
      name: 'regular user, no restrictions',
      ctx: regularUserCtx,
      cmd: nonRestrictedCommand,
      expected: true,
    },
    {
      name: 'mod user, no restrictions',
      ctx: modUserCtx,
      cmd: nonRestrictedCommand,
      expected: true,
    },
    {
      name: 'sub user, no restrictions',
      ctx: subUserCtx,
      cmd: nonRestrictedCommand,
      expected: true,
    },
    {
      name: 'broadcaster user, no restrictions',
      ctx: broadcasterUserCtx,
      cmd: nonRestrictedCommand,
      expected: true,
    },

    // with restricts
    {
      name: 'regular user, restricted to mod sub broadcaster',
      ctx: regularUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: false,
    },
    {
      name: 'mod user, restricted to mod sub broadcaster',
      ctx: modUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true,
    },
    {
      name: 'sub user, restricted to mod sub broadcaster',
      ctx: subUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true,
    },
    {
      name: 'broadcaster user, restricted to mod sub broadcaster',
      ctx: broadcasterUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true,
    },

    // with disallows
    {
      name: 'broadcaster user, disallowed',
      ctx: broadcasterUserCtx,
      cmd: disallowedUserCommand,
      expected: false,
    },

    // with allows
    {
      name: 'regular user, allowed',
      ctx: regularUserCtx,
      cmd: allowedUserCommand,
      expected: true,
    },
  ])('mayExecute: $name', ({ name, ctx, cmd, expected }) => {
    const actual = mayExecute(ctx, cmd)
    expect(actual).toStrictEqual(expected)
  })

})



describe(('userTypeOk'), () => {
  const regularUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla' } as TwitchEventContext
  const modUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', mod: true } as TwitchEventContext
  const subUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', subscriber: true } as TwitchEventContext
  // broadcasters are always subscribers
  const broadcasterUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'user1', subscriber: true } as TwitchEventContext

  const noRestrict = { restrict: { active: false, to: [] } } as unknown as Command
  const nobodyRestrict = { restrict: { active: true, to: [] } } as unknown as Command
  const modRestrict = { restrict: { active: true, to: [CommandRestrictEnum.MOD] } } as unknown as Command
  const subRestrict = { restrict: { active: true, to: [CommandRestrictEnum.SUB] } } as unknown as Command
  const regularRestrict = { restrict: { active: true, to: [CommandRestrictEnum.REGULAR] } } as unknown as Command
  const broadcasterRestrict = { restrict: { active: true, to: [CommandRestrictEnum.BROADCASTER] } } as unknown as Command

  test.each([
    // regular user
    { ctx: regularUserCtx, cmd: noRestrict, expected: true },
    { ctx: regularUserCtx, cmd: nobodyRestrict, expected: false },
    { ctx: regularUserCtx, cmd: modRestrict, expected: false },
    { ctx: regularUserCtx, cmd: subRestrict, expected: false },
    { ctx: regularUserCtx, cmd: broadcasterRestrict, expected: false },
    { ctx: regularUserCtx, cmd: regularRestrict, expected: true },

    // mod user
    { ctx: modUserCtx, cmd: noRestrict, expected: true },
    { ctx: modUserCtx, cmd: nobodyRestrict, expected: false },
    { ctx: modUserCtx, cmd: modRestrict, expected: true },
    { ctx: modUserCtx, cmd: subRestrict, expected: false },
    { ctx: modUserCtx, cmd: broadcasterRestrict, expected: false },
    { ctx: modUserCtx, cmd: regularRestrict, expected: false },

    // sub user
    { ctx: subUserCtx, cmd: noRestrict, expected: true },
    { ctx: subUserCtx, cmd: nobodyRestrict, expected: false },
    { ctx: subUserCtx, cmd: modRestrict, expected: false },
    { ctx: subUserCtx, cmd: subRestrict, expected: true },
    { ctx: subUserCtx, cmd: broadcasterRestrict, expected: false },
    { ctx: subUserCtx, cmd: regularRestrict, expected: false },

    // broadcaster user
    { ctx: broadcasterUserCtx, cmd: noRestrict, expected: true },
    { ctx: broadcasterUserCtx, cmd: nobodyRestrict, expected: false },
    { ctx: broadcasterUserCtx, cmd: modRestrict, expected: false },
    { ctx: broadcasterUserCtx, cmd: subRestrict, expected: false },
    { ctx: broadcasterUserCtx, cmd: broadcasterRestrict, expected: true },
    { ctx: broadcasterUserCtx, cmd: regularRestrict, expected: false },

    // other stuff
    { ctx: subUserCtx, cmd: { restrict: { active: true, to: [CommandRestrictEnum.BROADCASTER, CommandRestrictEnum.SUB] } } as unknown as Command, expected: true},
    { ctx: broadcasterUserCtx, cmd: { restrict: { active: true, to: [CommandRestrictEnum.REGULAR, CommandRestrictEnum.SUB, CommandRestrictEnum.MOD] } } as unknown as Command, expected: false},

  ])('userTypeOk', ({ ctx, cmd, expected }) => {
    const actual = userTypeOk(ctx, cmd)
    expect(actual).toStrictEqual(expected)
  })

})
