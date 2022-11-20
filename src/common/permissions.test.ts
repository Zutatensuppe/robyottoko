import { Command, TwitchChatContext } from "../types"
import { CommandRestrict, mayExecute } from "./permissions"


describe(('mayExecute'), () => {

  const regularUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla' } as TwitchChatContext
  const modUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', mod: true } as TwitchChatContext
  const subUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'bla', subscriber: true } as TwitchChatContext
  const broadcasterUserCtx = { username: 'bla', 'room-id': 'user1', 'user-id': 'user1' } as TwitchChatContext

  const nonRestrictedCommand = {} as unknown as Command
  const modSubBroadcasterRestrictedCommand = { restrict_to: [CommandRestrict.MOD, CommandRestrict.SUB, CommandRestrict.BROADCASTER] } as unknown as Command
  const disallowedUserCommand = { disallow_users: 'bla' } as unknown as Command

  test.each([
    {
      name: 'regular user, no restrictions',
      ctx: regularUserCtx,
      cmd: nonRestrictedCommand,
      expected: true
    },
    {
      name: 'mod user, no restrictions',
      ctx: modUserCtx,
      cmd: nonRestrictedCommand,
      expected: true
    },
    {
      name: 'sub user, no restrictions',
      ctx: subUserCtx,
      cmd: nonRestrictedCommand,
      expected: true
    },
    {
      name: 'broadcaster user, no restrictions',
      ctx: broadcasterUserCtx,
      cmd: nonRestrictedCommand,
      expected: true
    },

    // with restricts
    {
      name: 'regular user, restricted to mod sub broadcaster',
      ctx: regularUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: false
    },
    {
      name: 'mod user, restricted to mod sub broadcaster',
      ctx: modUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true
    },
    {
      name: 'sub user, restricted to mod sub broadcaster',
      ctx: subUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true
    },
    {
      name: 'broadcaster user, restricted to mod sub broadcaster',
      ctx: broadcasterUserCtx,
      cmd: modSubBroadcasterRestrictedCommand,
      expected: true
    },

    // with disallows
    {
      name: 'broadcaster user, disallowed',
      ctx: broadcasterUserCtx,
      cmd: disallowedUserCommand,
      expected: false
    },
  ])('mayExecute: $name', ({ name, ctx, cmd, expected }) => {
    const actual = mayExecute(ctx, cmd)
    expect(actual).toStrictEqual(expected)
  })

})
