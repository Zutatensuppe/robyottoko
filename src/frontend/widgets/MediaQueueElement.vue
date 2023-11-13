<template>
  <div
    :style="imgstyle"
    class="image-container"
    :class="{
      'm-fadeIn': showimage,
      'm-fadeOut': !showimage,
    }"
  />
  <div
    v-if="videosrc"
    class="video-container"
  >
    <div class="video-16-9">
      <video
        ref="videoEl"
        :src="videosrc"
        autoplay
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref } from 'vue'

import fn, { logger } from '../../common/fn'
import { MediaCommandData } from '../../types'

const log = logger('MediaQueueElement.vue')

const playSound = (path: string, volume: number): Promise<void> => {
  return new Promise((res) => {
    const audio = new Audio(path)
    audio.addEventListener('ended', () => {
      res()
    })
    audio.volume = fn.clamp(0, volume, 1)
    audio.play()
  })
}

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve1) => {
    setTimeout(resolve1, ms)
  })
}

const props = withDefaults(defineProps<{
  timeBetweenMediaMs?: number,
  baseVolume?: number,
  displayLatestForever?: boolean,
}>(), {
  timeBetweenMediaMs: 400,
  baseVolume: 100,
  displayLatestForever: false,
})


const queue = ref<MediaCommandData[]>([])
const worker = ref<any>(null)
const showimage = ref<boolean>(false)
const imgstyle = ref<undefined | Record<string, string>>(undefined)
const videosrc = ref<string>('')
const latestResolved = ref<boolean>(true)

const videoEl = ref<HTMLVideoElement | null>()

const _playone = async (media: MediaCommandData): Promise<void> => {
  return new Promise(async (resolve) => {
    latestResolved.value = false
    const promises: Promise<void>[] = []
    if (media.video.url) {
      videosrc.value = media.video.url
      promises.push(
        new Promise((res) => {
          nextTick(() => {
            if (!videoEl.value) {
              // should never happen
              return
            }
            // it should be always a HTMLVideoElement
            // because we set the videosrc. there could be some
            // conditions where this is not true but for now this
            // will be fine
            const volume = media.video.volume / 100
            videoEl.value.addEventListener('error', (e) => {
              log.error({ e }, 'error when playing video')
              res()
            })
            videoEl.value.volume = fn.clamp(0, volume, 1)
            videoEl.value.addEventListener('ended', () => {
              res()
            })
          })
        }),
      )
    }

    let imageUrl = ''
    if (media.image_url) {
      imageUrl = media.image_url
    } else if (media.image && media.image.file) {
      imageUrl = media.image.urlpath
    }
    if (imageUrl) {
      await _prepareImage(imageUrl)
      showimage.value = true
      imgstyle.value = { backgroundImage: `url(${imageUrl})` }
    }

    if (media.minDurationMs) {
      promises.push(wait(fn.parseHumanDuration(media.minDurationMs)))
    }

    if (media.sound && media.sound.file) {
      const path = media.sound.urlpath
      const maxVolume = props.baseVolume / 100.0
      const soundVolume = media.sound.volume / 100.0
      const volume = maxVolume * soundVolume
      promises.push(playSound(path, volume))
    }

    if (promises.length === 0) {
      // show images at least 1 sek by default (only if there
      // are no other conditions)
      promises.push(wait(1000))
    }

    Promise.all(promises).then((_) => {
      if (!props.displayLatestForever) {
        showimage.value = false
      }
      latestResolved.value = true
      videosrc.value = ''
      resolve()
    })
  })
}
const _addQueue = (media: MediaCommandData): void => {
  queue.value.push(media)
  if (worker.value) {
    return
  }

  const next = async (): Promise<void> => {
    if (queue.value.length === 0) {
      clearInterval(worker.value)
      worker.value = null
      return
    }
    const media = queue.value.shift()
    if (!media) {
      clearInterval(worker.value)
      worker.value = null
      return
    }
    await _playone(media)
    worker.value = setTimeout(next, props.timeBetweenMediaMs) // this much time in between media
  }
  worker.value = setTimeout(next, props.timeBetweenMediaMs)
}

const _prepareImage = async (urlpath: string): Promise<void> => {
  return new Promise((resolve) => {
    const imgLoad = new Image()
    imgLoad.src = urlpath
    nextTick(() => {
      if (imgLoad.complete) {
        resolve()
      } else {
        imgLoad.onload = () => {
          resolve()
        }
      }
    })
  })
}

const playmedia = (media: MediaCommandData): void => {
  if (!props.displayLatestForever && latestResolved.value) {
    showimage.value = false
  }
  _addQueue(media)
}

const removeMedia = (media: MediaCommandData): void => {
  queue.value = queue.value.filter(m => {
    if (m.image.urlpath && m.image.urlpath === media.image.urlpath) {
      return false
    }
    if (m.image_url && m.image_url === media.image_url) {
      return false
    }
    if (m.video.url && m.video.url === media.video.url) {
      return false
    }
    if (m.sound.urlpath && m.sound.urlpath === media.sound.urlpath) {
      return false
    }
    return true
  })

  const imageUrl = media.image.urlpath || media.image_url
  if (imageUrl) {
    if (showimage.value && imgstyle.value && imgstyle.value.backgroundImage === `url(${imageUrl})`) {
      showimage.value = false
      imgstyle.value = undefined
    }
  }
  if (videosrc.value && media.video.url === videosrc.value) {
    videosrc.value = ''
  }
}

const hasQueuedMedia = (): boolean => {
  return queue.value.length > 0
}

defineExpose({
  playmedia,
  removeMedia,
  hasQueuedMedia,
})
</script>
<style scoped lang="scss">
.m-fadeOut {
  visibility: hidden;
  opacity: 0;
  transition: all 300ms;
}

.m-fadeIn {
  visibility: visible;
  opacity: 1;
  transition: all 300ms;
}

.image-container {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  height: 100%;
}

.video-container {
  top: 0;
  left: 0;
  position: absolute;
  width: 100%;
  height: 100%;

  .video-16-9 {
    position: relative;
    padding-top: 56.25%;
    width: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    video {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
  }
}
</style>
