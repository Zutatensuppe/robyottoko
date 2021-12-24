import Youtube from '../components/youtube.js'
import ResponsiveImage from '../components/responsive-image.js'

const ListItem = {
  name: 'list-item',
  props: {
    item: {
      type: Object,
      required: true,
    },
  },
  template: `
    <li class="item" :data-user="item.user" :data-yt="item.yt">
      <div class="thumbnail">
        <div class="media-16-9">
          <img :src="thumbnail" />
        </div>
      </div>
      <div class="title">
        <span class="title-content title-orig">{{ item.title || item.yt }}</span>
        <span class="title-content title-dupl">{{ item.title || item.yt }}</span>
      </div>
      <div class="meta meta-left">
        <span class="meta-user"><span class="meta-user-text-before">requested by </span><span class="meta-user-name">{{ item.user }}</span><span class="meta-user-text-after"></span></span>
        <span class="meta-plays"><span class="meta-plays-text-before">played </span><span class="meta-plays-count">{{ item.plays }}</span><span class="meta-plays-text-after"> time{{ item.plays === 1 ? '' : 's' }}</span></span>
      </div>
      <div class="meta meta-right vote">
        <span class="meta-plays"><i class="fa fa-repeat"/> {{ item.plays }}</span>
        <span class="vote-up"><i class="fa fa-thumbs-up"/> {{ item.goods }}</span>
        <span class="vote-down"><i class="fa fa-thumbs-down"/> {{ item.bads }}</span>
      </div>
    </li> `,
  computed: {
    thumbnail() {
      return `https://i.ytimg.com/vi/${this.item.yt}/mqdefault.jpg`
    },
  },
}


export default {
  components: {
    Youtube,
    ResponsiveImage,
    ListItem,
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
        initAutoplay: true,
      },
      progress: 0,
      progressInterval: null,

      inited: false,
    }
  },
  template: `
  <div class="wrapper">
    <div class="player video-16-9">
      <responsive-image class="hide-video" v-if="hidevideo && settings.hideVideoImage.file" :src="settings.hideVideoImage.file" />
      <div class="hide-video" v-else-if="hidevideo"></div>
      <div class="progress" v-if="settings.showProgressBar">
        <div class="progress-value" :style="progressValueStyle"></div>
      </div>
      <youtube ref="youtube" @ended="ended" />
    </div>
    <ol class="list">
      <list-item
        v-for="(item, idx) in playlist"
        :class="idx === 0 ? 'playing' : 'not-playing'"
        v-if="!isFilteredOut(item)"
        :item="item" />
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
    progressValueStyle() {
      return {
        width: `${(this.progress * 100)}%`,
      }
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
    this.ws.onMessage(['onEnded', 'prev', 'skip', 'remove', 'clear', 'move', 'tags'], (data) => {
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
    ], (data) => {
      this.applySettings(data.settings)
      this.filter = data.filter
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.applySettings(data.settings)
      this.filter = data.filter
      this.playlist = data.playlist
      if (!this.inited && !this.player.playing()) {
        if (this.settings.initAutoplay) {
          this.play()
        }
      }
      this.inited = true
    })
    this.ws.connect()
  },
}
