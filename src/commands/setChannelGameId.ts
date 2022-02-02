import TwitchHelixClient from '../services/TwitchHelixClient'
import { CommandFunction, RawCommand, SetChannelGameIdCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import Variables from '../services/Variables'

const log = logger('setChannelGameId.ts')

const setChannelGameId = (
  gameId: string,
  helixClient: TwitchHelixClient | null,
  variables: Variables,
  originalCmd: SetChannelGameIdCommand,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  msg: string | null,
  ) => {
    if (!client || !command || !context || !helixClient) {
      log.info('client', client)
      log.info('command', command)
      log.info('context', context)
      log.info('helixClient', helixClient)
      log.info('unable to execute setChannelGameId, client, command, context, or helixClient missing')
      return
    }
    const say = fn.sayFn(client, target)
    if (gameId === '') {
      gameId = '$args()'
    }
    const tmpGameId = await fn.doReplacements(gameId, command, context, variables, originalCmd)
    const game = await helixClient.getGameByName(tmpGameId)
    if (!game) {
      say('🔎 Category not found.')
      return
    }

    const resp = await helixClient.modifyChannelInformation(
      context['room-id'],
      { game_id: game.id }
    )
    if (resp?.status === 204) {
      say(`✨ Changed category to "${game.name}".`)
    } else {
      say('❌ Unable to update category.')
    }
  }

export default setChannelGameId
