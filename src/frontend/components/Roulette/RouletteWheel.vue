<template>
  <div class="wheel">
    <div class="marker">
      <img
        v-if="theme.markerImage"
        :src="theme.markerImage"
      >
    </div>
    <div class="center-reflection-image">
      <img
        v-if="theme.centerReflectionImage"
        :src="theme.centerReflectionImage"
      >
    </div>
    <div class="center-shadow-image">
      <img
        v-if="theme.centerShadowImage"
        :src="theme.centerShadowImage"
      >
    </div>
    <div class="moving-parts moving-parts-top">
      <img
        v-if="theme.centerImage"
        class="center-image"
        :src="theme.centerImage"
      >
    </div>
    <div class="moving-parts moving-parts-bottom">
      <img
        v-if="theme.centerRingImage"
        class="center-ring-image"
        :src="theme.centerRingImage"
      >
      <img
        v-if="theme.outerImage"
        class="outer-image"
        :src="theme.outerImage"
      >
      <canvas
        ref="canvas"
        class="wheel-canvas"
        width="1024"
        height="1024"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, Ref, watch } from 'vue'
import type { RouletteCommandData } from '../../../types'
import { RouletteWheel, WheelTheme } from './Wheel'
import gsap, { Power4 } from 'gsap'
import themes from './themes'
import { parseHumanDuration } from '../../../common/fn'

const props = defineProps<{
  data: RouletteCommandData,
  autostart: boolean,
}>()

const canvas = ref<HTMLCanvasElement>() as Ref<HTMLCanvasElement>

const emit = defineEmits<{
  (e: 'started'): void
  (e: 'ended', winner: string): void
  (e: 'close'): void
}>()

const theme = computed<WheelTheme>(() => {
  if (
    props.data.theme === 'default' ||
    props.data.theme === 'trickOrTreat' ||
    props.data.theme === 'achanJp' ||
    props.data.theme === 'achanJpSub'
  ) {
    return themes[props.data.theme]
  }
  return themes.default
})

let wheel: RouletteWheel
const init = () => {
  const items = props.data.entries
    .filter(e => !e.disabled)
    .map(e => ({
      bias: e.weight,
      color: e.color,
      title: e.text,
    }))
  wheel = new RouletteWheel(canvas.value, items)
}

const spin = () => {
  emit('started')
  const spinDurationMs = parseHumanDuration(props.data.spinDurationMs) || 15000
  const winnerDisplayDurationMs = parseHumanDuration(props.data.winnerDisplayDurationMs) || 5000
  const result = wheel.spin()
  gsap.to('.moving-parts', {
    rotation: 0,
    duration: 0,
  })
  gsap.to('.moving-parts', {
    rotation: -result.rotation - (360 * 3),
    duration: spinDurationMs / 1000,
    ease: Power4.easeOut,
    onComplete: () => {
      emit('ended', result.winner.title)
      setTimeout(() => {
        emit('close')
      }, winnerDisplayDurationMs)
    },
  })
}

onMounted(() => {
  init()
  if (props.autostart) {
    spin()
  }
})
watch(() => props.data, () => {
  init()
  if (props.autostart) {
    spin()
  }
}, { deep: true })
</script>

<style lang="scss">
.wheel {
  position: relative;
  aspect-ratio: 1;

  .marker {
    width: 125px;
    position: absolute;
    z-index: 20;
    right: -25px;
    top: 50%;
    transform: translate(20px, -50%);

    img {
      width: 100%;
      display: block;
    }
  }

  .wheel-canvas {
    position: absolute;
    width: 98%;
    height: 98%;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
  }

  .center-image {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 30%;
    z-index: 10;
  }

  .center-ring-image {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 30%;
    z-index: 8;
  }

  .center-shadow-image {
    position: absolute;
    left: 50%;
    top: 65%;
    width: 30%;
    z-index: 9;

    img {
      width: 100%;
      transform: translate(-50%, -50%);
      opacity: 0.5;
      display: block;
    }
  }

  .outer-image {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    z-index: 9;
  }

  .center-reflection-image {
    z-index: 15;
    position: absolute;
    left: 50%;
    top: 50%;
    width: 30%;

    img {
      width: 100%;
      transform: translate(-50%, -50%);
      display: block;
    }
  }

  .moving-parts {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .moving-parts-bottom {
    z-index: 5;
  }
  .moving-parts-top {
    z-index: 10;
  }
}
</style>
