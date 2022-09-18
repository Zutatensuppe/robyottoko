<template>
  <div class="emote-wall">
    {{ emotes.length }}
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
import { getRandom, getRandomInt } from "../../../common/fn";
import { number } from "yargs";

// @ts-ignore
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

type EmoteFn = (url: string, args: string[]) => Emote

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
  var cX = 3 * (p1.x - p0.x),
      bX = 3 * (p2.x - p1.x) - cX,
      aX = p3.x - p0.x - cX - bX;

  var cY = 3 * (p1.y - p0.y),
      bY = 3 * (p2.y - p1.y) - cY,
      aY = p3.y - p0.y - cY - bY;

  var x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
  var y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

  return {x: x, y: y};
}

const easeInOutSine = (x: number): number => {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}

const randomBezierEmote: EmoteFn = (url: string) => {
  const w = window.innerWidth
  const h = window.innerHeight
  const rand = (n: number): number => Math.floor(Math.random() * n)
  const p0 = { x: rand(w), y: rand(h) }
  const p1 = { x: rand(w), y: rand(h) }
  const p2 = { x: rand(w), y: rand(h) }
  const p3 = { x: rand(w), y: rand(h) }

  const delayTicks = getRandomInt(0, 50)
  let tick = 0
  let t = 0
  return {
    url,
    x: -DEFAULT_EMOTE_SIZE,
    y: -DEFAULT_EMOTE_SIZE,
    w: DEFAULT_EMOTE_SIZE,
    h: DEFAULT_EMOTE_SIZE,
    rot: 0,
    active: true,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      t += .005
      const p = bezier(easeInOutSine(t), p0, p1, p2, p3)
      this.x = p.x
      this.y = p.y
      this.w = easeInOutSine(t) * DEFAULT_EMOTE_SIZE
      this.h = easeInOutSine(t) * DEFAULT_EMOTE_SIZE

      if (t >= 2) {
        this.dead = true
        console.log('bezier dead')
      }
    },
  }
}

const bouncyEmote: EmoteFn = (url: string) => {
  const from = getRandom(['right', 'left'])

  let vx = Math.random() * 2 + 2
  if (from === 'right') {
    vx *= -1
  }
  let vy = -10
  let gravity = 0.1
  let bounce = 0.7
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const w = window.innerWidth
  const h = window.innerHeight

  return {
    url,
    x: (from === 'right' ? w : 0) - DEFAULT_EMOTE_SIZE / 2,
    y: getRandomInt(0, h - DEFAULT_EMOTE_SIZE / 2),
    w: DEFAULT_EMOTE_SIZE,
    h: DEFAULT_EMOTE_SIZE,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.x += vx
      this.y += vy
      vy += gravity
      if (
        // off screen left
        this.x + this.w <= 0
        ||
        // off screen right
        this.x > w
      ) {
        this.dead = true
        console.log('bouncy dead')
      }
      if (this.y <= 0) {
        this.y = 0
        vy = 5
      }
      if (this.y + this.h >= h) {
        this.y = h - this.h
        vy *= -bounce
      }
    },
  }
}

const rainEmote: EmoteFn = (url: string) => {
  let vy = 4 + Math.random() * 4
  const minVelocityY = vy
  let size = getRandomInt(-20, 20)
  let gravity = 0.1 + (size / 50)
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const w = window.innerWidth
  const h = window.innerHeight

  return {
    url,
    x: getRandomInt(0, w) - DEFAULT_EMOTE_SIZE / 2,
    y: 0 - (DEFAULT_EMOTE_SIZE / 2),
    w: DEFAULT_EMOTE_SIZE + size,
    h: DEFAULT_EMOTE_SIZE + size,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.y += vy
      vy += gravity
      vy = Math.max(minVelocityY, vy)
      if (
        this.y > h
      ) {
        this.dead = true
        console.log('rain dead')
      }
    },
  }
}

