import { User } from "../services/Users"
import { Bot, CommandExecutionContext, CommandFunction, MediaCommand, MediaCommandData } from "../types"
import fn from './../fn'
import { hash, logger } from './../common/fn'
import childProcess from 'child_process'
import fs from 'fs'
import config from "../config"

const log = logger('playMedia.ts')

const isTwitchClipUrl = (url: string): boolean => {
  return !!url.match(/^https:\/\/clips\.twitch\.tv\/.+/)
}

const downloadVideo = async (originalUrl: string): Promise<string> => {
  // if video url looks like a twitch clip url, dl it first
  const filename = `${hash(originalUrl)}-clip.mp4`
  const outfile = `./data/uploads/${filename}`
  if (!fs.existsSync(outfile)) {
    log.debug(`downloading the video to ${outfile}`)
    const child = childProcess.execFile(
      config.youtubeDlBinary,
      [originalUrl, '-o', outfile]
    )
    await new Promise((resolve) => {
      child.on('close', resolve)
    })
  } else {
    log.debug(`video exists at ${outfile}`)
  }
  return `/uploads/${filename}`
}

const prepareData = async (
  ctx: CommandExecutionContext,
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): Promise<MediaCommandData> => {
  const doReplaces = async (str: string) => {
    return await fn.doReplacements(str, ctx.rawCmd, ctx.context, originalCmd, bot, user)
  }
  const data = originalCmd.data
  data.image_url = await doReplaces(data.image_url)
  if (!data.video.url) {
    return data
  }

  log.debug(`video url is defined: ${data.video.url}`)
  data.video.url = await doReplaces(data.video.url)
  if (!data.video.url) {
    log.debug('no video url found')
  } else if (isTwitchClipUrl(data.video.url)) {
    // video url looks like a twitch clip url, dl it first
    log.debug(`twitch clip found: ${data.video.url}`)
    data.video.url = await downloadVideo(data.video.url)
  } else {
    // otherwise assume it is already a playable video url
    // TODO: youtube videos maybe should also be downloaded
    log.debug('video is assumed to be directly playable via html5 video element')
  }

  return data
}

const playMedia = (
  originalCmd: MediaCommand,
  bot: Bot,
  user: User,
): CommandFunction => async (ctx: CommandExecutionContext) => {
  bot.getWebSocketServer().notifyAll([user.id], 'general', {
    event: 'playmedia',
    data: await prepareData(ctx, originalCmd, bot, user),
    id: originalCmd.id
  })
}

export default playMedia
