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
      helpVisible: false,
      volume: 100,
      playlist: [],
      ws: null,
      srinput: '',

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

      importVisible: false,
      importPlaylist: '',
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar">
      <ul class="items">
        <li><volume-slider :value="volume" @input="onVolumeChange" />
        <li><button class="btn" @click="sendCtrl('resetStats', [])" title="Reset stats"><i class="fa fa-eraser"/><span class="txt"> Reset stats</span></button>
        <li><button class="btn" @click="sendCtrl('clear', [])" title="Clear"><i class="fa fa-eject"/><span class="txt"> Clear</span></button>
        <li><button class="btn" @click="sendCtrl('shuffle', [])" title="Shuffle"><i class="fa fa-random"/><span class="txt"> Shuffle</span></button>
        <li><button class="btn" @click="togglePlayer" :title="togglePlayerButtonText"><i class="fa fa-tv"/><span class="txt"> {{togglePlayerButtonText}}</span></button>
        <li><button class="btn" @click="toggleHelp" :title="toggleHelpButtonText"><i class="fa fa-info"/><span class="txt"> {{toggleHelpButtonText}}</span></button>
        <li class="maybebreak" style="position: relative"><i class="fa fa-search" style="color: #60554a; position: absolute; left: 8px; top: 7px;"/><input style="padding-left: 32px; margin-right: 3px;" type="text" v-model="srinput" @keyup.enter="sr" /><button class="btn" @click="sr"><i class="fa fa-plus"/><span class="txt"> Request</span></button>
        <li><a class="btn" :href="widgetUrl" target="_blank">Open SR widget</a>
        <li><a class="btn" :href="exportPlaylistUrl" target="_blank"><i class="fa fa-download"/><span class="txt"> Export playlist</span></a>
        <li><button class="btn" @click="toggleImport"><i class="fa fa-upload"/><span class="txt"> Import playlist</span></button>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <div v-if="importVisible">
      <textarea v-model="importPlaylist"></textarea>
      <button class="btn" @click="doImportPlaylist">Import now</button>
    </div>
    <div style="width: 640px; max-width: 100%;">
      <div id="player" class="video-16-9" :style="playerstyle"><youtube ref="youtube" @ended="ended"/></div>
    </div>
    <div id="help" v-if="helpVisible">
      <table>
        <tr>
          <th>Chat command</th>
          <th>Viewer</th>
          <th>Mod</th>
          <th>Explanation</th>
        </tr>
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
      </table>
    </div>
    <div id="playlist" v-if="!helpVisible">
      <table v-if="playlist.length > 0">
        <draggable :value="playlist" @end="dragEnd">
          <tr v-for="(item, idx) in playlist">
            <td>{{idx+1}}</td>
            <td><button v-if="idx !== 0" class="btn" @click="sendCtrl('playIdx', [idx])" title="Play"><i class="fa fa-play"/></button></td>
            <td>
              <a :href="'https://www.youtube.com/watch?v=' + item.yt" target="_blank">
                  {{ item.title || item.yt }}
                  <i class="fa fa-external-link"/>
              </a>
            </td>
            <td>{{ item.user }}</td>
            <td>{{ item.plays }}x</td>
            <td><button class="btn" @click="sendCtrl('goodIdx', [idx])"><i class="fa fa-thumbs-up"/> {{ item.goods }}</button></td>
            <td><button class="btn" @click="sendCtrl('badIdx', [idx])"><i class="fa fa-thumbs-down"/> {{ item.bads }}</button></td>
            <td><button class="btn" @click="sendCtrl('rmIdx', [idx])" title="Remove"><i class="fa fa-trash"/></button></td>
          </tr>
          <tr slot="header">
            <th></th>
            <th></th>
            <th>Title</th>
            <th>User</th>
            <th>Plays</th>
            <th></th>
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
    playerstyle() {
      return this.playerVisible ? '' : 'width:0;height:0;padding:0;margin-bottom:0;'
    },
    togglePlayerButtonText() {
      return this.playerVisible ? 'Hide Player' : 'Show Player'
    },
    toggleHelpButtonText() {
      return this.helpVisible ? 'Hide Help' : 'Show Help'
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
    async doImportPlaylist() {
      const res = await xhr.post(this.importPlaylistUrl, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: this.importPlaylist,
      })
      if (res.status === 200) {
        this.importVisible = false
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
    toggleImport() {
      this.importVisible = !this.importVisible
    },
    toggleHelp() {
      this.helpVisible = !this.helpVisible
    },
    sr() {
      if (this.srinput !== '') {
        this.sendCtrl('sr', [this.srinput])
      }
    },
    dragEnd(evt) {
      // console.log(evt.oldIndex - 1, evt.newIndex - 1)
      this.sendCtrl('move', [evt.oldIndex - 1, evt.newIndex - 1])
    },
    sendCtrl(ctrl, args) {
      this.sendMsg({event: 'ctrl', ctrl, args})
    },
    ended() {
      this.sendMsg({event: 'ended'})
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    play() {
      this.adjustVolume(this.volume)
      if (this.playerVisible && this.hasItems) {
        this.player.play(this.item.yt)
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
    unpause() {
      if (this.hasItems) {
        this.player.unpause()
        this.sendMsg({event: 'unpause', id: this.item.id})
      }
    },
    pause() {
      if (this.playerVisible && this.hasItems) {
        this.player.pause()
        this.sendMsg({event: 'pause'})
      }
    },
    adjustVolume(volume) {
      this.player.setVolume(volume)
    },
    onVolumeChange(volume) {
      this.volumeChanges.push(volume)
      this.sendCtrl('volume', [volume])
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
      const oldId = this.playlist.length > 0 ? this.playlist[0].id : null
      const newId = data.playlist.length > 0 ? data.playlist[0].id : null
      this.playlist = data.playlist
      if (oldId !== newId) {
        this.play()
      }
    })
    this.ws.onMessage(['dislike', 'like', 'playIdx', 'resetStats', 'shuffle'], (data) => {
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
