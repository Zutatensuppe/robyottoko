import Db from '../Db'
import TwitchHelixClient from '../services/TwitchHelixClient'
import { RawCommand, TwitchChatClient, TwitchChatContext } from '../types'
import fn from './../fn'

const chatters = (
  db: Db,
  helixClient: TwitchHelixClient
) => async (
  command: RawCommand,
  client: TwitchChatClient,
  target: string,
  context: TwitchChatContext,
  msg: string,
  ) => {
    const say = fn.sayFn(client, target)

    const streams = await helixClient.getStreams(context['room-id'])
    if (!streams || streams.data.length === 0) {
      say(`It seems this channel is not live at the moment...`)
      return
    }
    const stream = streams.data[0]

    const [whereSql, whereValues] = db._buildWhere({
      broadcaster_user_id: context['room-id'],
      created_at: { '$gte': stream.started_at },
    })
    const userNames = db._getMany(
      `select display_name from chat_log ${whereSql} group by user_name`,
      whereValues
    ).map(r => r.display_name)
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