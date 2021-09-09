import Navbar from "../components/navbar.js"
import Youtube from "../components/youtube.js"
import VolumeSlider from "../components/volume-slider.js"
import WsClient from "../WsClient.js"
import xhr from "../xhr.js"

export default {
  components: {
    Navbar,
    Youtube,
    VolumeSlider,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      playerVisible: false,
      volume: 100,
      filter: { tag: '' },
      playlist: [],
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

      filterTagInput: '',
      tagInput: '',
      tagInputIdx: -1,

      editTag: '',
      tagEditIdx: -1,

      hideFilteredOut: true,
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
      <a class="button is-small mr-1" :href="exportPlaylistUrl" target="_blank"><i class="fa fa-download mr-1"/> <span class="txt"> Export playlist</span></a>
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
        <li :class="{'is-active': tab === 'import'}" @click="tab='import'"><a>Import</a></li>
      </ul>
    </div>
    <div v-if="tab === 'import'">
      <textarea class="textarea" v-model="importPlaylist"></textarea>
      <button class="button is-small" @click="doImportPlaylist">Import now</button>
    </div>
    <div id="help" v-if="tab==='help'">
      <table class="table is-striped">
        <thead>
          <tr>
            <th>Chat command</th>
            <th>Viewer</th>
            <th>Mod</th>
            <th>Explanation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>!sr &lt;SEARCH&gt;</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>
              Search for <code>&lt;SEARCH&gt;</code> at youtube (by id or by title) and queue the
              first result in the playlist (after the first found batch of
              unplayed songs).<br />
              This only executes if <code>&lt;SEARCH&gt;</code> does not match one of the commands
              below.
            </td>
          </tr>
          <tr>
            <td><code>!sr undo</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Remove the song that was last added by oneself.</td>
          </tr>
          <tr>
            <td><code>!sr current</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Show what song is currently playing</td>
          </tr>
          <tr>
            <td><code>!sr good</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Vote the current song up</td>
          </tr>
          <tr>
            <td><code>!sr bad</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Vote the current song down</td>
          </tr>
          <tr>
            <td><code>!sr stats</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Show stats about the playlist</td>
          </tr>
          <tr>
            <td><code>!sr stat</code></td>
            <td class="positive">✔</td>
            <td class="positive">✔</td>
            <td>Alias for stats</td>
          </tr>
          <tr>
            <td><code>!sr rm</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Remove the current song from the playlist</td>
          </tr>
          <tr>
            <td><code>!sr next</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Skip to the next song</td>
          </tr>
          <tr>
            <td><code>!sr prev</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Skip to the previous song</td>
          </tr>
          <tr>
            <td><code>!sr skip</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Alias for next</td>
          </tr>
          <tr>
            <td><code>!sr shuffle</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>
              Shuffle the playlist (current song unaffected).
              <br />
              Non-played and played songs will be shuffled separately
              and non-played songs will be put after currently playing
              song.
            </td>
          </tr>
          <tr>
            <td><code>!sr resetStats</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Reset all statistics of all songs</td>
          </tr>
          <tr>
            <td><code>!sr clear</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Clear the playlist</td>
          </tr>
          <tr>
            <td><code>!sr pause</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Pause currently playing song</td>
          </tr>
          <tr>
            <td><code>!sr unpause</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Unpause currently paused song</td>
          </tr>
          <tr>
            <td><code>!sr loop</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Loop the current song</td>
          </tr>
          <tr>
            <td><code>!sr noloop</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Stop looping the current song</td>
          </tr>
          <tr>
            <td><code>!sr tag &lt;TAG&gt;</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Add tag <code>&lt;TAG&gt;</code> to the current song</td>
          </tr>
          <tr>
            <td><code>!sr rmtag &lt;TAG&gt;</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>Remove tag <code>&lt;TAG&gt;</code> from the current song</td>
          </tr>
          <tr>
            <td><code>!sr filter [&lt;TAG&gt;]</code></td>
            <td class="negative">✖</td>
            <td class="positive">✔</td>
            <td>
              Play only songs with the given tag <code>&lt;TAG&gt;</code>.
              If no tag is given, play all songs.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div id="tags" v-if="tab==='tags'">
      <table class="table is-striped">
        <tr>
          <th>Tag</th>
          <th></th>
          <th></th>
        </tr>
        <tr v-for="(tag, idx) in tags">
          <td>
            <input type="text" class="input is-small" v-model="editTag" @blur="tagEditIdx = -1" v-if="tagEditIdx === idx" @keyup.enter="updateTag(tag.value, editTag)" />
            <input type="text" class="input is-small" :value="tag.value" @focus="editTag = tag.value; tagEditIdx = idx" v-else />
          </td>
          <td>
            <span class="button is-small" v-if="tagEditIdx === idx" :disabled="tag.value === editTag ? true : null" @click="updateTag(tag.value, editTag)">Save</span>
          </td>
          <td>
            {{tag.count}}x
          </td>
        </tr>
      </table>
    </div>
    <div id="playlist" class="table-container" v-if="tab === 'playlist'">
      <div class="filters">
        <div class="currentfilter">
          <div class="mr-1 pt-1">Filter: </div>
          <span class="tag mr-1" v-if="filter.tag" @click="applyFilter('')">{{ filter.tag }} <i class="fa fa-remove ml-1" /></span>
          <div v-else class="field has-addons mr-1">
            <div class="control"><input class="input is-small filter-tag-input" type="text" v-model="filterTagInput" @keyup.enter="applyFilter(filterTagInput)" /></div>
            <div class="control"><span class="button is-small" @click="applyFilter(filterTagInput)">Apply filter</span></span></div>
          </div>
          <label class="pt-1"><input class="checkbox" type="checkbox" v-model="hideFilteredOut" /> Hide filtered out</label>
        </div>
      </div>
      <table class="table is-striped" v-if="playlist.length > 0">
        <thead>
          <tr>
            <th></th>
            <th></th>
            <th></th>
            <th>Title</th>
            <th>User</th>
            <th>Plays</th>
            <th></th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <draggable :value="playlist" @end="dragEnd" tag="tbody" handle=".handle">
          <tr v-for="(item, idx) in playlist" v-if="!hideFilteredOut || !isFilteredOut(item)">
            <td class="pt-4 handle">
              <i class="fa fa-arrows"></i>
            </td>
            <td>{{idx+1}}</td>
            <td><button
              v-if="idx !== firstIndex"
              class="button is-small"
              :disabled="isFilteredOut(item) ? true : null"
              @click="sendCtrl('playIdx', [idx])"
              title="Play"><i class="fa fa-play"/></button></td>
            <td>
              <a :href="'https://www.youtube.com/watch?v=' + item.yt" target="_blank">
                  {{ item.title || item.yt }}
                  <i class="fa fa-external-link"/>
              </a>
              <div>
                <span
                  v-for="(tag, idx2) in item.tags"
                  :key="idx"
                  class="tag"
                  @click="sendCtrl('rmtag', [tag, idx])"
                >
                  {{ tag }} <i class="fa fa-remove ml-1" />
                </span>
                <span class="button is-small" @click="startAddTag(idx)"><i class="fa fa-plus" /></span>
              </div>
              <div class="field has-addons" v-if="tagInputIdx === idx">
                <div class="control"><input class="input is-small filter-tag-input" type="text" v-model="tagInput" @keyup.enter="sendCtrl('addtag', [tagInput, idx]);tagInput = '';" /></div>
                <div class="control"><span class="button is-small" :disabled="tagInput ? null : true" @click="sendCtrl('addtag', [tagInput, idx]);tagInput = '';">Add tag</span></span></div>
              </div>
            </td>
            <td>{{ item.user }}</td>
            <td>{{ item.plays }}x</td>
            <td><button class="button is-small" @click="sendCtrl('goodIdx', [idx])"><i class="fa fa-thumbs-up mr-1"/> {{ item.goods }}</button></td>
            <td><button class="button is-small" @click="sendCtrl('badIdx', [idx])"><i class="fa fa-thumbs-down mr-1"/> {{ item.bads }}</button></td>
            <td><button class="button is-small" @click="sendCtrl('rmIdx', [idx])" title="Remove"><i class="fa fa-trash"/></button></td>
          </tr>
        </draggable>
      </table>
      <div v-else>Playlist is empty</div>
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
    firstIndex() {
      if (this.filter.tag === '') {
        return 0
      }
      return this.playlist.findIndex(item => item.tags.includes(this.filter.tag))
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
    applyFilter(tag) {
      this.sendCtrl('filter', [{ tag }])
    },
    isFilteredOut(item) {
      return this.filter.tag !== '' && !item.tags.includes(this.filter.tag)
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
    dragEnd(evt) {
      this.sendCtrl('move', [evt.oldIndex, evt.newIndex])
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
    startAddTag(idx) {
      this.tagInputIdx = idx
      this.$nextTick(() => {
        this.$el.querySelector('#playlist table .filter-tag-input').focus()
      })
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
      this.volume = data.volume
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
      this.volume = data.volume
      const oldId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      this.filter = data.filter
      this.playlist = data.playlist
      const newId = this.filteredPlaylist.length > 0 ? this.filteredPlaylist[0].id : null
      if (oldId !== newId) {
        this.play()
      }
    })
    this.ws.onMessage(['filter'], (data) => {
      this.volume = data.volume
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
      this.volume = data.volume
      this.filter = data.filter
      this.playlist = data.playlist
    })
    this.ws.onMessage(['add', 'init'], (data) => {
      this.volume = data.volume
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
