import Navbar from "../components/navbar.js"
import Youtube from "../components/youtube.js"
import WsClient from "../WsClient.js"

export default {
  components: {
    Navbar,
    Youtube,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      playerVisible: false,
      volume: 100,
      playlist: [],
      ws: null,
      srinput: '',
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user" />
    <div id="actionbar">
      <ul class="items">
        <li>
          <span class="range volume-slider">
            <i class="fa fa-volume-down"/>
            <input type="range" min="0" max="100" :value="this.volume" @change="sendCtrl('volume', [parseInt($event.target.value, 10)])" />
            <i class="fa fa-volume-up"/>
          </span>
        <li><button class="btn" @click="sendCtrl('resetStats', [])" title="Reset stats"><i class="fa fa-eraser"/><span class="txt"> Reset stats</span></button>
        <li><button class="btn" @click="sendCtrl('clear', [])" title="Clear"><i class="fa fa-eject"/><span class="txt"> Clear</span></button>
        <li><button class="btn" @click="sendCtrl('shuffle', [])" title="Shuffle"><i class="fa fa-random"/><span class="txt"> Shuffle</span></button>
        <li><button class="btn" @click="togglePlayer" :title="togglePlayerButtonText"><i class="fa fa-tv"/><span class="txt"> {{togglePlayerButtonText}}</span></button>
        <li class="maybebreak" style="position: relative"><i class="fa fa-search" style="color: #60554a; position: absolute; left: 8px; top: 7px;"/><input style="padding-left: 32px; margin-right: 3px;" type="text" v-model="srinput" @keyup.enter="sr" /><button class="btn" @click="sr"><i class="fa fa-plus"/><span class="txt"> Request</span></button>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <div style="width: 640px">
      <div id="player" class="video-16-9" :style="playerstyle"><youtube ref="youtube" @ended="ended"/></div>
    </div>
    <div id="playlist">
      <table>
        <tr>
          <th></th>
          <th></th>
          <th>Title</th>
          <th>User</th>
          <th>Plays</th>
          <th></th>
        </tr>
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
      </table>
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
      return this.playerVisible ? '' : 'width: 0;height: 0;padding:0;margin-bottom:0;'
    },
    togglePlayerButtonText() {
      return this.playerVisible ? 'Hide Player' : 'Show Player'
    }
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
    sr() {
      if (this.srinput !== '') {
        this.sendCtrl('sr', [this.srinput])
      }
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
    }
  },
  mounted() {
    this.ws = new WsClient(this.conf.wsBase + '/sr', this.conf.token)
    this.ws.onMessage('volume', (data) => {
      this.volume = data.volume
      this.adjustVolume()
    })
    this.ws.onMessage(['onEnded', 'skip', 'remove', 'clear'], (data) => {
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

    this.$refs.main.style.marginTop = this.$refs.top.clientHeight + 'px'
    this.play()
  },
}
