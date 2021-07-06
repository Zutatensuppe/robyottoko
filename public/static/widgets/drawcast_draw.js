import WsClient from '../WsClient.js'

const touchPoint = (/** @type TouchEvent */ evt) => {
  var bcr = evt.target.getBoundingClientRect();
  return {
    x: evt.targetTouches[0].clientX - bcr.x,
    y: evt.targetTouches[0].clientY - bcr.y,
  }
}
const mousePoint = (/** @type MouseEvent */ evt) => {
  return { x: evt.offsetX, y: evt.offsetY }
}

const colorStrToColor = (/** @type string*/ colorStr) => {
  let m

  const str = colorStr.toLowerCase()

  m = str.match(/^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/)
  if (m) {
    // RGB color
    return [
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
      255
    ]
  }

  m = str.match(/^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d{1,3})\)$/)
  if (m) {
    // RGBA color
    return [
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      parseInt(m[3], 10),
      parseInt(m[4], 10),
    ]
  }

  m = str.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (m) {
    // HEX 3 digits
    return [
      parseInt(`${m[1]}${m[1]}`, 16),
      parseInt(`${m[2]}${m[2]}`, 16),
      parseInt(`${m[3]}${m[3]}`, 16),
      255,
    ]
  }

  m = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/)
  if (m) {
    // HEX 6 digits
    return [
      parseInt(`${m[1]}`, 16),
      parseInt(`${m[2]}`, 16),
      parseInt(`${m[3]}`, 16),
      255,
    ]
  }

  // just a transparent color because we didnt handle it
  return [0, 0, 0, 0]
}

