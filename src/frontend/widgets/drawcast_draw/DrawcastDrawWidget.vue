<template>
  <div id="drawcast">
    <Photoshop
      v-if="pickerVisible"
      v-model="tempColor"
      class="colorpicker"
      @ok="onOkPicker"
      @cancel="onCancelPicker"
    />
    <div
      class="drawcast_body"
      :class="{ blurred: dialog !== Dialog.None }"
    >
      <div
        v-if="customDescription"
        class="streamer_info"
        :class="{ 'no-avatar': !customProfileImageUrl }"
      >
        <div
          v-if="customProfileImageUrl"
          class="streamer_avatar"
          :style="{ backgroundImage: `url(${customProfileImageUrl})` }"
        />
        <div class="streamer_message">
          <span class="streamer_message_inner">{{ customDescription }} </span>
        </div>
      </div>
      <div class="draw_panel">
        <div class="draw_panel_inner">
          <div class="draw_panel_top">
            <div class="draw_canvas_holder">
              <div
                class="draw_canvas_holder_inner"
                :class="canvasClasses"
                :style="canvasHolderStyle"
              >
                <canvas
                  ref="finalcanvas"
                  :width="canvasWidth"
                  :height="canvasHeight"
                  :style="styles"
                />
                <canvas
                  ref="draftcanvas"
                  :width="canvasWidth"
                  :height="canvasHeight"
                  :style="draftstyles"
                  @touchstart.prevent="touchstart"
                  @touchmove.prevent="touchmove"
                  @mousedown="mousedown"
                />
              </div>
            </div>
            <div class="v355_1274">
              <div class="card draw_tools_panel">
                <div class="draw_tools_tool_buttons">
                  <div
                    class="draw_tools_tool_button clickable tool-pen"
                    :class="{
                      'is-current': tool === Tool.Pen,
                    }"
                    title="Pen"
                    @click="tool = Tool.Pen"
                  >
                    <icon-pen />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-eraser"
                    :class="{
                      'is-current': tool === Tool.Eraser,
                    }"
                    title="Eraser"
                    @click="tool = Tool.Eraser"
                  >
                    <icon-eraser />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-eyedropper"
                    :class="{
                      'is-current': tool === Tool.ColorSampler,
                    }"
                    title="Color Sampler"
                    @click="tool = Tool.ColorSampler"
                  >
                    <icon-eyedropper />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-undo"
                    title="Undo"
                    @click="undo"
                  >
                    <icon-undo />
                  </div>
                  <div
                    class="draw_tools_tool_button clickable tool-clear"
                    title="Clear the canvas"
                    @click="showClearDialog"
                  >
                    <icon-clear />
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-small bubble-dark" />
                  </div>
                  <div class="slider-input-holder">
                    <input
                      v-model="sizeIdx"
                      type="range"
                      min="0"
                      :max="sizes.length - 1"
                      step="1"
                    >
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark" />
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-big bubble-light" />
                  </div>
                  <div class="slider-input-holder">
                    <input
                      v-model="transparencyIdx"
                      type="range"
                      min="0"
                      :max="transparencies.length - 1"
                      step="1"
                    >
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark" />
                  </div>
                </div>

                <div class="visual_background">
                  <div class="visual_background_title">
                    Visual Background:
                  </div>
                  <div class="visual_background_colors">
                    <div
                      v-for="(bg, idx) of ['transparent-light', 'transparent-dark']"
                      :key="idx"
                      class="visual_background_button clickable"
                      :class="{ 'is-current': canvasBg === bg, [`bg-${bg}`]: true }"
                      @click="opt('canvasBg', bg)"
                    />
                  </div>
                </div>
              </div>
              <div class="hotkey-help">
                <div class="hotkey-help-title">
                  Hotkeys
                </div>
                <div
                  v-for="(item, idx) of hotkeys"
                  :key="idx"
                  class="hotkey-help-item"
                >
                  {{ item }}
                </div>
              </div>
            </div>
          </div>
          <div class="draw_panel_bottom">
            <div class="draw_colors">
              <div class="draw_colors_current">
                <label
                  class="draw_colors_current_label clickable"
                  @click="onOpenPicker"
                >
                  <span
                    class="draw_colors_current_inner"
                    :class="{ active: tool === Tool.Pen }"
                    :style="currentColorStyle"
                  />
                  <div class="draw_colors_current_icon">
                    <icon-eyedropper />
                  </div>
                </label>
              </div>
              <div class="draw_colors_palette">
                <Slider
                  v-model="color"
                  :swatches="[
                    { s: 0.5, l: 0.9 },
                    { s: 0.6, l: 0.8 },
                    { s: 0.75, l: 0.65 },
                    { s: 0.85, l: 0.5 },
                    { s: 0.75, l: 0.35 },
                    { s: 0.6, l: 0.2 },
                    { s: 0.5, l: 0.1 },
                    { s: 0, l: 1 },
                    { s: 0, l: 0.8 },
                    { s: 0, l: 0.65 },
                    { s: 0, l: 0.5 },
                    { s: 0, l: 0.35 },
                    { s: 0, l: 0.2 },
                    { s: 0, l: 0 },
                  ]"
                  @update:modelValue="onColorChange"
                />
              </div>
            </div>
            <div />
            <div class="drawing_panel_bottom_right">
              <div
                v-if="sendingNonce"
                class="button button-primary send_button"
                @click="prepareSubmitImage"
              >
                <span class="send_button_text">⏳ Sending...</span>
              </div>
              <div
                v-else
                class="button button-primary send_button clickable"
                @click="prepareSubmitImage"
              >
                <icon-send />
                <span class="send_button_text">
                  {{ submitButtonText }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-for="(fav, idx) in favoriteListsFiltered"
        :key="idx"
        class="drawings-panel favorite-drawings-panel"
      >
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            fav.title || "Streamer's favorites:"
          }}</span>
        </div>
        <div class="drawing_panel_drawings">
          <img
            v-for="(tmpImg, idx2) in fav.list"
            :key="idx2"
            class="image favorite clickable"
            :src="tmpImg"
            height="190"
            @click="prepareModify(tmpImg)"
          >
        </div>
      </div>
      <div class="drawings-panel recent-drawings-panel">
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            recentImagesTitle
          }}</span>
        </div>
        <div class="drawing_panel_drawings">
          <div
            v-for="(tmpImg, idx) in nonfavorites"
            :key="idx"
            class="image clickable"
          >
            <img
              :src="tmpImg"
              height="190"
              @click="prepareModify(tmpImg)"
            >
            <DoubleclickButton
              v-if="isAdmin"
              class="button clickable remove-button"
              message="Are you sure?"
              :timeout="2000"
              @doubleclick="deleteImage(tmpImg)"
            >
              Remove
            </DoubleclickButton>
          </div>
          <div class="dotdotdot" />
        </div>
      </div>
    </div>

    <div
      class="drawcast_footer"
      :class="{ blurred: dialog !== Dialog.None }"
    >
      <span class="drawcast_footer_left">Hyottoko.club | Developed by
        <a
          href="https://github.com/zutatensuppe"
          target="_blank"
        >para</a>. UI
        Design by
        <a
          href="https://www.artstation.com/lisadikaprio"
          target="_blank"
        >LisadiKaprio</a></span><span
        class="drawcast_footer_right"
      ><a
        href="https://github.com/zutatensuppe/robyottoko"
        target="_blank"
      >Source code
        on Github</a>
        |
        <a
          href="https://twitch.tv/nc_para_"
          target="_blank"
        >Developer’s Twitch channel</a>
        |
        <a
          href="https://jigsaw.hyottoko.club"
          target="_blank"
        >Jigsaw Puzzle Multiplayer</a></span>
    </div>

    <div
      v-if="dialog === Dialog.Success"
      class="dialog success-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div class="dialog-image">
          <div
            class="responsive-image"
            :style="successImageUrlStyle"
          />
        </div>
        <div class="dialog-title">
          Success!
        </div>
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-ok clickable"
            @click="dialogClose"
          >
            Draw another one
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === Dialog.Replace"
      class="dialog confirm-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-danger clickable"
            @click="dialogConfirm"
          >
            Replace image
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === Dialog.ConfirmSubmit"
      class="dialog confirm-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-ok clickable"
            @click="dialogConfirm"
          >
            Send
          </div>
        </div>
      </div>
    </div>
    <div
      v-if="dialog === Dialog.Clear"
      class="dialog clear-dialog"
    >
      <div
        class="dialog-bg"
        @click="dialogClose"
      />
      <div class="dialog-container">
        <div class="dialog-image">
          <div
            class="responsive-image"
            :style="clearImageUrlStyle"
          />
        </div>
        <div
          class="dialog-body"
          v-html="dialogBody"
        />
        <div class="dialog-footer">
          <div
            class="button button-no-button clickable"
            @click="dialogClose"
          >
            Cancel
          </div>
          <div
            class="button button-danger clickable"
            @click="dialogConfirm"
          >
            Clear
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue'
import { nonce, logger, pad } from '../../../common/fn'
import WsClient from '../../WsClient'
import { DrawcastFavoriteList, FullApiUserData } from '../../../types'
import util, { WidgetApiData } from '../util'
import { DrawcastModuleWsDataData } from '../../../mod/modules/DrawcastModuleCommon'
import IconPen from './components/IconPen.vue'
import IconEyedropper from './components/IconEyedropper.vue'
import IconSend from './components/IconSend.vue'
import IconUndo from './components/IconUndo.vue'
import IconEraser from './components/IconEraser.vue'
import IconClear from './components/IconClear.vue'
// @ts-ignore
import { Photoshop, Slider } from '@ckpack/vue-color'
import user from '../../user'
import DoubleclickButton from '../../components/DoubleclickButton.vue'

