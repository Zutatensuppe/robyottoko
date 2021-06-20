import Navbar from "../components/navbar.js"
import Youtube from "../components/youtube.js"
import VolumeSlider from "../components/volume-slider.js"
import WsClient from "../WsClient.js"

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
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar">
      <ul class="items">
        <li><volume-slider :value="this.volume" @input="onVolumeChange" />
        <li><button class="btn" @click="sendCtrl('resetStats', [])" title="Reset stats"><i class="fa fa-eraser"/><span class="txt"> Reset stats</span></button>
        <li><button class="btn" @click="sendCtrl('clear', [])" title="Clear"><i class="fa fa-eject"/><span class="txt"> Clear</span></button>
        <li><button class="btn" @click="sendCtrl('shuffle', [])" title="Shuffle"><i class="fa fa-random"/><span class="txt"> Shuffle</span></button>
        <li><button class="btn" @click="togglePlayer" :title="togglePlayerButtonText"><i class="fa fa-tv"/><span class="txt"> {{togglePlayerButtonText}}</span></button>
        <li><button class="btn" @click="toggleHelp" :title="toggleHelpButtonText"><i class="fa fa-info"/><span class="txt"> {{toggleHelpButtonText}}</span></button>
        <li class="maybebreak" style="position: relative"><i class="fa fa-search" style="color: #60554a; position: absolute; left: 8px; top: 7px;"/><input style="padding-left: 32px; margin-right: 3px;" type="text" v-model="srinput" @keyup.enter="sr" /><button class="btn" @click="sr"><i class="fa fa-plus"/><span class="txt"> Request</span></button>
        <li><a class="btn" :href="widgetUrl" target="_blank">Open SR widget</a>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <div style="width: 640px">
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
          <td><code>!sr rm</code></td>
          <td class="negative">✖</td>
          <td class="positive">✔</td>
          <td>Remove the current song from the playlist</td>
        </tr>
        <tr>
          <td><code>!sr skip</code></td>
          <td class="negative">✖</td>
          <td class="positive">✔</td>
          <td>Skip to the next song</td>
        </tr>
        <tr>
          <td><code>!sr next</code></td>
          <td class="negative">✖</td>
          <td class="positive">✔</td>
          <td>Alias for skip</td>
        </tr>
        <tr>
          <td><code>!sr shuffle</code></td>
          <td class="negative">✖</td>
          <td class="positive">✔</td>
          <td>Shuffle the playlist (current song unaffected)</td>
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
    widgetUrl() {
      return `${location.protocol}//${location.host}/widget/sr/${this.conf.widgetToken}/`
    },
  },
  methods: {
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
      this.adjustVolume()
      if (this.playerVisible && this.hasItems) {
        this.player.play(this.item.yt)
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
    adjustVolume() {
      this.player.setVolume(this.volume)
    },
    onVolumeChange(volume) {
      this.sendCtrl('volume', [volume])
    },
  },
  mounted() {
    this.ws = new WsClient(this.conf.wsBase + '/sr', this.conf.token)
    this.ws.onMessage('volume', (data) => {
      this.volume = data.volume
      this.adjustVolume()
    })
    this.ws.onMessage(['onEnded', 'skip', 'remove', 'clear', 'move'], (data) => {
      this.volume = data.volume
      const oldId = this.playlist.length > 0 ? this.playlist[0].id : null
      const newId = data.playlist.length > 0 ? data.playlist[0].id : null
      this.playlist = data.playlist
      if (oldId !== newId) {
        this.play()
      }
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
