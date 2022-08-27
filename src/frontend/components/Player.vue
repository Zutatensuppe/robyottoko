<template>
  <span
    v-if="src"
    class="player"
    @click="toggle"
  >{{ name }} <i
    class="fa ml-1"
    :class="cls"
  /></span>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

const props = defineProps({
  src: String,
  name: String,
  volume: { required: true },
  baseVolume: { default: 100 },
})

const audio = ref<HTMLAudioElement | null>(null)
const playing = ref<boolean>(false)

const cls = computed(() => playing.value ? "fa-stop" : "fa-play")

const toggle = (): void => {
  if (!audio.value) {
    return
  }
  if (playing.value) {
    audio.value.pause()
    audio.value.currentTime = 0
  } else {
    const maxVolume = parseInt(`${props.baseVolume}`, 10) / 100.0
    const soundVolume = parseInt(`${props.volume}`, 10) / 100.0
    audio.value.volume = maxVolume * soundVolume
    audio.value.play()
  }
  playing.value = !playing.value
}

const load = (): void => {
  if (audio.value) {
    audio.value.pause()
    audio.value = null
  }
  audio.value = new Audio(props.src)
  audio.value.addEventListener("ended", () => {
    playing.value = false
  })
  playing.value = false
}

onMounted(() => {
  load()
  watch(() => props.src, () => {
    load()
  })
})
</script>
