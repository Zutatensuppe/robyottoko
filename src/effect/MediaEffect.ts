import { hash, logger } from '../common/fn'
import { MediaEffectData } from '../types'
import { Effect } from './Effect'
import childProcess from 'child_process'
import fs from 'fs'
import config from '../config'

const log = logger('MediaEffect.ts')

const isTwitchClipUrl = (url: string): boolean => {
  return !!url.match(/^https:\/\/clips\.twitch\.tv\/.+/)
}

const downloadVideo = async (originalUrl: string): Promise<string> => {
  // if video url looks like a twitch clip url, dl it first
  const filename = `${hash(originalUrl)}-clip.mp4`
  const outfile = `./data/uploads/${filename}`
  if (!fs.existsSync(outfile)) {
    log.debug({ outfile }, 'downloading the video')
    const child = childProcess.execFile(
      config.youtubeDlBinary,
      [originalUrl, '-o', outfile]
    )
    await new Promise((resolve) => {
      child.on('close', resolve)
    })
  } else {
    log.debug({ outfile }, 'video exists')
  }
  return `/uploads/${filename}`
}

export class MediaEffect extends Effect<MediaEffectData> {
  async apply(): Promise<void> {
    this.effect.data.image_url = await this.doReplacements(this.effect.data.image_url)
    if (this.effect.data.video.url) {
      log.debug({ url: this.effect.data.video.url }, 'video url is defined')
      this.effect.data.video.url = await this.doReplacements(this.effect.data.video.url)
      if (!this.effect.data.video.url) {
        log.debug('no video url found')
      } else if (isTwitchClipUrl(this.effect.data.video.url)) {
        // video url looks like a twitch clip url, dl it first
        log.debug({ url: this.effect.data.video.url }, 'twitch clip found')
        this.effect.data.video.url = await downloadVideo(this.effect.data.video.url)
      } else {
        // otherwise assume it is already a playable video url
        // TODO: youtube videos maybe should also be downloaded
        log.debug('video is assumed to be directly playable via html5 video element')
      }
    }

    this.notifyWs('general', {
      event: 'playmedia',
      data: this.effect.data,
      id: this.originalCmd.id
    })
  }
}
