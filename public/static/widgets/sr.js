import Youtube from "../components/youtube.js"
import Ws from "../ws.js"

export default {
  components: {
    Youtube,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
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
          if (!this.player.playing()) {
            this.play()
          }
          break
      }
    },
    play() {
      if (this.hasItems) {
        this.player.play(this.item.yt)
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
  },
  mounted() {
    this.ws = new Ws(this.conf.wsBase + '/sr', this.conf.widgetToken)
    this.ws.onmessage = this.onMsg
    this.play()
  },
}
