import TwitchHelixClient from '../services/TwitchHelixClient'
import { CommandFunction, RawCommand, SetChannelTitleCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import Variables from '../services/Variables'

const log = logger('setChannelTitle.ts')

const setChannelTitle = (
  title: string,
  helixClient: TwitchHelixClient | null,
  variables: Variables,
  originalCmd: SetChannelTitleCommand,
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
      log.info('unable to execute setChannelTitle, client, command, context, or helixClient missing')
      return
    }
    const say = fn.sayFn(client, target)
    if (title === '') {
      title = '$args()'
    }
    const tmpTitle = await fn.doReplacements(title, command, context, variables, originalCmd)
    if (tmpTitle === '') {
      const info = await helixClient.getChannelInformation(context['room-id'])
      if (info) {
        say(`Current title is "${info.title}".`)
      } else {
        say(`❌ Unable to determine current title.`)
      }
      return
    }

    const resp = await helixClient.modifyChannelInformation(
      context['room-id'],
      { title: tmpTitle }
    )
    if (resp?.status === 204) {
      say(`✨ Changed title to "${tmpTitle}".`)
    } else {
      say('❌ Unable to change title.')
    }
  }

export default setChannelTitle
