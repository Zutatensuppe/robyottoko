<template>
  <div
    class="wrapper"
    :class="classes"
  >
    <div class="player video-16-9">
      <ResponsiveImage
        v-if="hidevideo && settings.hideVideoImage.file"
        class="hide-video"
        :src="settings.hideVideoImage.urlpath"
      />
      <div
        v-else-if="hidevideo"
        class="hide-video"
      />
      <div
        v-if="preset.showProgressBar"
        class="progress"
      >
        <div
          class="progress-value"
          :style="progressValueStyle"
        />
      </div>
      <Youtube
        ref="player"
        @ended="ended"
      />
    </div>
    <ol class="list">
      <ListItem
        v-for="(tmpItem, idx) in playlistItems"
        :key="idx"
        :class="idx === 0 ? 'playing' : 'not-playing'"
        :item="tmpItem"
        :show-thumbnails="preset.showThumbnails"
        :timestamp-format="preset.timestampFormat"
      />
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, Ref, ref, watch } from "vue"
import { logger } from "../../../common/fn"
import { PlaylistItem } from "../../../types"
import ListItem from "./components/ListItem.vue"
import ResponsiveImage from './../../components/ResponsiveImage.vue'
import util, { WidgetApiData } from "../util"
import WsClient from "../../WsClient"
import Youtube, { YoutubeInstance } from "../../components/YoutubePlayer.vue"
import {
  default_custom_css_preset,
  default_settings,
  SongrequestModuleCustomCssPreset,
  SongRequestModuleFilter,
  SongrequestModuleSettings,
} from "../../../mod/modules/SongrequestModuleCommon"

import("./main.scss")

const log = logger('Page.vue')

const props = defineProps<{
  wdata: WidgetApiData,
}>()

let ws: WsClient | null = null

const player = ref<YoutubeInstance>() as Ref<YoutubeInstance>
const filter = ref<SongRequestModuleFilter>({ tag: "" })
const hasPlayed = ref<boolean>(false)
const playlist = ref<PlaylistItem[]>([])
const settings = ref<SongrequestModuleSettings>(default_settings())
const progress = ref<number>(0)
const inited = ref<boolean>(false)

const preset = computed((): SongrequestModuleCustomCssPreset => {
  return settings.value.customCssPresets[settings.value.customCssPresetIdx] || default_custom_css_preset()
})

const thumbnailClass = computed((): string => {
  if (preset.value.showThumbnails === "left") {
    return "with-thumbnails-left"
  }
  if (preset.value.showThumbnails === "right") {
    return "with-thumbnails-right"
  }
  return "without-thumbnails"
})

const progressBarClass = computed((): string => {
  return preset.value.showProgressBar
    ? "with-progress-bar"
    : "without-progress-bar"
})

const classes = computed((): string[] => {
  return [thumbnailClass.value, progressBarClass.value]
})

const progressValueStyle = computed((): { width: string } => {
  return {
    width: `${progress.value * 100}%`,
  }
})

const playlistItems = computed((): PlaylistItem[] => {
  return playlist.value.filter((item, idx) => !isFilteredOut(item, idx))
})

const filteredPlaylist = computed((): PlaylistItem[] => {
  if (filter.value.tag === "") {
    return playlist.value
  }
  return playlist.value.filter((item: PlaylistItem) =>
    item.tags.includes(filter.value.tag)
  )
})

const hidevideo = computed((): boolean => {
  return item.value ? !!item.value.hidevideo : false
})

const item = computed((): PlaylistItem | null => {
  if (filteredPlaylist.value.length === 0) {
    return null
  }
  return filteredPlaylist.value[0]
})

const isFilteredOut = (item: PlaylistItem, idx: number): boolean => {
  if (
    preset.value.maxItemsShown >= 0 &&
    preset.value.maxItemsShown - 1 < idx
  ) {
    return true
  }
  return filter.value.tag !== "" && !item.tags.includes(filter.value.tag)
}
const ended = (): void => {
  sendMsg({ event: "ended" })
}