const log = logger('Page.vue')

interface Point {
  x: number
  y: number
}

enum Tool {
  Pen = 'pen',
  Eraser = 'eraser',
  ColorSampler = 'color-sampler',
}

enum Dialog {
  None = 'none',
  Success = 'success',
  ConfirmSubmit = 'confirm-submit',
  Replace = 'replace',
  Clear = 'clear',
}

const bgColors = ['transparent-light', 'transparent-dark']
const hotkeys = ['E Eraser', 'B Pencil', 'S Color sampler', '1-7 Adjust size', 'Ctrl+Z Undo']
const sizes = [1, 2, 5, 10, 30, 60, 100]
const transparencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

const props = defineProps<{
  wdata: WidgetApiData
}>()

const ws = ref<WsClient | null>(null)
const me = ref<FullApiUserData | null>(null)
const moderationAdmins = ref<string[]>([])
const opts = ref<Record<string, string>>({})
const pickerVisible = ref(false)
const images = ref<string[]>([])
const favoriteLists = ref<DrawcastFavoriteList[]>([])
const defaultColor = ref('#000000')
const color = ref('#000000')
const tempColor = ref('#000000')
const sampleColor = ref('')
const tool = ref<Tool>(Tool.Pen)
const sizeIdx = ref(2)
const transparencyIdx = ref(9)
const ctx = ref({} as CanvasRenderingContext2D)
const finalctx = ref({} as CanvasRenderingContext2D)
const last = ref<Point | null>(null)
const canvasWidth = ref(720)
const canvasHeight = ref(405)
const submitButtonText = ref('Submit')
const submitConfirm = ref('')
const customDescription = ref('')
const customProfileImageUrl = ref('')
const recentImagesTitle = ref('')
const stack = ref([] as ImageData[])
const drawing = ref(false)
const dialog = ref<Dialog>(Dialog.None)
const dialogBody = ref('')
const modifyImageUrl = ref('')
const successImageUrlStyle = ref({})
const clearImageUrlStyle = ref({})
const sendingNonce = ref('')
const sendingDate = ref<Date | null>(null)
const finalcanvas = ref() as Ref<HTMLCanvasElement>
const draftcanvas = ref() as Ref<HTMLCanvasElement>

