<template>
  <div class="emote-wall">
    <img
      v-for="(emote,idx) in activeEmotes"
      :key="idx"
      :src="emote.url"
      class="emote"
      :style="{top: `${emote.y}px`, left: `${emote.x}px`, width: emote.w + 'px', height: emote.h + 'px', transform: `rotate(${emote.rot}deg)`}"
    >
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  default_settings,
  EMOTE_DISPLAY_FN,
  GeneralModuleEmotesEventData,
  GeneralModuleSettings,
  GeneralModuleWsEventData,
} from "../../../mod/modules/GeneralModuleCommon";
import util, { WidgetApiData } from "../util";
import WsClient from "../../WsClient";
import { getRandom, getRandomFloat, getRandomInt, logger } from "../../../common/fn";
const log = logger('emote_wall/Page.vue')

import("./main.scss");

let ws: WsClient | null = null

const props = defineProps<{
  wdata: WidgetApiData,
}>();

const settings = ref<GeneralModuleSettings>(default_settings())

interface Emote {
  url: string,
  x: number,
  y: number,
  h: number,
  w: number,
  rot: number,
  active: boolean,
  dead: boolean,
  update: () => void,
}

type EmoteFn = (img: HTMLImageElement, args: string[]) => Emote

const emotes = ref<Emote[]>([])

const activeEmotes = computed(() => {
  return emotes.value.filter(e => e.active)
})

const DEFAULT_EMOTE_SIZE = 64

const raf = window.requestAnimationFrame

const frame = () => {
  // update all emotes
  for (const emote of emotes.value) {
    emote.update()
  }
  emotes.value = emotes.value.filter(e => !e.dead)

  // next frame
  raf(frame)
}

raf(frame)

interface Point {
  x: number
  y: number
}

const bezier = (t: number, p0: Point, p1: Point, p2: Point, p3: Point) => {
  const cX = 3 * (p1.x - p0.x),
    bX = 3 * (p2.x - p1.x) - cX,
    aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y),
    bY = 3 * (p2.y - p1.y) - cY,
    aY = p3.y - p0.y - cY - bY;

  const x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  const y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

  return { x: x, y: y };
}

const easeInOutSine = (x: number): number => {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

const TO_LEFT = -1
const TO_RIGHT = 1
const TO_UP = -1
const TO_DOWN = 1
const BACKWARD = -1
const FORWARD = 1

const randomX = (): number => getRandomInt(0, window.innerWidth)
const centerX = (): number => window.innerWidth / 2
const centerY = (): number => window.innerHeight / 2
const randomY = (): number => getRandomInt(0, window.innerHeight)
const floor = (): number => window.innerHeight
const right = (): number => window.innerWidth

const isOffScreenLeft = (emote: Emote): boolean => emote.x + emote.w <= 0
const isOffScreenRight = (emote: Emote): boolean => emote.x > window.innerWidth
const isOffScreenTop = (emote: Emote): boolean => emote.y + emote.h <= 0
const isOffScreenBottom = (emote: Emote): boolean => emote.y > window.innerHeight
const isOffScreen = (emote: Emote): boolean => isOffScreenLeft(emote) || isOffScreenRight(emote) || isOffScreenTop(emote) || isOffScreenBottom(emote)
const isAtCeiling = (emote: Emote): boolean => emote.y <= 0
const isAtFloor = (emote: Emote): boolean => emote.y + emote.h >= floor()

const randomBezierEmote: EmoteFn = (img: HTMLImageElement) => {
  const p0 = { x: randomX(), y: randomY() }
  const p1 = { x: randomX(), y: randomY() }
  const p2 = { x: randomX(), y: randomY() }
  const p3 = { x: randomX(), y: randomY() }

  const delayTicks = getRandomInt(0, 50)
  let tick = 0
  let t = 0

  const emoteW = DEFAULT_EMOTE_SIZE
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: -emoteW,
    y: -emoteH,
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: true,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      t += .005
      const p = bezier(easeInOutSine(t), p0, p1, p2, p3)
      this.x = p.x
      this.y = p.y
      this.w = easeInOutSine(t) * emoteW
      this.h = easeInOutSine(t) * emoteH

      if (t >= 2) {
        this.dead = true
        log.info('bezier dead')
      }
    },
  }
}

const bouncyEmote: EmoteFn = (img: HTMLImageElement) => {
  const from = getRandom(['right', 'left'])

  const vx = getRandomFloat(2, 4) * (from === 'right' ? TO_LEFT : TO_RIGHT)
  let vy = -10
  const gravity = 0.1
  const bounce = 0.7
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: (from === 'right' ? right() : 0) - emoteW / 2,
    y: randomY() - emoteH / 2,
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.x += vx
      this.y += vy
      vy += gravity
      if (isOffScreenLeft(this) || isOffScreenRight(this)) {
        this.dead = true
        log.info('bouncy dead')
      }
      if (isAtCeiling(this)) {
        this.y = 0
        vy = 5
      }
      if (isAtFloor(this)) {
        this.y = floor() - this.h
        vy *= -bounce
      }
    },
  }
}

