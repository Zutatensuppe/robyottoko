<template>
  <div v-if="val">
    <div
      v-for="(item, idx) in val.mediaItems" :key="idx"
      :class="['media-item', `media-item-${item.type}`]"
      :style="itemStyle(item, val.mediaItems.length - idx)"
    >
      <div
        v-if="item.type === 'image' && (item.image?.urlpath || item.imageUrl)"
        :style="itemInnerStyle(item)"
        class="image-container"
      />
      <div
        v-if="item.type === 'video' && item.video.url"
        :style="itemInnerStyle(item)"
        class="video-container"
      >
        <div class="video-16-9">
          <video
            autoplay
            muted
            playsinline
            preload="auto"
            :src="item.video.url"
            :ref="el => setVideoRef(el as HTMLVideoElement, idx)"
          />
        </div>
      </div>
      <div
        v-if="item.type === 'text' && item.text"
        :style="itemInnerStyle(item)"
        class="text-container"
        :ref="el => setTextRef((el as HTMLElement)?.parentElement, idx)"
      >
        <span class="text-span">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, ref, StyleValue } from 'vue'

import fn, { logger } from '../../common/fn'
import { MediaV2CommandData, MediaV2CommandDataItem } from '../../types'

const log = logger('MediaV2QueueElement.vue')

const itemStyle = (item: MediaV2CommandDataItem, zIndex: number): StyleValue => {
  if (item.type === 'sound') {
    return { display: 'none' }
  }
  const style: StyleValue = {
    position: 'absolute',
    left: `${item.rectangle.x * 100}%`,
    top: `${item.rectangle.y * 100}%`,
    width: `${item.rectangle.width * 100}%`,
    height: `${item.rectangle.height * 100}%`,
    transform: `rotate(${item.rotation || 0}deg)`,
    transformOrigin: 'center center',
    zIndex,
  }
  if (item.type === 'image') {
    const maskImage = item.maskImage?.urlpath || item.maskImageUrl ? `url(${item.maskImage?.urlpath || item.maskImageUrl})` : ''
    if (maskImage) {
      style.maskImage = maskImage
      style.maskSize = 'contain'
      style.maskRepeat = 'no-repeat'
      style.maskPosition = 'center'
    }
  }
  return style
}

const itemInnerStyle = (item: MediaV2CommandDataItem): StyleValue => {
  const style: StyleValue =  {
  }

  if (item.type === 'image') {
    style.backgroundImage = `url(${item.image?.urlpath || item.imageUrl})`
  }

  if (item.type === 'text') {
    const shadows: string[] = [];
    const outlineWidth = item.outlineWidth || 0
    if (outlineWidth) {
      for (let dx = -outlineWidth; dx <= outlineWidth; dx++) {
        for (let dy = -outlineWidth; dy <= outlineWidth; dy++) {
          if (dx === 0 && dy === 0) {
            continue
          }
          shadows.push(`${dx}px ${dy}px 0 ${item.outline || 'black'}`)
        }
      }
      style.textShadow = shadows.join(', ')
    }
    if (item.color) {
      style.color = item.color
    }
    if (item.font) {
      style.fontFamily = item.font
    }
    if  (item.bold) {
      style.fontWeight = 'bold'
    }
    if (item.italic) {
      style.fontStyle = 'italic'
    }
  }

  return style
}

const textRefs = ref<HTMLElement[]>([])
const setTextRef = (el: HTMLElement | null, idx: number) => {
  if (el) textRefs.value[idx] = el
}

const videoRefs = ref<HTMLVideoElement[]>([])
const setVideoRef = (el: HTMLVideoElement | null, idx: number) => {
  if (el) videoRefs.value[idx] = el
}

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
}>(), {
  timeBetweenMediaMs: 400,
  baseVolume: 100,
})

const queue = ref<MediaV2CommandData[]>([])
const worker = ref<any>(null)
const latestResolved = ref<boolean>(true)

const val = ref<MediaV2CommandData | null>(null)

