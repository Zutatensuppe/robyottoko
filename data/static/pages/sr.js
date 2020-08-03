function prepareYt() {
  return new Promise((resolve, reject) => {
    const tag = document.createElement('script')
    tag.src = "https://www.youtube.com/iframe_api"
    document.head.append(tag)
    window.onYouTubeIframeAPIReady = () => {
      const player = new YT.Player('youtube-el', {
        playerVars: {
          iv_load_policy: 3, // do not load annotations
          modestbranding: 1, // remove youtube logo
        },
        events: {
          onReady: () => {
            resolve(player)
          }
        },
      })
    }
  })
}

new Vue({
  el: '#app',
  data() {
    return {
      playerVisible: false,
      playlist: [],
      player: null,
      ws: null,
      controls: [
        'good',
        'bad',
        'skip',
        'resetStats',
        'clear',
        'rm',
        'shuffle',
      ],
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar />
    <div id="actionbar">
      <ul class="items">
        <li v-for="ctrl in controls"><button class="btn" @click="sendCtrl(ctrl, [])">!sr {{ctrl}}</button>
        <li><button class="btn" @click="togglePlayer">{{togglePlayerButtonText}}</button>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <div id="player" class="video-16-9" :style="playerstyle"><div id="youtube-el"></div></div>
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
        this.player.stopVideo()
      }
    }
  },
  computed: {
    item() {
      return this.playlist[0]
    },
    hasItems() {
      return this.playlist.length !== 0
    },
    playerstyle() {
      return this.playerVisible ? '' : 'width: 0;height: 0;padding:0;'
    },
    togglePlayerButtonText() {
      return this.playerVisible ? 'Hide Player' : 'Show Player'
    }
  },
  methods: {
    togglePlayer() {
      this.playerVisible = !this.playerVisible
      if (this.playerVisible) {
        if (!this.playing()) {
          this.play()
        }
      } else {
        this.player.stopVideo()
      }
    },
    sendCtrl(ctrl, args) {
      this.sendMsg({event: 'ctrl', ctrl, args})
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
          if (!this.playing()) {
            this.play()
          }
          break
      }
    },
    playing() {
      return this.player.getPlayerState() === 1
    },
    play() {
      if (this.playerVisible && this.hasItems) {
        this.player.cueVideoById(this.item.yt)
        this.player.playVideo()
        this.sendMsg({event: 'play', id: this.item.id})
      }
    },
  },
  async mounted() {
    this.player = await prepareYt()
    this.ws = new Sockhyottoko('/sr')
    this.ws.onmessage = this.onMsg
    this.$refs.main.style.marginTop = 'calc(' + this.$refs.top.clientHeight + 'px + 1em)'

    this.player.addEventListener('onStateChange', (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        this.sendMsg({event: 'ended'})
      }
    })

    this.play()
  },
})