const isAdmin = computed((): boolean => {
  if (!me.value) {
    return false
  }
  return moderationAdmins.value.includes(me.value.user.name)
})
const favoriteListsFiltered = computed((): DrawcastFavoriteList[] => {
  return favoriteLists.value.filter(
    (fav: DrawcastFavoriteList) => fav.list.length > 0,
  )
})
const favorites = computed((): string[] => {
  const favorites: string[] = []
  for (const fav of favoriteLists.value) {
    favorites.push(...fav.list)
  }
  return favorites
})
const currentColorStyle = computed((): { backgroundColor: string } => {
  return {
    backgroundColor: tool.value === Tool.ColorSampler ? sampleColor.value : color.value,
  }
})
const canvasHolderStyle = computed((): { width: string, height: string } => {
  return {
    width: `${canvasWidth.value + 4}px`,
    height: `${canvasHeight.value + 4}px`,
  }
})
const size = computed((): number => sizes[sizeIdx.value])
const transparency = computed((): number => transparencies[transparencyIdx.value])
const canvasClasses = computed((): string[] => [`bg-${canvasBg.value}`])
const styles = computed((): { cursor: string } => ({ cursor: cursor.value }))
const cursor = computed((): string => createCursor(tool.value, size.value, color.value))
const nonfavorites = computed((): string[] => images.value.filter((url: string) => !favorites.value.includes(url)))
const canvasBg = computed((): string => bgColors.includes(opts.value.canvasBg) ? opts.value.canvasBg : bgColors[0])
const draftstyles = computed((): {
  cursor: string,
  opacity: string,
} => {
  return {
    cursor: cursor.value,
    opacity: `${transparency.value / 100}`,
  }
})

