import { Bot, CommandFunction, RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'
import { logger } from './../common/fn'
import { User } from '../services/Users'

const log = logger('chatters.ts')

const chatters = (
  bot: Bot,
  user: User
): CommandFunction => async (
  _command: RawCommand | null,
  client: TwitchChatClient | null,
  target: string | null,
  context: TwitchChatContext | null,
  ) => {
    const helixClient = bot.getUserTwitchClientManager(user).getHelixClient()
    if (!client || !context || !helixClient) {
      log.info('client', client)
      log.info('context', context)
      log.info('helixClient', helixClient)
      log.info('unable to execute chatters command, client, context, or helixClient missing')
      return
    }

    const say = fn.sayFn(client, target)

    context['room-id'] = '26851026'
    const stream = await helixClient.getStreamByUserId(context['room-id'])
    if (!stream) {
      say(`It seems this channel is not live at the moment...`)
      return
    }

    const db = bot.getDb()
    const whereObject = db._buildWhere({
      broadcaster_user_id: context['room-id'],
      created_at: { '$gte': new Date(stream.started_at) },
    })
    const userNames = (await db._getMany(
      `select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`,
      whereObject.values
    )).map(r => r.display_name)
    if (userNames.length === 0) {
      say(`It seems nobody chatted? :(`)
      return
    }

    say(`Thank you for chatting!`)
    fn.joinIntoChunks(userNames, ', ', 500).forEach(msg => {
      say(msg)
    })
  }

export default chatters
