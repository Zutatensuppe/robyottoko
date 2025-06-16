import { logger } from '../common/fn'
import { VideoService } from '../services/VideoService'
import type { MediaV2EffectData } from '../types'
import { Effect } from './Effect'

const log = logger('MediaV2Effect.ts')

export class MediaV2Effect extends Effect<MediaV2EffectData> {
  async apply(): Promise<void> {

    for (const item of this.effect.data.mediaItems) {
      if (item.type === 'image' && item.imageUrl) {
        item.imageUrl = await this.doReplacements(item.imageUrl)
      } else if (item.type === 'text' && item.text) {
        item.text = await this.doReplacements(item.text)
      } else if (item.type === 'video' && item.video.url) {
        item.video.url = await this.doReplacements(item.video.url)
        if (VideoService.isTwitchClipUrl(item.video.url)) {
          item.video.url = await VideoService.downloadVideo(item.video.url)
        }
      }
    }

    this.notifyWs('general', {
      event: 'playmediaV2',
      data: this.effect.data,
      id: this.originalCmd.id,
    })
  }
}