const touchPoint = (canvas: HTMLCanvasElement, evt: TouchEvent) => {
  const bcr = canvas.getBoundingClientRect()
  return {
    x: evt.targetTouches[0].clientX - bcr.x,
    y: evt.targetTouches[0].clientY - bcr.y,
  }
}

const mousePoint = (canvas: HTMLCanvasElement, evt: MouseEvent) => {
  const bcr = canvas.getBoundingClientRect()
  return { x: evt.clientX - bcr.x, y: evt.clientY - bcr.y }
}

const hexIsLight = (color: string) => {
  const hex = color.replace('#', '')
  const c_r = parseInt(hex.substr(0, 2), 16)
  const c_g = parseInt(hex.substr(2, 2), 16)
  const c_b = parseInt(hex.substr(4, 2), 16)
  const brightness = (c_r * 299 + c_g * 587 + c_b * 114) / 1000
  return brightness > 69
}

const createCursor = (tool: string, size: number, color: string): string => {
  if (tool === Tool.ColorSampler) {
    return 'crosshair'
  }

  const c = document.createElement('canvas')
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  const crosshairSize = 10
  const padding = 3
  const canvasSize = size + crosshairSize + padding + crosshairSize + padding
  const halfCanvasSize = Math.round(canvasSize / 2)

  c.width = canvasSize + 1
  c.height = canvasSize + 1

  // crosshair around the color dot
  ctx.fillStyle = '#AAA'
  ctx.fillRect(0, halfCanvasSize - 1, crosshairSize, 3)
  ctx.fillRect(c.width - crosshairSize, halfCanvasSize - 1, crosshairSize, 3)
  ctx.fillRect(halfCanvasSize - 1, 0, 3, crosshairSize)
  ctx.fillRect(halfCanvasSize - 1, c.height - crosshairSize, 3, crosshairSize)
  ctx.fillStyle = '#666'
  ctx.fillRect(1, halfCanvasSize, crosshairSize - 2, 1)
  ctx.fillRect(c.width - crosshairSize + 1, halfCanvasSize, crosshairSize - 2, 1)
  ctx.fillRect(halfCanvasSize, 1, 1, crosshairSize - 2)
  ctx.fillRect(halfCanvasSize, c.height - crosshairSize + 1, 1, crosshairSize - 2)

  ctx.beginPath()
  ctx.translate(0.5, 0.5)
  ctx.fillStyle = color
  ctx.strokeStyle = hexIsLight(String(ctx.fillStyle)) ? '#000' : '#fff'
  ctx.arc(halfCanvasSize, halfCanvasSize, size / 2, 0, 2 * Math.PI)
  ctx.translate(-0.5, -0.5)
  ctx.closePath()
  if (tool !== Tool.Eraser) {
    ctx.fill()
  }
  ctx.stroke()
  return `url(${c.toDataURL()}) ${halfCanvasSize} ${halfCanvasSize}, default`
}

const fillpath = (
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  color: string,
  size: number,
) => {
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.translate(0.5, 0.5)
    ctx.fillStyle = color
    ctx.arc(pts[0].x, pts[0].y, size / 2, 0, 2 * Math.PI)
    ctx.translate(-0.5, -0.5)
    ctx.closePath()
    ctx.fill()
    return
  }

  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.translate(0.5, 0.5)
  ctx.strokeStyle = color
  ctx.lineWidth = size
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.translate(-0.5, -0.5)
  ctx.closePath()
  ctx.stroke()
}

