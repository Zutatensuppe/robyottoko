export default {
  name: 'player',
  props: {
    src: String,
    name: String,
    volume: Number,
    baseVolume: {
      default: 100,
    },
  },
  data() {
    return {
      audio: null,
      playing: false,
    }
  },
  created: function () {
    this.load()
    this.$watch('src', () => {
      this.load()
    })
  },
  computed: {
    cls() {
      return this.playing ? 'fa-stop' : 'fa-play'
    }
  },
  methods: {
    toggle() {
      if (this.playing) {
        this.audio.pause()
        this.audio.currentTime = 0;
      } else {
        const maxVolume = parseInt(`${this.baseVolume}`, 10) / 100.0
        const soundVolume = parseInt(`${this.volume}`, 10) / 100.0
        this.audio.volume = maxVolume * soundVolume
        this.audio.play()
      }
      this.playing = !this.playing
    },
    load() {
      if (this.audio) {
        this.audio.pause()
        this.audio = null
      }
      this.audio = new Audio('/uploads/' + this.src)
      this.audio.addEventListener('ended', () => {
        this.playing = false
      })
      this.playing = false
    }
  },
  template: `<span class="player" v-if="src" @click="toggle">{{ name }} <i class="fa ml-1" :class="cls"/></span>`
}
