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

      notificationSound: null,
      notificationSoundAudio: null,
      latestResolved: true,
    }
  },
  methods: {
    async playone(media) {
      return new Promise(async (resolve) => {
        this.latestResolved = false
        await this.prepareImage(media.image.url)

        this.imgstyle = {
          backgroundImage: `url(${media.image.url})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          height: '100%',
        }

        if (this.notificationSoundAudio) {
          this.notificationSoundAudio.play()
        }

        setTimeout(() => {
          if (!this.displayLatestForever) {
            this.imgstyle = ''
          }
          this.latestResolved = true
          resolve()
        }, this.displayDuration)
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
        imgLoad.src = img
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
      this.notificationSound = data.settings.notificationSound

      // if previously set to 'display forever' and something is
      // currently displaying because of that, hide it
      if (!this.displayLatestForever && this.latestResolved) {
        this.imgstyle = ''
      }
      if (this.notificationSound) {
        this.notificationSoundAudio = new Audio(`/uploads/${encodeURIComponent(this.notificationSound.file)}`)
        this.notificationSoundAudio.volume = this.notificationSound.volume / 100.0
      }
    })
    this.ws.onMessage('post', (data) => {
      console.log('on', 'post', data)
      this.playmedia({
        image: {url: data.img},
      })
    })
    this.ws.connect()
  }
}