const deleteImage = (url: string) => {
  if (!ws.value) {
    log.error('deleteImage: ws not set')
    return
  }
  if (!me.value) {
    log.error('deleteImage: me not set')
    return
  }

  ws.value.send(
    JSON.stringify({
      event: 'delete_image',
      path: url,
      token: me.value.token,
    }),
  )
}

const onOkPicker = () => {
  // tempColor when coming from color picker is an object
  color.value = (tempColor.value as any).hex
  pickerVisible.value = false
}

const onOpenPicker = () => {
  tempColor.value = color.value
  pickerVisible.value = true
}

const onCancelPicker = () => {
  pickerVisible.value = false
}

const onColorChange = (c: any) => {
  color.value = c.hex
  tool.value = Tool.Pen
}

const opt = (option: string, value: string) => {
  opts.value[option] = value
  window.localStorage.setItem('drawcastOpts', JSON.stringify(opts.value))
}

const modify = async (imageUrl: string) => {
  const image = new Image()
  return new Promise<void>((resolve) => {
    image.src = imageUrl
    image.onload = () => {
      img(image)
      stack.value = []
      drawing.value = false
      stack.value.push(getImageData())
      resolve()
    }
  })
}

const undo = () => {
  stack.value.pop()
  clear()
  drawing.value = false
  if (stack.value.length > 0) {
    putImageData(stack.value[stack.value.length - 1])
  }
}

const getImageData = (): ImageData => {
  return finalctx.value.getImageData(
    0,
    0,
    finalcanvas.value.width,
    finalcanvas.value.height,
  )
}

const putImageData = (imageData: ImageData) => {
  finalctx.value.putImageData(imageData, 0, 0)
}

const img = (imageObject: CanvasImageSource) => {
  clear()
  const tmp = finalctx.value.globalCompositeOperation
  finalctx.value.globalCompositeOperation = 'source-over'
  finalctx.value.drawImage(imageObject, 0, 0)
  finalctx.value.globalCompositeOperation = tmp
}

const drawPathPart = (pts: Point[]) => {
  drawing.value = true
  if (pts.length === 0) {
    return
  }

  if (tool.value === Tool.Eraser) {
    finalctx.value.globalCompositeOperation = 'destination-out'
    fillpath(finalctx.value, pts, color.value, size.value)
    return
  }

  finalctx.value.globalCompositeOperation = 'source-over'
  fillpath(ctx.value, pts, color.value, size.value)
}

const cancelDraw = () => {
  if (!drawing.value) {
    return
  }

  if (tool.value !== Tool.Eraser) {
    finalctx.value.globalAlpha = transparency.value / 100
    finalctx.value.drawImage(draftcanvas.value, 0, 0)
    finalctx.value.globalAlpha = 1

    ctx.value.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  }

  stack.value.push(getImageData())
  drawing.value = false
  last.value = null
}

const startDraw = (pt: Point) => {
  if (tool.value === Tool.ColorSampler) {
    if (
      pt.x >= 0 &&
      pt.y >= 0 &&
      pt.x < canvasWidth.value &&
      pt.y < canvasHeight.value
    ) {
      color.value = getColor(pt)
    }
    return
  }

  if (
    pt.x >= -size.value &&
    pt.y >= -size.value &&
    pt.x < canvasWidth.value + size.value &&
    pt.y < canvasHeight.value + size.value
  ) {
    const cur = pt
    drawPathPart([cur])
    last.value = cur
  }
}

const continueDraw = (pt: Point) => {
  if (tool.value === Tool.ColorSampler) {
    sampleColor.value = getColor(pt)
  }
  if (!last.value) {
    return
  }
  const cur = pt
  drawPathPart([last.value, cur])
  last.value = cur
}

const touchstart = (e: TouchEvent) => {
  e.preventDefault()
  startDraw(touchPoint(draftcanvas.value, e))
}

const mousedown = (e: MouseEvent) => {
  startDraw(mousePoint(draftcanvas.value, e))
}

const touchmove = (e: TouchEvent) => {
  e.preventDefault()
  continueDraw(touchPoint(draftcanvas.value, e))
}

const mousemove = (e: MouseEvent) => {
  continueDraw(mousePoint(draftcanvas.value, e))
}

