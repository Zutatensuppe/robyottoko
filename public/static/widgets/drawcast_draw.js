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
<div>
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

  <table class="controls">
    <tr>
      <td>
        <div class="colorpicker">
          <template v-for="(c,idx) in colors" :key="idx">
          <br v-if="idx > 0 && idx%11===0" />
          <span class="square colorpick" :class="{active: colorIdx === idx && tool === 'pen'}" @click="colorIdx = idx;tool='pen'">
            <span class="square-inner color" :style="{backgroundColor: c}"></span>
          </span>
          </template>
        </div>
        <div class="tools">
          <span class="square" :class="{active: tool === 'eraser'}" title="Eraser">
            <span class="square-inner eraser" value="Eraser" @click="tool='eraser'"></span>
          </span>

          <input type="range" min="1" max="100" v-model="size" />
          {{ size }}
        </div>
      </td>
      <td>
        <div class="buttons">
          <input type="button" id="submit" :value="submitButtonText" @click="submitImage" />
          <br />
          <br />
          <input type="button" id="clear" value="Clear image" @click="clearClick" />
        </div>
      </td>
    </tr>
  </table>

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
      colors: [
        // row 1
        '#000000', '#808080', '#ff0000', '#ff8000', '#ffff00', '#00ff00',
        '#00ffff', '#0000ff', '#ff00ff', '#ff8080', '#80ff80',

        // row 2
        '#ffffff', '#c0c0c0', '#800000', '#804000', '#808000', '#008000',
        '#008080', '#000080', '#800080', '#8080ff', '#ffff80',
      ],
      images: [],

      tool: 'pen', // 'pen'|'eraser'
      colorIdx: 0,
      size: 6,
      canvas: null,
      ctx: null,

      last: null,

      canvasWidth: 720,
      canvasHeight: 405,
      submitButtonText: 'Submit',
      submitConfirm: '',
      clearConfirm: '',
    }
  },
  computed: {
    color () {
      return this.colors[this.colorIdx]
    },
    halfSize () {
      return Math.round(this.size/2)
    },
    globalCompositeOperation () {
      return this.tool === 'eraser' ? 'destination-out' : 'source-over'
    },
    styles () {
      return {
        cursor: `url(${this.cursor}) ${this.halfSize} ${this.halfSize}, default`,
      }
    },
    cursor () {
      const c = document.createElement('canvas')
      c.width = parseInt(this.size, 10) + 1
      c.height = parseInt(this.size, 10) + 1
      const ctx = c.getContext('2d')
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
      return c.toDataURL()
    },
  },
  methods: {
    modify (ev) {
      this.clear()
      this.ctx.drawImage(ev.target, 0, 0)
    },
    redraw (...pts) {
      if (pts.length === 0) {
        return
      }
      if (pts.length === 1) {
        this.ctx.beginPath()
        this.ctx.globalCompositeOperation = this.globalCompositeOperation
        this.ctx.fillStyle = this.color
        this.ctx.arc(pts[0].x, pts[0].y, this.halfSize, 0, 2 * Math.PI);
        this.ctx.closePath()
        this.ctx.fill()
        return
      }

      this.ctx.lineJoin = 'round'
      this.ctx.beginPath()
      this.ctx.globalCompositeOperation = this.globalCompositeOperation
      this.ctx.strokeStyle = this.color
      this.ctx.lineWidth = this.size
      this.ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        this.ctx.lineTo(pts[i].x, pts[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()
    },

    cancelDraw (e) {
      this.last = null
    },

    startDraw (pt) {
      const cur = pt
      this.redraw(cur)
      this.last = cur
    },

    continueDraw (pt) {
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
      if (this.clearConfirm && !confirm(this.clearConfirm)) {
        return
      }
      this.clear()
    },
    submitImage () {
      if (this.submitConfirm && !confirm(this.submitConfirm)) {
        return
      }
      this.ws.send(JSON.stringify({event: 'post', data: {
        img: this.canvas.toDataURL(),
      }}))
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/drawcast',
      this.conf.widgetToken
    )
    this.ws.onMessage('init', (data) => {
      this.submitButtonText = data.settings.submitButtonText
      this.submitConfirm = data.settings.submitConfirm
      this.canvasWidth = data.settings.canvasWidth
      this.canvasHeight = data.settings.canvasHeight
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
  }
}
