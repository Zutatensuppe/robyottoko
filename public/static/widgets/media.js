import fn from '../fn.js'

const TIME_BETWEEN_MEDIA = 100
export default {
  template: `<div v-if="imgstyle" :style="imgstyle"></div>`,
  props: {
    ws: Object,
  },
  data() {
    return {
      queue: [],
      worker: null,
      imgstyle: '',
      settings: {
        volume: 100,
      },
    }
  },
  methods: {
    async playone(media) {
      return new Promise(async (resolve) => {
        const promises = []
        if (media.image && media.image.file) {
          await this.prepareImage(media.image.file)
          this.imgstyle = {
            backgroundImage: `url(/uploads/${encodeURIComponent(media.image.file)})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            height: '100%',
          }
        }

        if (media.minDurationMs) {
          promises.push(new Promise(res => {
            setTimeout(res, fn.parseHumanDuration(media.minDurationMs))
          }))
        }

        if (media.sound && media.sound.file) {
          promises.push(new Promise(res => {
            const audio = new Audio(`/uploads/${encodeURIComponent(media.sound.file)}`)
            audio.addEventListener('ended', () => {
              res()
            })
            const maxVolume = this.settings.volume / 100.0
            const soundVolume = media.sound.volume / 100.0
            audio.volume = maxVolume * soundVolume
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
        this.worker = setTimeout(next, TIME_BETWEEN_MEDIA) // this much time in between media
      }
      this.worker = setTimeout(next, TIME_BETWEEN_MEDIA)
    },
    async prepareImage(img) {
      return new Promise((resolve) => {
        const imgLoad = new Image();
        imgLoad.src = '/uploads/' + encodeURIComponent(img);
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
  },
  async mounted() {
    this.ws.onMessage('init', (data) => {
      this.settings = data.settings
    })
    this.ws.onMessage('playmedia', (data) => {
      this.playmedia(data)
    })
    this.ws.connect()
  }
}