const clear = () => {
  ctx.value.clearRect(0, 0, draftcanvas.value.width, draftcanvas.value.height)
  finalctx.value.clearRect(
    0,
    0,
    finalcanvas.value.width,
    finalcanvas.value.height,
  )
}

const clearClick = () => {
  clear()
  stack.value = []
  drawing.value = false
}

const prepareSubmitImage = () => {
  if (submitConfirm.value) {
    dialog.value = Dialog.ConfirmSubmit
    dialogBody.value = submitConfirm.value
    return
  }
  submitImage()
}

const submitImage = () => {
  if (!ws.value) {
    log.error('submitImage: ws not set')
    return
  }

  if (sendingNonce.value) {
    // we are already sending something
    log.error('submitImage: nonce not empty')
    return
  }

  sendingDate.value = new Date()
  sendingNonce.value = nonce(10)
  ws.value.send(
    JSON.stringify({
      event: 'post',
      data: {
        nonce: sendingNonce.value,
        img: finalcanvas.value.toDataURL(),
      },
    }),
  )
  // success will be handled in onMessage('post') below
}

const showClearDialog = () => {
  const w = 100
  const h = Math.round((w * canvasHeight.value) / canvasWidth.value)

  clearImageUrlStyle.value = {
    backgroundImage: `url(${finalcanvas.value.toDataURL()})`,
    width: w + 'px',
    height: h + 'px',
  }
  dialog.value = Dialog.Clear
  dialogBody.value = `
    If you click this, your current drawing will be erased. <br />
    <br />
    Do you want to proceed?`
}

const prepareModify = (imageUrl: string) => {
  modifyImageUrl.value = imageUrl
  dialog.value = Dialog.Replace
  dialogBody.value = `
    If you click this, your current drawing will be erased and replaced by
    the drawing you just clicked on. <br />
    <br />
    Do you want to proceed?`
}

const dialogClose = () => {
  dialog.value = Dialog.None
  dialogBody.value = ''
}

const dialogConfirm = () => {
  if (dialog.value === Dialog.ConfirmSubmit) {
    dialog.value = Dialog.None
    submitImage()
  } else if (dialog.value === Dialog.Clear) {
    dialog.value = Dialog.None
    clearClick()
  } else if (dialog.value === Dialog.Replace) {
    dialog.value = Dialog.None
    modify(modifyImageUrl.value)
  }
}

const getColor = (pt: Point) => {
  const [r, g, b, a] = finalctx.value.getImageData(pt.x, pt.y, 1, 1).data
  const hex = (v: number) => pad(v.toString(16), '00')
  // when selecting transparent color, instead use the defaultColor
  return a ? `#${hex(r)}${hex(g)}${hex(b)}` : defaultColor.value
}

const keyup = (e: KeyboardEvent) => {
  if (e.code === 'Digit1') {
    sizeIdx.value = 0
  } else if (e.code === 'Digit2') {
    sizeIdx.value = 1
  } else if (e.code === 'Digit3') {
    sizeIdx.value = 2
  } else if (e.code === 'Digit4') {
    sizeIdx.value = 3
  } else if (e.code === 'Digit5') {
    sizeIdx.value = 4
  } else if (e.code === 'Digit6') {
    sizeIdx.value = 5
  } else if (e.code === 'Digit7') {
    sizeIdx.value = 6
  } else if (e.code === 'KeyB') {
    // pencil
    tool.value = Tool.Pen
  } else if (e.code === 'KeyS') {
    // color Sampler
    tool.value = Tool.ColorSampler
  } else if (e.code === 'KeyE') {
    // eraser
    tool.value = Tool.Eraser
  } else if (e.code === 'KeyZ' && e.ctrlKey) {
    undo()
  }
}

// @ts-ignore
import('./main.scss')

