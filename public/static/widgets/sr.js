import Youtube from '../components/youtube.js'
import WsClient from '../WsClient.js'

export default {
  components: {
    Youtube,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      volume: 100,
      playlist: [],
      ws: null,
    }
  },
  template: `
<div id="app" style="overflow: hidden">
  <div id="main" ref="main">
    <div id="player" class="video-16-9"><youtube ref="youtube" @ended="ended" /></div>
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
        this.player.stop()
      }
    }
  },
  computed: {
    player() {
      return this.$refs.youtube
    },
    item() {
      return this.playlist[0]
    },
    hasItems() {
      return this.playlist.length !== 0
    },
  },
  methods: {
    ended () {
      this.sendMsg({event: 'ended'})
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    play() {
      this.adjustVolume()
      if (this.hasItems) {
        this.player.play(this.item.yt)
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
    adjustVolume() {
      this.player.setVolume(this.volume)
    }
  },
  mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/sr',
      this.conf.widgetToken
    )
    this.ws.onMessage('volume', (data) => {
      this.volume = data.volume
      this.adjustVolume()
    })
    this.ws.onMessage(['onEnded','skip', 'remove', 'clear'], (data) => {
      this.volume = data.volume
      this.playlist = data.playlist
      this.play()
    })
    this.ws.onMessage(['dislike', 'like', 'onPlay', 'resetStats', 'shuffle'], (data) => {
      this.volume = data.volume
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.volume = data.volume
      this.playlist = data.playlist
      if (!this.player.playing()) {
        this.play()
      }
    })
    this.ws.connect()
    this.play()
  },
}
