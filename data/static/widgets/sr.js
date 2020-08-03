function prepareYt() {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.append(tag)
    window.onYouTubeIframeAPIReady = () => {
      const player = new YT.Player('youtube-el', {
        playerVars: {
          iv_load_policy: 3, // do not load annotations
          modestbranding: 1, // remove youtube logo
        },
        events: {
          onReady: () => {
            resolve(player)
          }
        },
      })
    }
  })
}

new Vue({
  el: '#app',
  data() {
    return {
      playlist: [],
      player: null,
      ws: null,
    }
  },
  template: `
<div id="app" style="overflow: hidden">
  <div id="main" ref="main">
    <div id="player" class="video-16-9"><div id="youtube-el"></div></div>
    <div id="playlist">
      <ol>
        <li v-for="(item, idx) in playlist" :class="idx === 0 ? 'playing' : 'next'">
          <div class="title">{{ item.title || item.yt }}</div>
          <div class="meta">
            requested by {{ item.user }},
            played {{ item.plays }} time{{ item.plays === 1 ? '' : 's' }}
          </div>
          <div class="rgt vote">
            <i class="fa fa-thumbs-up"/> {{ item.goods }}
            <i class="fa fa-thumbs-down"/> {{ item.bads }}
          </div>
        </li>
      </ol>
    </div>
  </div>
</div>
`,
  watch: {
    playlist: function (newVal, oldVal) {
      if (newVal.length === 0) {
        this.player.stopVideo()
      }
    }
  },
  computed: {
    item() {
      return this.playlist[0]
    },
    hasItems() {
      return this.playlist.length !== 0
    },
  },
  methods: {
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    onMsg(e) {
      const d = JSON.parse(e.data)
      if (!d.event) {
        return
      }
      switch (d.event) {
        case 'onEnded':
        case 'skip':
        case 'remove':
        case 'clear':
          this.playlist = d.data.playlist
          this.play()
          break
        case 'dislike':
        case 'like':
        case 'onPlay':
        case 'resetStats':
        case 'shuffle':
          this.playlist = d.data.playlist
          break
        case 'add':
        case 'init':
          this.playlist = d.data.playlist
          if (!this.playing()) {
            this.play()
          }
          break
      }
    },
    playing() {
      return this.player.getPlayerState() === 1
    },
    play() {
      if (this.hasItems) {
        this.player.cueVideoById(this.item.yt)
        this.player.playVideo()
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
  },
  async mounted() {
    this.player = await prepareYt()
    this.ws = new WidgetSocket('/sr')
    this.ws.onmessage = this.onMsg

    this.player.addEventListener('onStateChange', (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        this.sendMsg({event: 'ended'})
      }
    })
    this.player.addEventListener('onError', (event) => {
      // todo: find out what happens when video is not visible in this
      //  country and if we can skip the video
      // this.sendMsg({event: 'ended'})
    })

    this.play()
  },
})