onMounted(() => {
  me.value = user.getMe()
  ctx.value = draftcanvas.value.getContext('2d') as CanvasRenderingContext2D
  finalctx.value = finalcanvas.value.getContext(
    '2d',
  ) as CanvasRenderingContext2D
  ws.value = util.wsClient(props.wdata)

  const optsx = window.localStorage.getItem('drawcastOpts')
  opts.value = optsx ? JSON.parse(optsx) : { canvasBg: 'transparent' }

  ws.value.onMessage('init', (data: DrawcastModuleWsDataData) => {
    // submit button may not be empty
    moderationAdmins.value = data.settings.moderationAdmins
    submitButtonText.value = data.settings.submitButtonText || 'Send'
    submitConfirm.value = data.settings.submitConfirm
    canvasWidth.value = data.settings.canvasWidth
    canvasHeight.value = data.settings.canvasHeight
    customDescription.value = data.settings.customDescription || ''
    customProfileImageUrl.value =
      data.settings.customProfileImage &&
        data.settings.customProfileImage.urlpath
        ? data.settings.customProfileImage.urlpath
        : ''
    recentImagesTitle.value =
      data.settings.recentImagesTitle || 'Newest submitted:'
    favoriteLists.value = data.settings.favoriteLists
    color.value = defaultColor.value
    images.value = data.images.map((image) => image.path)

    if (
      images.value.length > 0
      && data.settings.autofillLatest
      && stack.value.length === 0
      && !drawing.value
    ) {
      modify(images.value[0])
    }

    // test data
    // submitButtonText.value = "Send this image to the striiim";
    // customProfileImageUrl.value =
    //   "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_783ce3fc0013443695c62933da3669c5/default/dark/3.0";
    // customDescription.value = `💙👀 Please draw something cute. This will appear on my stream
    //           screen!~ Click any of the drawings in the gallery to continue
    //           drawing on them!`;
  })

  ws.value.onMessage(
    'image_deleted'
  , (data: { img: string }) => {
    favoriteLists.value = favoriteLists.value.map(favoriteList => {
      favoriteList.list = favoriteList.list.filter(img => img !== data.img)
      return favoriteList
    })
    images.value = images.value.filter((img) => img !== data.img)
  })

  ws.value.onMessage(
    'image_received',
    (data: { nonce: string; img: string }) => {
      if (
        sendingDate.value &&
        sendingNonce.value &&
        data.nonce === sendingNonce.value
      ) {
        // we want to have the 'sending' state for at least minMs ms
        // for images that we have just sent, for other images they may
        // be added immediately
        const minMs = 500
        const now = new Date()
        const timeoutMs = sendingDate.value.getTime() + minMs - now.getTime()
        setTimeout(() => {
          successImageUrlStyle.value = {
            backgroundImage: `url(${data.img})`,
          }
          dialog.value = Dialog.Success
          dialogBody.value = 'Your drawing was sent and is pending approval.'
          sendingNonce.value = ''
          sendingDate.value = null
        }, Math.max(0, timeoutMs))
      }
    },
  )
  ws.value.onMessage(
    'approved_image_received',
    (data: { nonce: string; img: string }) => {
      if (
        sendingDate.value &&
        sendingNonce.value &&
        data.nonce === sendingNonce.value
      ) {
        // we want to have the 'sending' state for at least minMs ms
        // for images that we have just sent, for other images they may
        // be added immediately
        const minMs = 500
        const now = new Date()
        const timeoutMs = sendingDate.value.getTime() + minMs - now.getTime()
        setTimeout(() => {
          successImageUrlStyle.value = {
            backgroundImage: `url(${data.img})`,
          }
          dialog.value = Dialog.Success
          dialogBody.value = 'Your drawing was sent to the stream.'
          sendingNonce.value = ''
          sendingDate.value = null

          images.value.unshift(data.img)
          images.value = images.value.slice(0, 20)
        }, Math.max(0, timeoutMs))
      } else {
        images.value.unshift(data.img)
        images.value = images.value.slice(0, 20)
      }
    },
  )

  ws.value.connect()

  window.addEventListener('mousemove', mousemove)
  window.addEventListener('mouseup', cancelDraw)
  window.addEventListener('touchend', cancelDraw)
  window.addEventListener('touchcancel', cancelDraw)
  window.addEventListener('keyup', keyup)

  watch(color, () => {
    tool.value = Tool.Pen
  })
})

onBeforeUnmount(() => {
  if (ws.value) {
    ws.value.disconnect()
  }
  window.removeEventListener('mousemove', mousemove)
  window.removeEventListener('mouseup', cancelDraw)
  window.removeEventListener('touchend', cancelDraw)
  window.removeEventListener('touchcancel', cancelDraw)
  window.removeEventListener('keyup', keyup)
})
</script>