const CanvasAdapter = (canvas) => {
  const ctx = canvas.getContext('2d')
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  const idxByCoord = (x, y) => y * (canvas.width * 4) + x * 4
  const colorAtIdx = (idx) => {
    return [
      imageData.data[idx],
      imageData.data[idx + 1],
      imageData.data[idx + 2],
      imageData.data[idx + 3],
    ]
  }
  const colorEqual = (color1, color2) => {
    return color1[0] === color2[0]
      && color1[1] === color2[1]
      && color1[2] === color2[2]
      && color1[3] === color2[3]
  }
  const getColorAtCoord = (x, y) => {
    return colorAtIdx(idxByCoord(x, y))
  }
  const setColorAtCoord = (x, y, color) => {
    const idx = idxByCoord(x, y)
    imageData.data[idx] = color[0]
    imageData.data[idx + 1] = color[1]
    imageData.data[idx + 2] = color[2]
    imageData.data[idx + 3] = color[3]
  }
  const bucketFill = (startX, startY, colorStr) => {

    const fillColor = colorStrToColor(colorStr)
    const targetColor = getColorAtCoord(startX, startY)
    if (colorEqual(fillColor, targetColor)) {
      return
    }

    let q = []
    let pt = [startX, startY]
    do {
      let [x, y] = pt
      const sColor = getColorAtCoord(x, y)
      if (colorEqual(sColor, targetColor)) {
        setColorAtCoord(x, y, fillColor)

        if (x > 0) {
          q.push([x - 1, y])
        }
        if (y > 0) {
          q.push([x, y - 1])
        }
        if (x < canvas.width - 1) {
          q.push([x + 1, y])
        }
        if (y < canvas.height - 1) {
          q.push([x, y + 1])
        }
      }
      pt = q.shift()
    } while (pt)

    ctx.putImageData(imageData, 0, 0)
  }
  const getPixel = (x, y) => {
    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data
    return [r, g, b, a]
  }
  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  const drawImage = (imageObject, x, y) => {
    ctx.drawImage(imageObject, x, y)
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  }
  const _fillCircle = (centerX, centerY, radius, color) => {
    // how to fill a circle.. ?
    // x/y is the center
    // x - radius is min x, x + radius is max x
    // y - radius is min y, y + radius is max y
    // go from min x -> max x, min y -> max y, if pt is in circle
    // (= distance to center pt is <= radius), fill px
    // SQRT(a^2 + b^2) = c
    const dist = (x1, y1, x2, y2) => Math.sqrt(((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2)))

    // TODO: improve circle drawing :)
    const startX = Math.max(0, centerX - radius)
    const endX = Math.min(canvas.width, centerX + radius)
    const startY = Math.max(0, centerY - radius)
    const endY = Math.min(canvas.height, centerY + radius)

    for (let x = startX; x < endX; x++) {
      for (let y = startY; y < endY; y++) {
        const d = dist(x, y, centerX, centerY)
        if (d <= radius) {
          setColorAtCoord(x, y, color)
        }
      }
    }
  }
  const clearCircle = (x, y, radius) => {
    const color = [0, 0, 0, 0]
    _fillCircle(x, y, radius, color)
    ctx.putImageData(imageData, 0, 0)
  }
  const fillCircle = (x, y, radius, colorStr) => {
    const color = colorStrToColor(colorStr)
    _fillCircle(x, y, radius, color)
    ctx.putImageData(imageData, 0, 0)
  }

  const plotLine = (x0, y0, x1, y1, radius, color) => {
    let dx = Math.abs(x1 - x0)
    let sx = x0 < x1 ? 1 : -1
    let dy = -Math.abs(y1 - y0)
    let sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    while (true) {
      _fillCircle(x0, y0, radius, color);
      if (x0 == x1 && y0 == y1) {
        break;
      }
      let e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
  const _fillPath = (pts, radius, color) => {
    for (let i = 1; i < pts.length; i++) {
      plotLine(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, radius, color)
    }
  }

  const clearPath = (pts, radius) => {
    const color = [0, 0, 0, 0]
    _fillPath(pts, radius, color)
    ctx.putImageData(imageData, 0, 0)
  }
  const fillPath = (pts, radius, colorStr) => {
    const color = colorStrToColor(colorStr)
    _fillPath(pts, radius, color)
    ctx.putImageData(imageData, 0, 0)
  }
  const toImage = () => {
    return canvas.toDataURL()
  }
  const toImageBitmap = async () => {
    return await createImageBitmap(canvas)
  }

  return {
    bucketFill,
    clear,
    getPixel,
    drawImage,
    clearCircle,
    fillCircle,
    clearPath,
    fillPath,
    toImage,
    toImageBitmap,
  }
}

export default {
  template: `
<div id="drawcast">
  <div id="draw">
    <canvas
      ref="canvas"
      :class="canvasClasses"
      :width="canvasWidth"
      :height="canvasHeight"
      @touchstart.prevent="touchstart"
      @touchmove.prevent="touchmove"
      @mousemove="mousemove"
      @mousedown="mousedown"

      @mouseup="cancelDraw"
      @touchend.prevent="cancelDraw"
      @touchcancel.prevent="cancelDraw"
      :style="styles"
    ></canvas>

    <div class="right-controls">
      <div>
        <button id="clear" @click="clear">
          <span>❌</span>
          Clear image
        </button>
      </div>
      <br />
      <div>
        Options
        <hr />
      </div>
      <div>
        Visual Background
        <div>
          <span class="square square-big" @click="opt('canvasBg', 'transparent')">
            <span class="square-inner bg-transparent"></span>
          </span>
          <span class="square square-big" @click="opt('canvasBg', 'white')">
            <span class="square-inner"></span>
          </span>
        </div>
      </div>
    </div>

    <table class="controls">
      <tr>
        <td>
          <label id="current-color">
            <input type="color" v-model="color" />
            <span class="square square-big" :class="{active: tool==='pen'}">
              <span class="square-inner" :style="{backgroundColor: tool==='color-sampler' ? sampleColor : color}"></span>
            </span>
          </label>
        </td>
        <td>
          <div class="preset-colors">
            <div>
              <template v-for="(c,idx) in palette" :key="idx">
              <br v-if="idx > 0 && idx%11===0" />
              <span class="square colorpick" @click="setColor(c)">
                <span class="square-inner color" :style="{backgroundColor: c}"></span>
              </span>
              </template>
            </div>
          </div>
          <div class="tools">
            <span class="square" :class="{active: tool === 'color-sampler'}" title="Color Sampler" @click="tool='color-sampler'">
              <span class="square-inner color-sampler"></span>
            </span>
            <span class="square" :class="{active: tool === 'eraser'}" title="Eraser" @click="tool='eraser'">
              <span class="square-inner eraser"></span>
            </span>
            <span class="square" :class="{active: tool === 'fill'}" title="Fill" @click="setTool('fill')">
              <span class="square-inner fill"></span>
            </span>

            <template v-for="(s,idx) in sizes" :key="idx">
              <span class="square sizes" :class="{active: (tool === 'pen' || tool === 'eraser') && size === s, ['size-' + s]: true}" @click="setSize(s)">
                <span class="square-inner"><span></span></span>
              </span>
              <span v-if="false"></span>
            </template>

            <span class="square" title="Undo" @click="undo">
              <span class="square-inner undo"></span>
            </span>
          </div>
        </td>
        <td>
          <div class="buttons">
            <input type="button" id="submit" :value="submitButtonText" @click="submitImage" />
          </div>
        </td>
      </tr>
    </table>
  </div>

  <div id="customDescription" v-if="customDescription">
    {{customDescription}}
  </div>

  <div id="gallery" v-if="images.length > 0">
    <div>Gallery: <input type="button" @click="images=[]" value="Clear gallery"/></div>
    <div>
      Click a drawing to start a new one from it: <br />
      <img v-for="(img,idx) in images" :src="img" :key="idx" @click="modify" />
    </div>
  </div>
</div>`,
  props: {
    conf: Object,
  },
  data() {
    return {
      opts: {},
      palette: ['#000000'],

      images: [],

      color: '#000000',
      sampleColor: '',

      tool: 'pen', // 'pen'|'eraser'|'color-sampler'|'fill'
      sizes: [1, 2, 5, 10, 30, 60, 100],
      size: 5,

      /** @type CanvasAdapter */
      adapter: null,

      last: null,

      canvasWidth: 720,
      canvasHeight: 405,
      submitButtonText: 'Submit',
      submitConfirm: '',
      customDescription: '',

      stack: [],
      currentPath: [],
    }
  },
  computed: {
    canvasClasses() {
      const canvasBg = this.opts.canvasBg || 'transparent'
      if (canvasBg === 'white') {
        return ['bg-white']
      }
      return ['bg-transparent']
    },
    radius() {
      return Math.round(this.size / 2)
    },
    styles() {
      return {
        cursor: this.cursor,
      }
    },
    cursor() {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (this.tool === 'color-sampler' || this.tool === 'fill') {
        return 'crosshair'
      }

      c.width = parseInt(this.size, 10) + 1
      c.height = parseInt(this.size, 10) + 1
      ctx.beginPath()
      ctx.strokeStyle = '#000'
      if (this.tool === 'eraser') {
        ctx.fillStyle = '#fff'
      } else {
        ctx.fillStyle = this.color
      }
      ctx.arc(this.radius, this.radius, this.radius, 0, 2 * Math.PI);
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      return `url(${c.toDataURL()}) ${this.radius} ${this.radius}, default`
    },
  },
  methods: {
    opt(option, value) {
      this.opts[option] = value
      window.localStorage.setItem('drawcastOpts', JSON.stringify(this.opts))
    },
    setColor(color) {
      this.color = color
    },
    setSize(size) {
      this.size = size
      if (this.tool !== 'pen' && this.tool !== 'eraser') {
        this.tool = 'pen'
      }
    },
    setTool(tool) {
      this.tool = tool
      if (tool === 'fill') {
        this.size = 1
      }
    },
    async modify(ev) {
      await this.img(ev.target)
    },

    /**
     * Undo - remove newest item from stack and draw the last one remaining
     */
    async undo() {
      this.stack.pop()
      this.adapter.clear()
      if (this.stack.length > 0) {
        this.adapter.drawImage(this.stack[this.stack.length - 1], 0, 0)
      }
    },
    /**
     * Draw complete image
     */
    async img(imageObject) {
      this.adapter.clear()
      this.adapter.drawImage(imageObject, 0, 0)
      this.stack.push(await this.adapter.toImageBitmap())
    },
    async drawPathPart(obj) {
      this.currentPath.push(obj)
      const { pts, color, tool, radius } = obj
      if (pts.length === 0) {
        return
      }

      if (tool === 'eraser') {
        if (pts.length === 1) {
          this.adapter.clearCircle(pts[0].x, pts[0].y, radius)
        } else {
          this.adapter.clearPath(pts, radius)
        }
      } else {
        if (pts.length === 1) {
          this.adapter.fillCircle(pts[0].x, pts[0].y, radius, color)
        } else {
          this.adapter.fillPath(pts, radius, color)
        }
      }
    },
    async redraw(...pts) {
      await this.drawPathPart({
        pts,
        tool: this.tool,
        color: this.color,
        radius: this.radius,
      })
    },

    async fill(pt) {
      this.adapter.bucketFill(pt.x, pt.y, this.color)
      this.stack.push(await this.adapter.toImageBitmap())
    },

    async cancelDraw(e) {
      if (this.currentPath.length === 0) {
        return
      }
      // stuff was drawn before, in drawPathPart
      this.stack.push(await this.adapter.toImageBitmap())
      this.currentPath = []
      this.last = null
    },

    async startDraw(pt) {
      if (this.tool === 'fill') {
        await this.fill(pt)
        return
      }
      if (this.tool === 'color-sampler') {
        this.color = this.getColor(pt)
        return
      }
      const cur = pt
      this.redraw(cur)
      this.last = cur
    },

    continueDraw(pt) {
      if (this.tool === 'color-sampler') {
        this.sampleColor = this.getColor(pt)
      }
      if (!this.last) {
        return
      }
      const cur = pt
      this.redraw(this.last, cur)
      this.last = cur
    },

    touchstart(e) {
      e.preventDefault()
      this.startDraw(touchPoint(e))
    },
    mousedown(e) {
      this.startDraw(mousePoint(e))
    },

    touchmove(e) {
      e.preventDefault()
      this.continueDraw(touchPoint(e))
    },
    mousemove(e) {
      this.continueDraw(mousePoint(e))
    },

    clear() {
      this.adapter.clear()
      this.stack = []
    },
    submitImage() {
      if (this.submitConfirm && !confirm(this.submitConfirm)) {
        return
      }
      this.ws.send(JSON.stringify({
        event: 'post', data: {
          img: this.adapter.toImage(),
        }
      }))
    },
    getColor(pt) {
      const [r, g, b, a] = this.adapter.getPixel(pt.x, pt.y)
      return a ? `rgb(${r},${g},${b})` : this.palette[0]
    },
  },
  async mounted() {
    const opts = window.localStorage.getItem('drawcastOpts')
    this.opts = opts ? JSON.parse(opts) : { canvasBg: 'transparent' }

    this.ws = new WsClient(
      this.conf.wsBase + '/drawcast',
      this.conf.widgetToken
    )
    this.ws.onMessage('init', (data) => {
      // submit button may not be empty
      this.submitButtonText = data.settings.submitButtonText || 'Submit'
      this.submitConfirm = data.settings.submitConfirm
      this.canvasWidth = data.settings.canvasWidth
      this.canvasHeight = data.settings.canvasHeight
      this.customDescription = data.settings.customDescription || ''
      this.palette = data.settings.palette || this.palette
      this.color = this.palette[0]

      this.images = data.images
    })
    this.ws.onMessage('post', (data) => {
      this.images.unshift(data.img)
      this.images = this.images.slice(0, 20)
    })
    this.ws.connect()
    this.adapter = CanvasAdapter(this.$refs.canvas)

    // on window, in case left canvas and mouse up outside
    window.addEventListener('mouseup', () => {
      this.last = null
    })

    this.$watch('color', () => {
      if (this.tool !== 'pen' && this.tool !== 'fill') {
        this.tool = 'pen'
      }
    })
  }
}
