<template>
  <div :id="id" />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { logger } from '../../common/fn'

const log = logger('YoutubePlayer.vue')

interface YoutubePlayer {
  cueVideoById: (youtubeId: string) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  pauseVideo: () => void
  playVideo: () => void
  stopVideo: () => void
  setVolume: (volume: number) => void
  addEventListener: (event: string, callback: (event: any) => void) => void
}

let apiRdy = false
function createApi(): Promise<void> {
  if (apiRdy) {
    log.info('ytapi ALREADY ready')
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.append(tag)
    // a callback function on window is required by youtube
    // https://developers.google.com/youtube/iframe_api_reference
    // @ts-ignore
    window.onYouTubeIframeAPIReady = () => {
      apiRdy = true
      log.info('ytapi ready')
      resolve()
    }
  })
}

function createPlayer(id: string): Promise<YoutubePlayer> {
  return new Promise((resolve) => {
    log.info('create player on ' + id)
    // no knowledge about YT.Player :(
    // @ts-ignore
    const player: YoutubePlayer = new YT.Player(id, {
      playerVars: {
        iv_load_policy: 3, // do not load annotations
        modestbranding: 1, // remove youtube logo
      },
      events: {
        onReady: () => {
          log.info('player ready')
          resolve(player)
        },
      },
    })
  })
}

async function prepareYt(id: string): Promise<YoutubePlayer> {
  await createApi()
  return await createPlayer(id)
}

const props = withDefaults(defineProps<{
  visible?: boolean
}>(), {
  visible: true,
})

const emit = defineEmits<{
  (e: 'ended'): void
}>()

const id = `yt-${Math.floor(
  Math.random() * 99 + 1,
)}-${new Date().getTime()}`

const yt = ref<YoutubePlayer | null>(null)
const loop = ref<boolean>(false)
const toplay = ref<string | null>(null)
const tovolume = ref<number | null>(null)
const tryPlayInterval = ref<any | null>(null)
const stopped = ref<boolean>(false)

const getDuration = (): number => {
  if (yt.value) {
    return yt.value.getDuration()
  }
  return 0
}
const getCurrentTime = (): number => {
  if (yt.value) {
    return yt.value.getCurrentTime()
  }
  return 0
}
const getProgress = (): number => {
  const d = getDuration()
  const c = getCurrentTime()
  return d ? c / d : 0
}
const stop = (): void => {
  stopped.value = true
  stopTryPlayInterval()
  if (yt.value) {
    yt.value.stopVideo()
  }
}
const stopTryPlayInterval = (): void => {
  if (tryPlayInterval.value) {
    clearInterval(tryPlayInterval.value)
    tryPlayInterval.value = null
  }
}
const tryPlay = (): void => {
  if (stopped.value) {
    return
  }
  stopTryPlayInterval()
  if (!props.visible) {
    return
  }
  if (yt.value) {
    yt.value.playVideo()
  }

  let triesRemaining = 20
  tryPlayInterval.value = setInterval(() => {
    log.info({ playing: playing(), triesRemaining })
    --triesRemaining
    if (playing() || triesRemaining < 0) {
      log.info('stopping interval')
      stopTryPlayInterval()
      return
    }
    if (yt.value) {
      yt.value.playVideo()
    }
  }, 250)
}
const play = (newYt: string): void => {
  stopped.value = false
  if (!yt.value) {
    toplay.value = newYt
  } else {
    yt.value.cueVideoById(newYt)
    tryPlay()
  }
}
const pause = (): void => {
  if (yt.value) {
    yt.value.pauseVideo()
  }
}
const unpause = (): void => {
  stopped.value = false
  if (yt.value) {
    tryPlay()
  }
}
const setVolume = (volume: number): void => {
  if (!yt.value) {
    tovolume.value = volume
  } else {
    yt.value.setVolume(volume)
  }
}
const setLoop = (newLoop: boolean): void => {
  loop.value = newLoop
}
const playing = (): boolean => {
  if (!yt.value) {
    return false
  }
  return yt.value.getPlayerState() === 1
}

onMounted(async () => {
  yt.value = await prepareYt(id)

  if (tovolume.value !== null) {
    yt.value.setVolume(tovolume.value)
  }
  if (toplay.value !== null) {
    log.info('trying to play..')
    play(toplay.value)
  }
  yt.value.addEventListener('onStateChange', (event) => {
    // no knowledge about YT.PlayerState :(
    // @ts-ignore
    if (event.data === YT.PlayerState.CUED) {
      tryPlay()
      // no knowledge about YT.PlayerState :(
      // @ts-ignore
    } else if (event.data === YT.PlayerState.ENDED) {
      if (loop.value) {
        tryPlay()
      } else {
        emit('ended')
      }
    }
  })
})

defineExpose({
  stop,
  play,
  pause,
  unpause,
  setVolume,
  setLoop,
  playing,
  getProgress,
})
</script>
