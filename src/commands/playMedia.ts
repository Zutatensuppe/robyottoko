import { User } from "../services/Users"
import { Bot, CommandFunction, MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"
import fn from './../fn'
import { hash } from './../common/fn'
import childProcess from 'child_process'
import fs from 'fs'
import config from "../config"

const playMedia = (
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  _client: TwitchChatClient | null,
  _target: string | null,
  context: TwitchChatContext | null,
  _msg: string | null,
  ) => {
    const data = originalCmd.data

    const variables = bot.getUserVariables(user)
    data.image_url = await fn.doReplacements(data.image_url, command, context, variables, originalCmd, bot, user)
    data.twitch_clip.url = await fn.doReplacements(data.twitch_clip.url, command, context, variables, originalCmd, bot, user)

    if (data.twitch_clip.url) {
      const filename = `${hash(data.twitch_clip.url)}-clip.mp4`
      const outfile = `./data/uploads/${filename}`
      if (!fs.existsSync(outfile)) {
        console.log(`downloading the clip to ${outfile}`)
        const child = childProcess.execFile(
          config.youtubeDlBinary,
          [
            data.twitch_clip.url,
            '-o',
            outfile,
          ]
        )
        await new Promise((resolve) => {
          child.on('close', resolve)
        })
      } else {
        console.log(`clip exists at ${outfile}`)
      }
      data.twitch_clip.url = `/uploads/${filename}`
    }

    bot.getWebSocketServer().notifyAll([user.id], 'general', {
      event: 'playmedia',
      data: data,
    })
  }

export default playMedia