const rainEmote: EmoteFn = (img: HTMLImageElement) => {
  let vy = getRandomFloat(4, 8)
  const minVelocityY = vy
  const size = getRandomInt(-20, 20)
  const gravity = 0.1 + (size / 50)
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE + size
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: randomX() - emoteW / 2,
    y: 0 - (emoteH / 2),
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.y += vy
      vy += gravity
      vy = Math.max(minVelocityY, vy)
      if (isOffScreenBottom(this)) {
        this.dead = true
        log.info('rain dead')
      }
    },
  }
}

const balloonEmote: EmoteFn = (img: HTMLImageElement) => {
  const size = getRandomInt(-10, 10)
  const vyUp = -5 + size / 5
  const vyVertical = vyUp / 2
  let vx = 0
  let vy = vyUp
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE + size
  const emoteH = img.height * emoteW / img.width
  return {
    url: img.src,
    x: randomX() - emoteW / 2,
    y: floor() - (emoteH / 2),
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.y += vy
      this.x += vx
      if (tick % 20 === 0 && getRandomFloat(0, 1) < .4) {
        if (vx === 0) {
          vx = getRandomInt(-1, 1)
          vy = Math.min(vyVertical, vy)
        } else {
          vx = 0
          vy += .1
        }
      }
      if (isOffScreenTop(this)) {
        this.dead = true
        log.info('balloon dead')
      }
    },
  }
}

const floatingSpaceEmote: EmoteFn = (img: HTMLImageElement) => {
  const vx = getRandomFloat(.5, 2) * getRandom([TO_LEFT, TO_RIGHT])
  const vy = getRandomFloat(.5, 2) * getRandom([TO_UP, TO_DOWN])
  const rotDir = getRandomFloat(1, 3) * getRandom([BACKWARD, FORWARD])
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: centerX() - emoteW / 2,
    y: centerY() - emoteH / 2,
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.rot += rotDir
      this.x += vx
      this.y += vy
      if (isOffScreen(this)) {
        // remove
        this.dead = true
        log.info('floating space dead')
      }
    },
  }
}

const explodeEmote: EmoteFn = (img: HTMLImageElement) => {
  const vx = getRandomFloat(.5, 4) * getRandom([TO_LEFT, TO_RIGHT])
  const vy = getRandomFloat(.5, 4) * getRandom([TO_UP, TO_DOWN])
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: centerX() - emoteW / 2,
    y: centerY() - emoteH / 2,
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.x += vx
      this.y += vy
      if (isOffScreen(this)) {
        // remove
        this.dead = true
        log.info('explode dead')
      }
    },
  }
}

const fountainEmote: EmoteFn = (img: HTMLImageElement) => {
  const vx = getRandomFloat(.5, 4) * getRandom([TO_LEFT, TO_RIGHT])
  let vy = getRandomFloat(-15, -10)
  const gravity = 0.1
  const bounce = 0.7
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const emoteW = DEFAULT_EMOTE_SIZE
  const emoteH = img.height * emoteW / img.width

  return {
    url: img.src,
    x: centerX() - emoteW / 2,
    y: floor() - emoteH,
    w: emoteW,
    h: emoteH,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      }
      this.active = true
      this.x += vx
      this.y += vy
      vy += gravity
      if (isOffScreenLeft(this) || isOffScreenRight(this)) {
        // remove
        this.dead = true
        log.info('fountain dead')
      }
      if (isAtCeiling(this)) {
        this.y = 0
        vy = -vy
      }
      if (isAtFloor(this)) {
        this.y = floor() - this.h
        vy *= -bounce
      }
    },
  }
}

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  return new Promise<HTMLImageElement>((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.src = url
  })
}

onMounted(() => {
  ws = util.wsClient(props.wdata);
  ws.onMessage("init", (data: GeneralModuleWsEventData) => {
    settings.value = data.settings;
  })
  ws.onMessage("emotes", async (data: GeneralModuleEmotesEventData) => {

    const displayFn = getRandom(data.displayFn)
    let emoteFn: EmoteFn
    switch (displayFn.fn) {
      case EMOTE_DISPLAY_FN.BALLOON: emoteFn = balloonEmote; break
      case EMOTE_DISPLAY_FN.BOUNCY: emoteFn = bouncyEmote; break
      case EMOTE_DISPLAY_FN.EXPLODE: emoteFn = explodeEmote; break
      case EMOTE_DISPLAY_FN.FLOATING_SPACE: emoteFn = floatingSpaceEmote; break
      case EMOTE_DISPLAY_FN.FOUNTAIN: emoteFn = fountainEmote; break
      case EMOTE_DISPLAY_FN.RAIN: emoteFn = rainEmote; break
      case EMOTE_DISPLAY_FN.RANDOM_BEZIER: emoteFn = randomBezierEmote; break
      default: return
    }

    for (const emote of data.emotes) {
      const image = await loadImage(emote.url)
      emotes.value.push(emoteFn(image, displayFn.args))
    }
  })
  ws.connect()
})


onUnmounted(() => {
  if (ws) {
    ws.disconnect()
  }
})
</script>