const sendMsg = (data: { event: string, id?: number }): void => {
  if (!ws) {
    log.error('sendMsg, ws not defined')
    return
  }
  ws.send(JSON.stringify(data))
}

const play = (): void => {
  hasPlayed.value = true
  adjustVolume()
  if (item.value) {
    player.value.play(item.value.yt)
    sendMsg({ event: "play", id: item.value.id })
  }
}

const unpause = (): void => {
  if (item.value) {
    player.value.unpause()
    sendMsg({ event: "unpause", id: item.value.id })
  }
}

const pause = (): void => {
  if (item.value) {
    player.value.pause()
    sendMsg({ event: "pause" })
  }
}

const adjustVolume = (): void => {
  player.value.setVolume(settings.value.volume)
}

const updateProgress = () => {
  progress.value = player.value.getProgress()
  if (preset.value.showProgressBar) {
    requestAnimationFrame(updateProgress)
  }
}

const currentId = (playlist: PlaylistItem[]): number | null => {
  return playlist.length > 0 ? playlist[0].id : null
}

const applySettings = (newSettings: SongrequestModuleSettings): void => {
  const newPreset = newSettings.customCssPresets[newSettings.customCssPresetIdx] || default_custom_css_preset()
  if (preset.value.css !== newPreset.css) {
    let el = document.getElementById("customCss")
    if (el && el.parentElement) {
      el.parentElement.removeChild(el)
    }
    el = document.createElement("style")
    el.id = "customCss"
    el.textContent = newPreset.css
    document.head.appendChild(el)
  }
  if (preset.value.showProgressBar !== newPreset.showProgressBar) {
    if (newPreset.showProgressBar) {
      requestAnimationFrame(updateProgress)
    }
  }
  settings.value = newSettings
  adjustVolume()
}

onMounted(() => {
  ws = util.wsClient(props.wdata)
  ws.onMessage(["save", "settings"], (data) => {
    applySettings(data.settings)
  })
  ws.onMessage(
    ["onEnded", "prev", "skip", "remove", "move", "tags"],
    (data) => {
      applySettings(data.settings)
      const oldId = currentId(filteredPlaylist.value)
      filter.value = data.filter
      playlist.value = data.playlist
      const newId = currentId(filteredPlaylist.value)
      if (oldId !== newId) {
        play()
      }
    }
  )
  ws.onMessage(["filter"], (data) => {
    applySettings(data.settings)
    const oldId = currentId(filteredPlaylist.value)
    filter.value = data.filter
    playlist.value = data.playlist
    // play only if old id is not in new playlist
    if (!filteredPlaylist.value.find((item) => item.id === oldId)) {
      play()
    }
  })
  ws.onMessage(["pause"], (_data) => {
    if (player.value.playing()) {
      pause()
    }
  })
  ws.onMessage(["unpause"], (_data) => {
    if (!player.value.playing()) {
      if (hasPlayed.value) {
        unpause()
      } else {
        play()
      }
    }
  })
  ws.onMessage(["loop"], (_data) => {
    player.value.setLoop(true)
  })
  ws.onMessage(["noloop"], (_data) => {
    player.value.setLoop(false)
  })
  ws.onMessage(["stats", "video", "playIdx", "shuffle"], (data) => {
    applySettings(data.settings)
    filter.value = data.filter
    playlist.value = data.playlist
  })
  ws.onMessage(["add", "init"], (data) => {
    applySettings(data.settings)
    filter.value = data.filter
    playlist.value = data.playlist
    if (!inited.value && !player.value.playing()) {
      if (settings.value.initAutoplay) {
        play()
      }
    }
    inited.value = true
  })
  ws.connect()
})

onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})

watch(playlist, (newVal) => {
  if (!newVal.some((item: PlaylistItem, idx: number) => !isFilteredOut(item, idx))) {
    console.log('stopping player')
    player.value.stop()
  }
})

watch(filter, () => {
  if (!playlist.value.some((item: PlaylistItem, idx: number) => !isFilteredOut(item, idx))) {
    console.log('stopping player')
    player.value.stop()
  }
})
</script>
