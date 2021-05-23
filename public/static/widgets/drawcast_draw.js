import WsClient from '../WsClient.js'

export default {
  template: `
<div>
  <canvas ref="canvas" width="720" height="405"
    @mousemove="mousemove"
    @mousedown="mousedown"
    @mouseup="mouseup"
  ></canvas>
  <div class="colorpicker">
    <template v-for="(c,idx) in colors" :key="idx">
    <br v-if="idx > 0 && idx%11===0" />
    <span class="colorpick" :class="{active: colorIdx === idx}" @click="colorIdx = idx">
      <span class="color" :style="{backgroundColor: c}"></span>
    </span>
    </template>
  </div>
  <input type="range" min="1" max="100" v-model="size" />
  {{ size }}
  <input type="button" id="clear" value="Clear" @click="clear" />
  <input type="button" id="submit" value="Submit" @click="submitImage" />
  <div id="gallery">
    <img v-for="(img,idx) in images" :src="img" :key="idx" />
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

      colorIdx: 0,
      size: 2,
      canvas: null,
      ctx: null,

      last: null,
    }
  },
  computed: {
    color () {
      return this.colors[this.colorIdx]
    },
    halfSize () {
      return Math.round(this.size/2)
    },
  },
  methods: {
    redraw (...pts) {
      if (pts.length === 0) {
        return
      }
      if (pts.length === 1) {
        this.ctx.beginPath()
        this.ctx.fillStyle = this.color
        this.ctx.arc(pts[0].x, pts[0].y, this.halfSize, 0, 2 * Math.PI);
        this.ctx.closePath()
        this.ctx.fill()
        return
      }

      this.ctx.lineJoin = 'round'
      this.ctx.beginPath()
      this.ctx.strokeStyle = this.color
      this.ctx.lineWidth = this.size
      this.ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        this.ctx.lineTo(pts[i].x, pts[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()
    },
    mousemove (e) {
      if (!this.last) {
        return
      }
      const cur = {x: e.offsetX, y: e.offsetY}
      this.redraw(this.last, cur)
      this.last = cur
    },
    mousedown (e) {
      const cur = {x: e.offsetX, y: e.offsetY}
      this.redraw(cur)
      this.last = cur
    },
    mouseup (e) {
      this.last = null
    },
    clear () {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.images = []
    },
    submitImage () {
      const imgSrc = this.canvas.toDataURL()
      this.images.push(imgSrc)
      this.ws.send(JSON.stringify({event: 'post', data: {
        img: imgSrc
      }}))
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/drawcast',
      this.conf.widgetToken
    )
    this.ws.connect()

    this.canvas = this.$refs.canvas
    this.ctx = this.canvas.getContext('2d')

    // on window, in case left canvas and mouse up outside
    window.addEventListener('mouseup', () => {
      this.last = null
    })
  }
}
