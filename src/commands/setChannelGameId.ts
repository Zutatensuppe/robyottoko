import TwitchHelixClient from '../services/TwitchHelixClient'
import { CommandFunction, RawCommand, SetChannelGameIdCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import Variables from '../services/Variables'

const log = logger('setChannelGameId.ts')

const setChannelGameId = (
  originalCmd: SetChannelGameIdCommand,
  helixClient: TwitchHelixClient | null,
  variables: Variables,
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
    const gameId = originalCmd.data.game_id === '' ? '$args()' : originalCmd.data.game_id
    const tmpGameId = await fn.doReplacements(gameId, command, context, variables, originalCmd)
    if (tmpGameId === '') {
      const info = await helixClient.getChannelInformation(context['room-id'])
      if (info) {
        say(`Current category is "${info.game_name}".`)
      } else {
        say(`❌ Unable to determine current category.`)
      }
      return
    }

    const category = await helixClient.searchCategory(tmpGameId)
    if (!category) {
      say('🔎 Category not found.')
      return
    }

    const resp = await helixClient.modifyChannelInformation(
      context['room-id'],
      { game_id: category.id }
    )
    if (resp?.status === 204) {
      say(`✨ Changed category to "${category.name}".`)
    } else {
      say('❌ Unable to update category.')
    }
  }

export default setChannelGameId
