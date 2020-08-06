import Ws from "../ws.js"

export default {
  template: `<div id="app"><div v-if="imgstyle" class="fakeimg" :style="imgstyle"></div></div>`,
  props: {
    conf: Object,
  },
  data() {
    return {
      queue: [],
      worker: null,
      imgstyle: '',
    }
  },
  methods: {
    async playone(media) {
      return new Promise(async (resolve) => {
        const promises = []
        if (media.image && media.image.file) {
          await this.prepareImage(media.image.file)
          this.imgstyle = {
            backgroundImage: 'url(/uploads/' + media.image.file + ')',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            height: '100%',
          }
        }

        if (media.minDurationMs) {
          promises.push(new Promise(res => {
            setTimeout(res, media.minDurationMs)
          }))
        }

        if (media.sound && media.sound.file) {
          promises.push(new Promise(res => {
            const audio = new Audio(`/uploads/${media.sound.file}`)
            audio.addEventListener('ended', () => {
              res()
            })
            audio.play();
          }))
        }

        if (promises.length === 0) {
          // show images at least 1 sek by default (only if there
          // are no other conditions)
          promises.push(new Promise(resolve1 => {
            setTimeout(resolve1, 1000)
          }))
        }

        Promise.all(promises).then(_ => {
          this.imgstyle = ''
          resolve()
        })
      })
    },
    addQueue(media) {
      this.queue.push(media)
      if (this.worker) {
        return
      }

      const next = async () => {
        if (this.queue.length === 0) {
          clearInterval(this.worker)
          this.worker = null
          return
        }
        await this.playone(this.queue.shift())
        this.worker = setTimeout(next, 500) // this much time in between media
      }
      this.worker = setTimeout(next, 500)
    },
    async prepareImage(img) {
      return new Promise((resolve) => {
        const imgLoad = new Image();
        imgLoad.src = '/uploads/' + img;
        Vue.nextTick(() => {
          if (imgLoad.loaded) {
            resolve()
          } else {
            imgLoad.onload = resolve
          }
        })
      })
    },
    playmedia(media) {
      this.addQueue(media)
    },
    onMsg(e) {
      const d = JSON.parse(e.data)
      if (!d.event) {
        return
      }
      switch (d.event) {
        case 'playmedia':
          this.playmedia(d.data)
          break
      }
    },
  },
  async mounted() {
    this.ws = new Ws(this.conf.wsBase + '/commands', this.conf.widgetToken)
    this.ws.onmessage = this.onMsg
  }
}