const fitTextToContainer = (el: HTMLElement) => {
  const span = el.querySelector('.text-span') as HTMLElement
  if (!span) return

  const containerWidth = el.clientWidth
  const containerHeight = el.clientHeight
  const textLength = span.textContent?.length || 1

  // Estimate a good starting point
  const estimatedSize = Math.sqrt((containerWidth * containerHeight) / textLength)
  let low = 4
  let high = estimatedSize * 2
  let bestFit = low

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    span.style.fontSize = `${mid}px`

    const fitsWidth = span.scrollWidth <= containerWidth
    const fitsHeight = span.scrollHeight <= containerHeight

    if (fitsWidth && fitsHeight) {
      bestFit = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  span.style.fontSize = `${bestFit}px`
}


const _playone = async (media: MediaV2CommandData): Promise<void> => {
  return new Promise(async (resolve) => {
    latestResolved.value = false

    const preloadPromises: Promise<void>[] = []
    // try to preload all data (images, videos, sounds)
    for (const item of media.mediaItems) {
      if (item.type === 'image') {
        const imageUrl = item.image?.urlpath || item.imageUrl
        if (!imageUrl) {
          continue
        }
        preloadPromises.push(_prepareImage(imageUrl))
      } else if (item.type === 'video' && item.video?.url) {
        preloadPromises.push(_prepareVideo(item.video.url))
      } else if (item.type === 'sound' && item.sound?.file) {
        preloadPromises.push(_prepareSound(item.sound.urlpath))
      }
    }

    await Promise.all(preloadPromises)

    // Render the media items
    val.value = media
    await nextTick() // ensure DOM is updated

    textRefs.value.forEach((el) => {
      if (el) fitTextToContainer(el)
    })

    const playPromises: Promise<void>[] = []

    for (const [idx, item] of media.mediaItems.entries()) {
      if (item.type === 'sound' && item.sound?.urlpath) {
        playPromises.push(playSound(item.sound.urlpath, props.baseVolume / 100))
      } else if (item.type === 'video' && item.video?.url) {
        const video = videoRefs.value[idx]
        if (video) {
          playPromises.push(new Promise<void>((res) => {
            let resolved = false

            const onEnd = () => {
              if (resolved) return
              resolved = true
              video.style.display = 'none'
              cleanup()
              res()
            }

            const onError = () => {
              if (resolved) return
              resolved = true

              console.warn('Video error, resolving to continue')
              cleanup()
              res()
            }

            const cleanup = () => {
              video.removeEventListener('ended', onEnd)
              video.removeEventListener('error', onError)
              clearTimeout(timeout)
            }

            video.addEventListener('ended', onEnd)
            video.addEventListener('error', onError)

            // Fallback timeout to avoid hanging
            const timeout = setTimeout(() => {
              console.warn('Video timeout fallback triggered')
              onEnd()
            }, 30000)

            // In case video already ended
            if (video.ended) {
              onEnd()
            }
          }))
        }
      }
    }

    // Wait for either minDurationMs or all items
    const waitTime = media.minDurationMs ? fn.parseHumanDuration(media.minDurationMs) : 1000
    playPromises.push(wait(waitTime))

    await Promise.all(playPromises)
    val.value = null
    resolve()
  })
}
const _addQueue = (media: MediaV2CommandData): void => {
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

const _prepareImage = async (url: string): Promise<void> => {
  return new Promise((resolve) => {
    const imgLoad = new Image()
    imgLoad.src = url
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

const _prepareSound = async (_url: string): Promise<void> => {
  // nothing to do
}

const _prepareVideo = async (url: string): Promise<void> => {
  // nothign to do
}

const playmedia = (media: MediaV2CommandData): void => {
  _addQueue(media)
}

defineExpose({
  playmedia,
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

.text-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
}

.video-container {
  top: 0;
  left: 0;
  position: absolute;
  width: 100%;
  height: 100%;

  .video-16-9 {
    aspect-ratio: 16/9;
    width: 100%;
    height: 100%;
    position: relative;

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
