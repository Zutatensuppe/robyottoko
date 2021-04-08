const log = (...args) => console.log('[youtube.js]', ...args)

let apiRdy = false
function createApi() {
  if (apiRdy) {
    log('ytapi ALREADY ready')
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.append(tag)
    window.onYouTubeIframeAPIReady = () => {
      apiRdy = true
      log('ytapi ready')
      resolve()
    }
  })
}

function createPlayer(id) {
  return new Promise((resolve) => {
    log('create player on ' + id);
    const player = new YT.Player(id, {
      playerVars: {
        iv_load_policy: 3, // do not load annotations
        modestbranding: 1, // remove youtube logo
      },
      events: {
        onReady: () => {
          log('player ready')
          resolve(player)
        }
      },
    })
  })
}

async function prepareYt(id) {
  await createApi()
  return await createPlayer(id)
}

export default {
  name: 'youtube',
  data () {
    return {
      id: '',
      yt: null,
      toplay: null,
      tovolume: null,
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
        this.toplay = yt
      } else {
        this.yt.cueVideoById(yt)
        this.yt.playVideo()
      }
    },
    setVolume(volume) {
      if (!this.yt) {
        this.tovolume = volume
      } else {
        this.yt.setVolume(volume)
      }
    },
    playing() {
      return this.yt && this.yt.getPlayerState() === 1
    },
  },
  async mounted() {
    this.yt = await prepareYt(this.id)

    if (this.tovolume !== null) {
      this.yt.setVolume(this.tovolume)
    }
    if (this.toplay !== null) {
      log('trying to play..')
      this.play(this.toplay)
    }
    this.yt.addEventListener('onStateChange', (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        this.$emit('ended')
      }
    })
  }
}
