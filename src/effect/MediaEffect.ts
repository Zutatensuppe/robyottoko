import { logger } from '../common/fn'
import type { MediaEffectData } from '../types'
import { Effect } from './Effect'
import { VideoService } from '../services/VideoService'

const log = logger('MediaEffect.ts')

export class MediaEffect extends Effect<MediaEffectData> {
  async apply(): Promise<void> {
    this.effect.data.image_url = await this.doReplacements(this.effect.data.image_url)
    if (this.effect.data.video.url) {
      log.debug({ url: this.effect.data.video.url }, 'video url is defined')
      this.effect.data.video.url = await this.doReplacements(this.effect.data.video.url)
      if (!this.effect.data.video.url) {
        log.debug('no video url found')
      } else if (VideoService.isTwitchClipUrl(this.effect.data.video.url)) {
        // video url looks like a twitch clip url, dl it first
        log.debug({ url: this.effect.data.video.url }, 'twitch clip found')
        this.effect.data.video.url = await VideoService.downloadVideo(this.effect.data.video.url)
      } else {
        // otherwise assume it is already a playable video url
        // TODO: youtube videos maybe should also be downloaded
        log.debug('video is assumed to be directly playable via html5 video element')
      }
    }

    this.notifyWs('general', {
      event: 'playmedia',
      data: this.effect.data,
      id: this.originalCmd.id,
    })
  }
}
