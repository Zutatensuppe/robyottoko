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

export default {
  template: `
<div id="drawcast">
  <div id="draw">
    <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"
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
      <button id="clear" @click="clearClick">
        <span>❌</span>
        Clear image
      </button>
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
              <span class="square colorpick" @click="color = c;tool='pen'">
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

            <template v-for="(s,idx) in sizes" :key="idx">
              <span class="square sizes" :class="{active: size === s, ['size-' + s]: true}" @click="size=s">
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
      palette: ['#000000'],

      images: [],

      color: '#000000',
      sampleColor: '',

      tool: 'pen', // 'pen'|'eraser'|'color-sampler'
      sizes: [1,2,5,10,30,60,100],
      size: 5,
      canvas: null,
      ctx: null,

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
    halfSize () {
      return Math.round(this.size/2)
    },
    styles () {
      return {
        cursor: this.cursor,
      }
    },
    cursor () {
      const c = document.createElement('canvas')
      const ctx = c.getContext('2d')
      if (this.tool === 'color-sampler') {
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
      ctx.arc(this.halfSize, this.halfSize, this.halfSize, 0, 2 * Math.PI);
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      return `url(${c.toDataURL()}) ${this.halfSize} ${this.halfSize}, default`
    },
  },
  methods: {
    async modify (ev) {
      this.img(ev.target)
      this.stack = []
      this.currentPath = []
      this.stack.push({
        type: 'image',
        data: await createImageBitmap(ev.target),
      })
    },
    undo () {
      this.stack.pop()
      this.clear()
      const stack = this.stack.slice()
      this.stack = []
      this.currentPath = []
      stack.forEach((item) => {
        if (item.type === 'path') {
          item.data.forEach((obj) => {
            this.drawPathPart(obj)
          })
        } else if (item.type === 'image') {
          this.img(item.data)
        } else {
          // unknown item.
        }
        this.stack.push(item)
        this.currentPath = []
      })
    },
    img (imageObject) {
      this.clear()
      const tmp = this.ctx.globalCompositeOperation
      this.ctx.globalCompositeOperation = 'source-over'
      this.ctx.drawImage(imageObject, 0, 0)
      this.ctx.globalCompositeOperation = tmp
    },
    drawPathPart (obj) {
      this.currentPath.push(obj)
      const { pts, color, tool, size, halfSize } = obj
      if (pts.length === 0) {
        return
      }

      if (tool === 'eraser') {
        this.ctx.globalCompositeOperation = 'destination-out'
      } else {
        this.ctx.globalCompositeOperation = 'source-over'
      }

      if (pts.length === 1) {
        this.ctx.beginPath()
        this.ctx.fillStyle = color
        this.ctx.arc(pts[0].x, pts[0].y, halfSize, 0, 2 * Math.PI);
        this.ctx.closePath()
        this.ctx.fill()
        return
      }

      this.ctx.lineJoin = 'round'
      this.ctx.beginPath()
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = size
      this.ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        this.ctx.lineTo(pts[i].x, pts[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()
    },
    redraw (...pts) {
      this.drawPathPart({
        pts,
        tool: this.tool,
        color: this.color,
        size: this.size,
        halfSize: this.halfSize,
      })
    },

    cancelDraw (e) {
      this.stack.push({type: 'path', data: this.currentPath})
      this.currentPath = []
      this.last = null
    },

    startDraw (pt) {
      if (this.tool === 'color-sampler') {
        this.color = this.getColor(pt)
        return
      }
      const cur = pt
      this.redraw(cur)
      this.last = cur
    },

    continueDraw (pt) {
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

    touchstart (e) {
      e.preventDefault()
      this.startDraw(touchPoint(e))
    },
    mousedown (e) {
      this.startDraw(mousePoint(e))
    },

    touchmove (e) {
      e.preventDefault()
      this.continueDraw(touchPoint(e))
    },
    mousemove (e) {
      this.continueDraw(mousePoint(e))
    },

    clear () {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    },
    clearClick () {
      this.clear()
      this.stack = []
      this.currentPath = []
    },
    submitImage () {
      if (this.submitConfirm && !confirm(this.submitConfirm)) {
        return
      }
      this.ws.send(JSON.stringify({event: 'post', data: {
        img: this.canvas.toDataURL(),
      }}))
    },
    getColor (pt) {
      const [r, g, b, a] = this.ctx.getImageData(pt.x, pt.y, 1, 1).data
      // when selecting transparent color, instead use first color in palette
      return a ? `rgb(${r},${g},${b})` : this.palette[0]
    },
  },
  async mounted() {
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
    })
    this.ws.onMessage('post', (data) => {
      this.images.unshift(data.img)
      this.images = this.images.slice(0, 20)
    })
    this.ws.connect()

    this.canvas = this.$refs.canvas
    this.ctx = this.canvas.getContext('2d')

    // on window, in case left canvas and mouse up outside
    window.addEventListener('mouseup', () => {
      this.last = null
    })

    this.$watch('color', () => {
      this.tool = 'pen'
    })
  }
}
