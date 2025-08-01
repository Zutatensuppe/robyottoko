<template>
  <div>
    <div class="media-v2-edit-area bg-transparent-light" :class="{ 'hide-boxes': hideBoxes }" ref="editAreaRef">
      <div
        v-for="(item, idx) in val" :key="idx"
        class="media-item"
        :class="{ 'is-selected': idx === selectedItemIdx, [`media-item-${item.type}`]: true }"
        :style="itemStyle(item, val.length - idx)"
        @mousedown="startDrag($event, idx)"
      >
        <div
          v-if="item.type === 'image'"
          :style="itemInnerStyle(item)"
          class="image-container"
        />
        <div
          v-if="item.type === 'video'"
          :style="itemInnerStyle(item)"
          class="video-container"
        >
          <div class="video-16-9">
            <video autoplay loop muted playsinline :src="videoUrl(item.video.url)" />
          </div>
        </div>
        <div
          v-if="item.type === 'text'"
          :style="itemInnerStyle(item)"
          class="text-container"
          :ref="el => setTextRef((el as HTMLElement)?.parentElement, idx)"
        >
          <span class="text-span">{{ item.text }}</span>
        </div>

        <div
          class="resize-handle"
          @mousedown.stop="startResize($event, idx)"
        ></div>
        <div
          class="rotate-handle"
          @dblclick.stop="resetRotation(idx)"
          @mousedown.stop="startRotate($event, idx)"
        ></div>
      </div>
    </div>
    <label class="is-clickable"><CheckboxInput v-model="hideBoxes" /> Hide Boxes in Preview</label>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, StyleValue, watch } from 'vue'
import type { MediaV2CommandDataItem, MediaV2Visualization } from '../../../../types'
import CheckboxInput from '../../CheckboxInput.vue'
import { asQueryArgs } from '../../../../common/fn'

const props = defineProps<{
  modelValue: MediaV2CommandDataItem[]
  selectedItemIdx: number
}>()

const hideBoxes = ref<boolean>(false)

const val = ref<MediaV2CommandDataItem[]>(props.modelValue)

const editAreaRef = ref<HTMLDivElement>() as Ref<HTMLDivElement>
const textRefs = ref<HTMLElement[]>([])

const setTextRef = (el: HTMLElement | null, idx: number) => {
  if (el) textRefs.value[idx] = el
}

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

const emit = defineEmits<{
  (e: 'update:modelValue', val: MediaV2CommandDataItem[]): void
  (e: 'update:selectedItemIdx', val: number): void
}>()

const draggingIndex = ref<number | null>(null)
const offsetX = ref<number>(0)
const offsetY = ref<number>(0)
const resizingIndex = ref<number | null>(null)
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const videoUrl = (url: string): string => {
  return '/api/video-url' + asQueryArgs({ url })
}

const startResize = (e: MouseEvent, index: number) => {
  emit('update:selectedItemIdx', index)
  e.preventDefault()
  e.stopPropagation()

  const item = val.value[index]
  if (item.type === 'sound') return

  resizingIndex.value = index

  const rect = editAreaRef.value.getBoundingClientRect()
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: item.rectangle.width * rect.width,
    height: item.rectangle.height * rect.height,
  }

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e: MouseEvent) => {
  if (resizingIndex.value === null) return
  const idx = resizingIndex.value
  const item = val.value[idx]
  if (item.type === 'sound') return

  const rect = editAreaRef.value.getBoundingClientRect()

  const deltaX = e.clientX - resizeStart.value.x
  const deltaY = e.clientY - resizeStart.value.y

  const newWidth = Math.max(10, resizeStart.value.width + deltaX)
  const newHeight = Math.max(10, resizeStart.value.height + deltaY)

  item.rectangle.width = Math.min(newWidth / rect.width, 1)
  item.rectangle.height = Math.min(newHeight / rect.height, 1)
}

const stopResize = () => {
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  resizingIndex.value = null
}

const rotatingIndex = ref<number | null>(null)
const rotationStart = ref({
  startAngle: 0,
  initialRotation: 0,
  centerX: 0,
  centerY: 0,
})

const resetRotation = (index: number) => {
  const item = val.value[index]
  if (item.type === 'sound') return

  // Reset rotation to 0
  item.rotation = 0
}

const startRotate = (e: MouseEvent, index: number) => {
  emit('update:selectedItemIdx', index)
  const item = val.value[index]
  if (item.type === 'sound') return

  const rect = editAreaRef.value.getBoundingClientRect()

  const centerX = rect.left + (item.rectangle.x + item.rectangle.width / 2) * rect.width
  const centerY = rect.top + (item.rectangle.y + item.rectangle.height / 2) * rect.height

  const dx = e.clientX - centerX
  const dy = e.clientY - centerY
  const startAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  rotatingIndex.value = index
  rotationStart.value = {
    startAngle,
    initialRotation: item.rotation || 0,
    centerX,
    centerY,
  }

  document.addEventListener('mousemove', onRotate)
  document.addEventListener('mouseup', stopRotate)
}

const onRotate = (e: MouseEvent) => {
  if (rotatingIndex.value === null) return

  const item = val.value[rotatingIndex.value]
  if (item.type === 'sound') return

  const { startAngle, initialRotation, centerX, centerY } = rotationStart.value

  const dx = e.clientX - centerX
  const dy = e.clientY - centerY
  const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI)

  const angleDelta = currentAngle - startAngle
  item.rotation = (initialRotation + angleDelta) % 360
}

