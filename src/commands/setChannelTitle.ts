import { Bot, CommandFunction, RawCommand, SetChannelTitleCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import { logger, unicodeLength } from './../common/fn'
import { User } from '../services/Users'

const log = logger('setChannelTitle.ts')

const setChannelTitle = (
  originalCmd: SetChannelTitleCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  _msg: string | null,
  ) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client || !command || !context || !helixClient) {
      log.info('client', client)
      log.info('command', command)
      log.info('context', context)
      log.info('helixClient', helixClient)
      log.info('unable to execute setChannelTitle, client, command, context, or helixClient missing')
      return
    }
    const say = fn.sayFn(client, target)
    const title = originalCmd.data.title === '' ? '$args()' : originalCmd.data.title
    const tmpTitle = await fn.doReplacements(title, command, context, originalCmd, bot, user)
    if (tmpTitle === '') {
      const info = await helixClient.getChannelInformation(context['room-id'])
      if (info) {
        say(`Current title is "${info.title}".`)
      } else {
        say(`❌ Unable to determine current title.`)
      }
      return
    }

    // helix api returns 204 status code even if the title is too long and
    // cant actually be set. but there is no error returned in that case :(
    const len = unicodeLength(tmpTitle)
    const max = 140
    if (len > max) {
      say(`❌ Unable to change title because it is too long (${len}/${max} characters).`)
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
