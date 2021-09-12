import Navbar from "../components/navbar.js"
import Youtube from "../components/youtube.js"
import VolumeSlider from "../components/volume-slider.js"
import WsClient from "../WsClient.js"
import xhr from "../xhr.js"
import PlaylistEditor from './sr/playlist-editor.js'
import TagsEditor from './sr/tags-editor.js'
import Help from './sr/help.js'

export default {
  components: {
    Navbar,
    Youtube,
    VolumeSlider,
    Help,
    PlaylistEditor,
    TagsEditor,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      playerVisible: false,
      volume: 100,
      playlist: [],
      filter: { tag: '' },
      ws: null,
      srinput: '',

      tab: 'playlist', // playlist|help|import|tags

      // hacky: list of volumeChanges initialized by self
      // volume change is a ctrl sent to server without directly
      // changing anything. only when the response from server
      // arrives will the volume change be made. when that change is
      // made, the volume slider would jump (if many volume changes
      // are made in quick succession, this looks and feels choppy)
      // so we store our local volume changes, and if a volume change
      // arrives from server which corresponds to our local one, we
      // do not change the VISUAL volume level, as it should already
      // be changed... should be solved smarter (send maybe send some
      // id with each request and see if WE sent the request or another)
      volumeChanges: [],

      importPlaylist: '',
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar" class="p-1">
      <volume-slider class="mr-1" :value="volume" @input="onVolumeChange" />

      <button class="button is-small mr-1" @click="sendCtrl('resetStats', [])" title="Reset stats"><i class="fa fa-eraser mr-1"/><span class="txt"> Reset stats</span></button>
      <button class="button is-small mr-1" @click="sendCtrl('clear', [])" title="Clear"><i class="fa fa-eject mr-1"/><span class="txt"> Clear</span></button>
      <button class="button is-small mr-1" @click="sendCtrl('shuffle', [])" title="Shuffle"><i class="fa fa-random mr-1"/><span class="txt"> Shuffle</span></button>
      <button class="button is-small mr-1" @click="togglePlayer" :title="togglePlayerButtonText"><i class="fa fa-tv mr-1"/><span class="txt"> {{togglePlayerButtonText}}</span></button>

      <div class="field has-addons mr-1">
        <div class="control has-icons-left">
          <input class="input is-small" v-model="srinput" @keyup.enter="sr">
          <span class="icon is-small is-left">
            <i class="fa fa-search"></i>
          </span>
        </div>
        <div class="control">
          <button class="button is-small" @click="sr">Request</button>
        </div>
      </div>
      <a class="button is-small mr-1" :href="widgetUrl" target="_blank">Open SR widget</a>
    </div>
  </div>
  <div id="main" ref="main">
    <div style="width: 640px; max-width: 100%;">
      <div id="player" class="video-16-9" :style="playerstyle"><youtube ref="youtube" @ended="ended"/></div>
    </div>
    <div class="tabs">
      <ul>
        <li :class="{'is-active': tab === 'playlist'}" @click="tab='playlist'"><a>Playlist</a></li>
        <li :class="{'is-active': tab === 'help'}" @click="tab='help'"><a>Help</a></li>
        <li :class="{'is-active': tab === 'tags'}" @click="tab='tags'"><a>Tags</a></li>
        <li :class="{'is-active': tab === 'import'}" @click="tab='import'"><a>Import/Export</a></li>
      </ul>
    </div>
    <div v-if="tab === 'import'">
      <div class="mb-1">
        <a class="button is-small mr-1" :href="exportPlaylistUrl" target="_blank"><i class="fa fa-download mr-1"/> Export playlist</a>
        <button class="button is-small" @click="doImportPlaylist"><i class="fa fa-upload mr-1"/> Import playlist</button>
      </div>
      <textarea class="textarea mb-1" v-model="importPlaylist"></textarea>
    </div>
    <div id="help" v-if="tab==='help'">
      <help />
    </div>
    <div id="tags" v-if="tab==='tags'">
      <tags-editor :tags="tags" @updateTag="onTagUpdated" />
    </div>
    <div id="playlist" class="table-container" v-if="tab === 'playlist'">
      <playlist-editor
        :playlist="playlist"
        :filter="filter"
        @stopPlayer="player.stop()"
        @filterChange="applyFilter"
        @ctrl="onPlaylistCtrl" />
    </div>
  </div>
</div>
`,
  computed: {
    tags() {
      const tags = []
      this.playlist.forEach(item => {
        item.tags.forEach(tag => {
          const index = tags.findIndex(t => t.value === tag)
          if (index === -1) {
            tags.push({ value: tag, count: 1 })
          } else {
            tags[index].count++
          }
        })
      })
      return tags
    },
    player() {
      return this.$refs.youtube
    },
    filteredPlaylist() {
      if (this.filter.tag === '') {
        return this.playlist
      }
      return this.playlist.filter(item => item.tags.includes(this.filter.tag))
    },
    item() {
      return this.filteredPlaylist[0]
    },
    hasItems() {
      return this.filteredPlaylist.length !== 0
    },
    playerstyle() {
      return this.playerVisible ? '' : 'width:0;height:0;padding:0;margin-bottom:0;'
    },
    togglePlayerButtonText() {
      return this.playerVisible ? 'Hide Player' : 'Show Player'
    },
    importPlaylistUrl() {
      return `${location.protocol}//${location.host}/sr/import`
    },
    exportPlaylistUrl() {
      return `${location.protocol}//${location.host}/sr/export`
    },
    widgetUrl() {
      return `${location.protocol}//${location.host}/widget/sr/${this.conf.widgetToken}/`
    },
  },
  methods: {
    onTagUpdated(evt) {
      this.updateTag(evt[0], evt[1])
    },
    onPlaylistCtrl(evt) {
      this.sendCtrl(evt[0], evt[1])
    },
    applyFilter(tag) {
      this.sendCtrl('filter', [{ tag }])
    },
    async doImportPlaylist() {
      const res = await xhr.post(this.importPlaylistUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: this.importPlaylist,
      })
      if (res.status === 200) {
        this.tab = 'playlist'
        this.$toasted.success('Import successful')
      } else {
        this.$toasted.error('Import failed')
      }
    },
    togglePlayer() {
      this.playerVisible = !this.playerVisible
      if (this.playerVisible) {
        if (!this.player.playing()) {
          this.play()
        }
      } else {
        this.player.stop()
      }
    },
    sr() {
      if (this.srinput !== '') {
        this.sendCtrl('sr', [this.srinput])
      }
    },
    sendCtrl(ctrl, args) {
      this.sendMsg({ event: 'ctrl', ctrl, args })
    },
    ended() {
      this.sendMsg({ event: 'ended' })
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    play() {
      this.adjustVolume(this.volume)
      if (this.playerVisible && this.hasItems) {
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
      if (this.playerVisible && this.hasItems) {
        this.player.pause()
        this.sendMsg({ event: 'pause' })
      }
    },
    adjustVolume(volume) {
      this.player.setVolume(volume)
    },
    onVolumeChange(volume) {
      this.volumeChanges.push(volume)
      this.sendCtrl('volume', [volume])
    },
    updateTag(oldTag, newTag) {
      if (oldTag === newTag) {
        return
      }
      this.sendCtrl('updatetag', [oldTag, newTag])
      this.tagEditIdx = -1
    },
  },
  mounted() {
    this.ws = new WsClient(this.conf.wsBase + '/sr', this.conf.token)
    this.ws.onMessage('volume', (data) => {
      // this assumes that all volume changes are done by us
      // otherwise this would probably fail ;C
      if (this.volumeChanges.length > 0) {
        const firstChange = this.volumeChanges.shift()
        if (firstChange === data.volume) {
          this.adjustVolume(data.volume)
          return
        }
      }
      this.volume = parseInt(`${data.volume}`, 10)
      this.adjustVolume(this.volume)
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
    this.ws.onMessage(['onEnded', 'prev', 'skip', 'remove', 'clear', 'move'], (data) => {
      this.volume = parseInt(`${data.volume}`, 10)
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      const newId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      if (oldId !== newId) {
        this.play()
      }
    })
    this.ws.onMessage(['filter'], (data) => {
      this.volume = parseInt(`${data.volume}`, 10)
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      // play only if old id is not in new playlist
      if (!this.filteredPlaylist.find(item => item.id === oldId)) {
        this.play()
      }
    })
    this.ws.onMessage([
      'dislike',
      'like',
      'playIdx',
      'resetStats',
      'shuffle',
      'tags',
    ], (data) => {
      this.volume = parseInt(`${data.volume}`, 10)
      this.filter = data.filter
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.volume = parseInt(`${data.volume}`, 10)
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
