import { prepareYt } from "../yt.js"

export default Vue.component('youtube', {
  data () {
    return {
      id: '',
      yt: null,
      toplay: null,
    }
  },
  template: `<div :id="id"></div>`,
  created () {
    this.id = `yt-${Math.floor(Math.random() * 99 + 1)}-${new Date().getTime()}`
  },
  methods: {
    stop() {
      if (this.yt) {
        this.yt.stopVideo()
      }
    },
    play(yt) {
      if (!this.yt) {
        this.yt = yt
      } else {
        this.yt.cueVideoById(yt)
        this.yt.playVideo()
      }
    },
    playing() {
      return this.yt && this.yt.getPlayerState() === 1
    },
  },
  async mounted() {
    this.yt = await prepareYt(this.id)
    if (this.toplay) {
      this.play(this.toplay)
    }
    this.yt.addEventListener('onStateChange', (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        this.$emit('ended')
      }
    })
  }
})
