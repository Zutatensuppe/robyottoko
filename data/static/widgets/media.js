new Vue({
  el: '#app',
  template: `<div id="app"><div v-if="imgstyle" class="fakeimg" :style="imgstyle"></div></div>`,
  data: {
    queue: [],
    worker: null,
    imgstyle: '',
  },
  methods: {
    async playone(media) {
      return new Promise(async (resolve) => {
        if (media.image) {
          await this.prepareImage(media.image.file)
          this.imgstyle = {
            backgroundImage: 'url(/uploads/' + media.image.file + ')',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            height: '100%',
          }
        }
        if (media.sound.file) {
          const audio = new Audio(`/uploads/${media.sound.file}`)
          audio.addEventListener('ended', () => {
            this.imgstyle = ''
            resolve()
          })
          audio.play();
        } else {
          setTimeout(() => {
            this.imgstyle = ''
            resolve()
          }, 5000)
        }
      })
    },
    addQueue(media) {
      this.queue.push(media)
      if (!this.worker) {
        const next = async () => {
          if (this.queue.length === 0) {
            clearInterval(this.worker)
            this.worker = null
            return
          }
          await this.playone(this.queue.shift())
          this.worker = setTimeout(next, 1000)
        }
        this.worker = setTimeout(next, 1000)
      }
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
        case 'playsound':
          this.playmedia({sound: d.data})
          break
        case 'playmedia':
          this.playmedia(d.data)
          break
      }
    },
  },
  async mounted() {
    this.ws = new WidgetSocket('/commands')
    this.ws.onmessage = this.onMsg
  }
})
