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
    if (data.video.url) {
      log.debug(`clip is defined: ${data.video.url}`)
      data.video.url = await fn.doReplacements(data.video.url, command, context, originalCmd, bot, user)

      if (data.video.url) {
        // if video url looks like a twitch clip url, dl it first
        if (data.video.url.match(/^https:\/\/clips\.twitch\.tv\/.+/)) {
          log.debug(`twitch clip found: ${data.video.url}`)
          const filename = `${hash(data.video.url)}-clip.mp4`
          const outfile = `./data/uploads/${filename}`
          if (!fs.existsSync(outfile)) {
            log.debug(`downloading the clip to ${outfile}`)
            const child = childProcess.execFile(
              config.youtubeDlBinary,
              [data.video.url, '-o', outfile]
            )
            await new Promise((resolve) => {
              child.on('close', resolve)
            })
          } else {
            log.debug(`clip exists at ${outfile}`)
          }
          data.video.url = `/uploads/${filename}`
        } else {
          // else assume it is already a playable video url
          // TODO: youtube videos maybe should also be downloaded
          log.debug('clip is assumed to be directly playable via html5 video element')
        }
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