const stopRotate = () => {
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', stopRotate)
  rotatingIndex.value = null
}

const itemStyle = (item: MediaV2CommandDataItem, zIndex: number): StyleValue => {
  if (item.type === 'sound') {
    return { display: 'none' }
  }
  return {
    position: 'absolute',
    left: `${item.rectangle.x * 100}%`,
    top: `${item.rectangle.y * 100}%`,
    width: `${item.rectangle.width * 100}%`,
    height: `${item.rectangle.height * 100}%`,
    transform: `rotate(${item.rotation || 0}deg)`,
    transformOrigin: 'center center',
    zIndex,
  }
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

const startDrag = (e: MouseEvent, index: number) => {
  emit('update:selectedItemIdx', index)

  const item = val.value[index]
  if (item.type === 'sound') return

  draggingIndex.value = index
  const pos = {
    left: item.rectangle.x * 100,
    top: item.rectangle.y * 100,
  }

  const rect = editAreaRef.value.getBoundingClientRect()
  offsetX.value = e.clientX - (rect.left + (pos.left / 100) * rect.width)
  offsetY.value = e.clientY - (rect.top + (pos.top / 100) * rect.height)

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
};

const onDrag = (e: MouseEvent) => {
  if (draggingIndex.value === null) return
  const idx = draggingIndex.value
  if (!val.value[idx] || val.value[idx].type === 'sound') return

  const item = val.value[idx] as MediaV2Visualization

  const rect = editAreaRef.value.getBoundingClientRect()
  const newLeftPx = e.clientX - rect.left - offsetX.value
  const newTopPx = e.clientY - rect.top - offsetY.value

  const newLeft = (newLeftPx / rect.width) * 100
  const newTop = (newTopPx / rect.height) * 100

  const width = item.rectangle.width
  const height = item.rectangle.height

  const x = newLeft / 100
  const y = newTop / 100

  item.rectangle = { width, height, x, y }
}

const stopDrag = () => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  draggingIndex.value = null
}

onMounted(() => {
  nextTick(() => {
    textRefs.value.forEach((el) => {
      if (el) fitTextToContainer(el)
    })
  })
})

watch(() => props.modelValue, (newValue: MediaV2CommandDataItem[]) => {
  if (JSON.stringify(newValue) === JSON.stringify(val.value)) return
  val.value = newValue
}, { deep: true })
watch(
  val,
  async (newValue: MediaV2CommandDataItem[]) => {
    await nextTick()
    textRefs.value.forEach((el) => {
      if (el) fitTextToContainer(el)
    })
    emit('update:modelValue', newValue)
  },
  { deep: true }
)
</script>
<style scoped lang="scss">
.media-v2-edit-area {
  width: 100%;
  height: 100%;
  aspect-ratio: 16/9; // TODO: make this configurable (users may not stream in 16:9)
  position: relative;
  border: 1px solid #ccc;
  overflow: hidden;

  .media-item {
    --background-color: 0, 0, 0;
    --color: 255, 255, 255;
    --name: 'Media';

    border: solid 2px rgba(var(--background-color), .5);
    color: rgb(var(--color));
    cursor: move;
    user-select: none;

    &.is-selected {
      background: rgba(var(--background-color), .2);
    }

    &::before {
      background: rgb(var(--background-color));
      position: absolute;
      content: var(--name);
      z-index: 10;
    }

    &.media-item-video {
      --background-color: 0, 0, 255;
      --name: 'Video';
    }

    &.media-item-text {
      --background-color: 255, 0, 0;
      --name: 'Text';
      color: black;
    }

    &.media-item-image {
      --background-color: 0, 255, 0;
      --color: 0, 0, 0;
      --name: 'Image';
    }
  }

  .resize-handle {
    position: absolute;
    width: 12px;
    height: 12px;
    right: 0;
    bottom: 0;
    cursor: se-resize;
    background: rgb(80, 80, 80);
    border-radius: 2px;
    z-index: 12;
  }

  .rotate-handle {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 14px;
    background: #444;
    border-radius: 50%;
    cursor: grab;
    z-index: 12;
    border: 2px solid white;
  }

  &.hide-boxes {
    .media-item {
      border: solid 2px transparent;
      background: transparent;
      &::before {
        display: none;
      }
    }
    .resize-handle {
      display: none;
    }
    .rotate-handle {
      display: none;
    }
  }
}

.bg-transparent-light {
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, .95), rgba(255, 255, 255, .95)),
    linear-gradient(to right, black 50%, white 50%),
    linear-gradient(to bottom, black 50%, white 50%);
  background-blend-mode: normal, difference, normal;
  background-size: 1.5em 1.5em;
}

.bg-transparent-dark {
  background-image:
    linear-gradient(to right, rgba(0, 0, 0, .9), rgba(0, 0, 0, .9)),
    linear-gradient(to right, black 50%, white 50%),
    linear-gradient(to bottom, black 50%, white 50%);
  background-blend-mode: normal, difference, normal;
  background-size: 1.5em 1.5em;
}

.image-container {
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  height: 100%;
}

.text-container {
  position: relative;
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
