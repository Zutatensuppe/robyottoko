import WsClient from '../WsClient.js'

export default {
  template: `<div id="app"><div v-if="imgstyle" :style="imgstyle"></div></div>`,
  props: {
    conf: Object,
  },
  data() {
    return {
      queue: [],
      worker: null,
      imgstyle: '',
      displayDuration: 5000,
      displayLatestForever: false,

      latestResolved: true,
    }
  },
  methods: {
    async playone(media) {
      return new Promise(async (resolve) => {
        this.latestResolved = false
        const promises = []
        let imageUrl = null
        if (media.image && media.image.url) {
          imageUrl = media.image.url
        } else if (media.image && media.image.file) {
          await this.prepareImage(media.image.file)
          imageUrl = '/uploads/' + encodeURIComponent(img)
        }

        if (imageUrl) {
          this.imgstyle = {
            backgroundImage: `url(${imageUrl})`,
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
            const audio = new Audio(`/uploads/${encodeURIComponent(media.sound.file)}`)
            audio.addEventListener('ended', () => {
              res()
            })
            audio.volume = media.sound.volume / 100.0
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
          if (!this.displayLatestForever) {
            this.imgstyle = ''
          }
          this.latestResolved = true
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
    this.ws = new WsClient(
      this.conf.wsBase + '/drawcast',
      this.conf.widgetToken
    )
    this.ws.onMessage('init', (data) => {
      // submit button may not be empty
      this.displayDuration = data.settings.displayDuration
      this.displayLatestForever = data.settings.displayLatestForever

      // if previously set to 'display forever' and something is
      // currently displaying because of that, hide it
      if (!this.displayLatestForever && this.latestResolved) {
        this.imgstyle = ''
      }
    })
    this.ws.onMessage('post', (data) => {
      console.log('on', 'post', data)
      this.playmedia({
        // TODO:
        image: {url: data.img},
        minDurationMs: this.displayDuration,
        displayLatestForever: this.displayLatestForever
      })
    })
    this.ws.connect()
  }
}