const balloonEmote: EmoteFn = (url: string) => {
  let vx = 0
  let size = getRandomInt(-10, 10)
  let vyUp = -5 + size / 5
  let vyVertical = vyUp / 2
  let vy = vyUp
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const w = window.innerWidth
  const h = window.innerHeight

  return {
    url,
    x: getRandomInt(0, w) - DEFAULT_EMOTE_SIZE / 2,
    y: h - (DEFAULT_EMOTE_SIZE / 2),
    w: DEFAULT_EMOTE_SIZE + size,
    h: DEFAULT_EMOTE_SIZE + size,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.y += vy
      this.x += vx
      if (tick % 20 === 0 && Math.random() < .4) {
        if (vx === 0) {
          vx = getRandomInt(-1, 1)
          vy = Math.min(vyVertical, vy)
        } else {
          vx = 0
          vy += .1
        }
      }
      if (
        this.y > h
      ) {
        this.dead = true
        console.log('rain dead')
      }
    },
  }
}

const floatingSpaceEmote: EmoteFn = (url: string) => {
  let vx = (Math.random() * 1.5 + .5) * getRandom([-1, 1])
  let vy = (Math.random() * 1.5 + .5) * getRandom([-1, 1])
  const rotDir = (Math.random() * 2 + 1) * getRandom([-1, 1])
  const delayTicks = getRandomInt(0, 50)
  let tick = 0
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    url,
    x: w / 2 - DEFAULT_EMOTE_SIZE / 2,
    y: h / 2 - DEFAULT_EMOTE_SIZE / 2,
    w: DEFAULT_EMOTE_SIZE,
    h: DEFAULT_EMOTE_SIZE,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.rot += rotDir
      this.x += vx
      this.y += vy
      if (
        // off screen left
        this.x + this.w <= 0
        ||
        // off screen right
        this.x > w
        ||
        // off screen top
        this.y + this.h <= 0
        ||
        // off screen bottom
        this.y > h
      ) {
        // remove
        this.dead = true
        console.log('floating space dead')
      }
    },
  }
}

const explodeEmote: EmoteFn = (url: string) => {
  let vx = Math.random() * 3.5 + .5
  if (Math.random() < .5) {
    vx *= -1
  }
  let vy = Math.random() * 3.5 + .5
  if (Math.random() < .5) {
    vy *= -1
  }
  const delayTicks = getRandomInt(0, 50)
  let tick = 0
  const w = window.innerWidth
  const h = window.innerHeight
  return {
    url,
    x: w / 2 - DEFAULT_EMOTE_SIZE / 2,
    y: h / 2 - DEFAULT_EMOTE_SIZE / 2,
    w: DEFAULT_EMOTE_SIZE,
    h: DEFAULT_EMOTE_SIZE,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.x += vx
      this.y += vy
      if (
        // off screen left
        this.x + this.w <= 0
        ||
        // off screen right
        this.x > w
        ||
        // off screen top
        this.y + this.h <= 0
        ||
        // off screen bottom
        this.y > h
      ) {
        // remove
        this.dead = true
        console.log('explode dead')
      }
    },
  }
}

const fountainEmote: EmoteFn = (url: string) => {
  let vx = Math.random() * 3.5 + .5
  if (Math.random() < .5) {
    vx *= -1
  }
  let vy = -10 + Math.random() * -5
  let gravity = 0.1
  let bounce = 0.7
  const delayTicks = getRandomInt(0, 50)
  let tick = 0

  const w = window.innerWidth
  const h = window.innerHeight

  return {
    url,
    x: w / 2 - DEFAULT_EMOTE_SIZE / 2,
    y: h - DEFAULT_EMOTE_SIZE,
    w: DEFAULT_EMOTE_SIZE,
    h: DEFAULT_EMOTE_SIZE,
    rot: 0,
    active: false,
    dead: false,
    update: function () {
      tick++
      if (tick < delayTicks) {
        return
      } else {
        this.active = true
      }
      this.x += vx
      this.y += vy
      vy += gravity
      if (
        // off screen left
        this.x + this.w <= 0
        ||
        // off screen right
        this.x > w
      ) {
        // remove
        this.dead = true
        console.log('fountain dead')
      }
      if (this.y <= 0) {
        this.y = 0
        vy = -vy
      }
      if (this.y + this.h >= h) {
        this.y = h - this.h
        vy *= -bounce
      }
    },
  }
}

onMounted(() => {
  ws = util.wsClient(props.wdata);
  ws.onMessage("init", (data: GeneralModuleWsEventData) => {
    settings.value = data.settings;
  })
  ws.onMessage("emotes", (data: GeneralModuleEmotesEventData) => {

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
      emotes.value.push(emoteFn(emote.url, displayFn.args))
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
