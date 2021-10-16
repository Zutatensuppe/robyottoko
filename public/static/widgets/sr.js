import Youtube from '../components/youtube.js'
import ResponsiveImage from '../components/responsive-image.js'

export default {
  components: {
    Youtube,
    ResponsiveImage,
  },
  props: {
    ws: Object,
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
        customCss: '',
        showProgressBar: false,
      },
      progress: 0,
      progressInterval: null,
    }
  },
  template: `
  <div class="wrapper">
    <div class="player video-16-9">
      <responsive-image class="hide-video" v-if="hidevideo && settings.hideVideoImage.file" :src="settings.hideVideoImage.file" />
      <div class="hide-video" v-else-if="hidevideo"></div>
      <progress max="1" :value="progress" class="progress" v-if="settings.showProgressBar"></progress>
      <youtube ref="youtube" @ended="ended" />
    </div>
    <ol class="list">
      <li
        v-for="(item, idx) in playlist"
        class="item"
        :class="idx === 0 ? 'playing' : 'not-playing'"
        v-if="!isFilteredOut(item)"
      >
        <div class="title">{{ item.title || item.yt }}</div>
        <div class="meta">
          <span class="meta-user">requested by {{ item.user }}</span>
          <span class="meta-plays">played {{ item.plays }} time{{ item.plays === 1 ? '' : 's' }}</span>
        </div>
        <div class="vote">
          <span class="vote-up"><i class="fa fa-thumbs-up"/> {{ item.goods }}</span>
          <span class="vote-down"><i class="fa fa-thumbs-down"/> {{ item.bads }}</span>
        </div>
      </li>
    </ol>
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
      if (this.player) {
        this.player.setVolume(this.settings.volume)
      }
    },
    applySettings(settings) {
      if (this.settings.customCss !== settings.customCss) {
        let el = document.getElementById('customCss')
        if (el) {
          el.parentElement.removeChild(el)
        }
        el = document.createElement("style")
        el.id = 'customCss'
        el.textContent = settings.customCss
        document.head.appendChild(el)
      }
      if (this.settings.showProgressBar !== settings.showProgressBar) {
        if (this.progressInterval) {
          window.clearInterval(this.progressInterval)
        }
        if (settings.showProgressBar) {
          this.progressInterval = window.setInterval(() => {
            if (this.player) {
              this.progress = this.player.getProgress()
            }
          }, 500);
        }
      }
      this.settings = settings
      this.adjustVolume()
    }
  },
  mounted() {
    this.ws.onMessage('settings', (data) => {
      this.applySettings(data.settings)
    })
    this.ws.onMessage(['onEnded', 'prev', 'skip', 'remove', 'clear', 'move'], (data) => {
      this.applySettings(data.settings)
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      const newId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      if (oldId !== newId) {
        this.play()
      }
    })
    this.ws.onMessage(['filter'], (data) => {
      this.applySettings(data.settings)
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
      this.applySettings(data.settings)
      this.filter = data.filter
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.applySettings(data.settings)
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
