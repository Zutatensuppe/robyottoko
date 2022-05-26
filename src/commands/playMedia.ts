import { User } from "../services/Users"
import { Bot, CommandFunction, MediaCommand, RawCommand, TwitchChatClient, TwitchChatContext } from "../types"
import fn from './../fn'
import { hash, logger } from './../common/fn'
import childProcess from 'child_process'
import fs from 'fs'
import config from "../config"

const log = logger('playMedia.ts')

const playMedia = (
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (
  command: RawCommand | null,
  _client: TwitchChatClient | null,
  _target: string | null,
  context: TwitchChatContext | null,
  ) => {
    const data = originalCmd.data
    data.image_url = await fn.doReplacements(data.image_url, command, context, originalCmd, bot, user)
    if (data.twitch_clip.url) {
      log.debug(`clip is defined: ${data.twitch_clip.url}`)
      data.twitch_clip.url = await fn.doReplacements(data.twitch_clip.url, command, context, originalCmd, bot, user)

      if (data.twitch_clip.url) {
        log.debug(`clip found: ${data.twitch_clip.url}`)
        const filename = `${hash(data.twitch_clip.url)}-clip.mp4`
        const outfile = `./data/uploads/${filename}`
        if (!fs.existsSync(outfile)) {
          log.debug(`downloading the clip to ${outfile}`)
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
          log.debug(`clip exists at ${outfile}`)
        }
        data.twitch_clip.url = `/uploads/${filename}`
      } else {
        log.debug('no clip found')
      }
    }

    bot.getWebSocketServer().notifyAll([user.id], 'general', {
      event: 'playmedia',
      data: data,
      id: originalCmd.id
    })
  }

export default playMedia
