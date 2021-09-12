import Youtube from '../components/youtube.js'
import ResponsiveImage from '../components/responsive-image.js'
import WsClient from '../WsClient.js'

export default {
  components: {
    Youtube,
    ResponsiveImage,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      filter: { tag: '' },
      playlist: [],
      settings: {
        volume: 100,
        hideVideoImage: {
          file: '',
          filename: '',
        },
      },
      ws: null,
    }
  },
  template: `
<div id="app" style="overflow: hidden">
  <div id="main" ref="main">
    <div id="player" class="video-16-9">
      <responsive-image class="hidevideo" v-if="hidevideo && settings.hideVideoImage.file" :src="settings.hideVideoImage.file" />
      <div class="hidevideo" v-else-if="hidevideo"></div>
      <youtube ref="youtube" @ended="ended" />
    </div>
    <div id="playlist">
      <ol>
        <li
          v-for="(item, idx) in playlist"
          :class="idx === 0 ? 'playing' : 'next'"
          v-if="!isFilteredOut(item)"
        >
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
      if (!newVal.find(item => !this.isFilteredOut(item))) {
        this.player.stop()
      }
    },
    filter: function (newVal, oldVal) {
      if (!this.playlist.find(item => !this.isFilteredOut(item))) {
        this.player.stop()
      }
    },
  },
  computed: {
    player() {
      return this.$refs.youtube
    },
    filteredPlaylist() {
      if (this.filter.tag === '') {
        return this.playlist
      }
      return this.playlist.filter(item => item.tags.includes(this.filter.tag))
    },
    hidevideo() {
      return this.item ? this.item.hidevideo : false
    },
    item() {
      return this.filteredPlaylist[0]
    },
    hasItems() {
      return this.filteredPlaylist.length !== 0
    },
  },
  methods: {
    isFilteredOut(item) {
      return this.filter.tag !== '' && !item.tags.includes(this.filter.tag)
    },
    ended() {
      this.sendMsg({ event: 'ended' })
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    play() {
      this.adjustVolume()
      if (this.hasItems) {
        this.player.play(this.item.yt)
        this.sendMsg({ event: 'play', id: this.item.id })
      }
    },
    unpause() {
      if (this.hasItems) {
        this.player.unpause()
        this.sendMsg({ event: 'unpause', id: this.item.id })
      }
    },
    pause() {
      if (this.hasItems) {
        this.player.pause()
        this.sendMsg({ event: 'pause' })
      }
    },
    adjustVolume() {
      this.player.setVolume(this.settings.volume)
    }
  },
  mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/sr',
      this.conf.widgetToken
    )
    this.ws.onMessage('settings', (data) => {
      this.settings = data.settings
    })
    this.ws.onMessage('volume', (data) => {
      this.settings.volume = data.settings.volume
      this.adjustVolume()
    })
    this.ws.onMessage(['onEnded', 'prev', 'skip', 'remove', 'clear', 'move'], (data) => {
      this.settings = data.settings
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      const newId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      if (oldId !== newId) {
        this.play()
      }
    })
    this.ws.onMessage(['filter'], (data) => {
      this.settings = data.settings
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      // play only if old id is not in new playlist
      if (!this.filteredPlaylist.find(item => item.id === oldId)) {
        this.play()
      }
    })
    this.ws.onMessage(['pause'], (data) => {
      if (this.player.playing()) {
        this.pause()
      }
    })
    this.ws.onMessage(['unpause'], (data) => {
      if (!this.player.playing()) {
        this.unpause()
      }
    })
    this.ws.onMessage(['loop'], (data) => {
      this.player.setLoop(true)
    })
    this.ws.onMessage(['noloop'], (data) => {
      this.player.setLoop(false)
    })
    this.ws.onMessage([
      'dislike',
      'like',
      'video',
      'playIdx',
      'resetStats',
      'shuffle',
      'tags',
    ], (data) => {
      this.settings = data.settings
      this.filter = data.filter
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.settings = data.settings
      this.filter = data.filter
      this.playlist = data.playlist
      if (!this.player.playing()) {
        this.play()
      }
    })
    this.ws.connect()
    this.play()
  },
}
