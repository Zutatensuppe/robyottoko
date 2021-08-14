import Navbar from '../components/navbar.js'
import Upload from '../components/upload.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import WsClient from '../WsClient.js'
import xhr from '../xhr.js'

export default {
  components: {
    Navbar,
    Upload,
    Player,
    VolumeSlider,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      unchangedJson: '{}',
      changedJson: '{}',
      settings: null,
      defaultSettings: null,
      ws: null,

      drawUrl: '',
      allImages: [],
      hoverFavorite: '',
    }
  },
  watch: {
    settings: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch)
      }
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar" class="p-1">
      <button class="button is-small is-primary mr-1" :disabled="!changed" @click="sendSave">Save</button>
      <a class="button is-small mr-1" :href="receiveUrl" target="_blank">Open widget</a>
      <a class="button is-small " :href="drawUrl" target="_blank">Open draw</a>
    </div>
  </div>
  <div id="main" ref="main">
    <table class="table is-striped" ref="table" v-if="settings">
      <tbody>
        <tr>
          <td colspan="3">General</td>
        </tr>
        <tr>
          <td><code>settings.canvasWidth</code></td>
          <td><input class="input is-small" type="text" v-model="settings.canvasWidth" /></td>
          <td>
            Width of the drawing area.<br />
            Caution: changing this will clear the area for currenty connected users.
          </td>
        </tr>
        <tr>
          <td><code>settings.canvasHeight</code></td>
          <td><input class="input is-small" type="text" v-model="settings.canvasHeight" /></td>
          <td>
            Height of the drawing area.<br />
            Caution: changing this will clear the area for currenty connected users.
          </td>
        </tr>
        <tr>
          <td><code>settings.displayDuration</code></td>
          <td><input class="input is-small" type="text" v-model="settings.displayDuration" /></td>
          <td>The duration in Milliseconds that each drawing will be shown</td>
        </tr>
        <tr>
          <td><code>settings.displayLatestForever</code></td>
          <td><input type="checkbox" v-model="settings.displayLatestForever" /></td>
          <td>If checked, the latest drawing will be shown indefinately.</td>
        </tr>
        <tr>
          <td><code>settings.displayLatestAutomatically</code></td>
          <td><input type="checkbox" v-model="settings.displayLatestAutomatically" /></td>
          <td>If checked, the latest drawing will be shown in widget automatically.</td>
        </tr>
        <tr>
          <td><code>settings.submitButtonText</code></td>
          <td><input class="input is-small" type="text" v-model="settings.submitButtonText" /></td>
          <td></td>
        </tr>
        <tr>
          <td><code>settings.submitConfirm</code></td>
          <td><input class="input is-small" type="text" v-model="settings.submitConfirm" /></td>
          <td>Leave empty if no confirm is required by user before sending.</td>
        </tr>
        <tr>
          <td><code>settings.customDescription</code></td>
          <td><textarea class="textarea" v-model="settings.customDescription"></textarea></td>
          <td>Description text below the drawing panel.</td>
        </tr>
        <tr>
          <td><code>settings.palette</code></td>
          <td>
            <label class="square" v-for="(c,idx) in settings.palette" :key="idx">
              <input type="color" v-model="settings.palette[idx]" />
              <span class="square-inner" :style="{backgroundColor: c}"></span>
            </label>
            <br />
            <br />
            <button class="button is-small" @click="settings.palette = defaultSettings.palette">
              Reset to default palette
            </button>
          </td>
          <td>
            Default colors appearing on the draw page.<br/>
            Caution: Changing this will change selected color for
            currenty connected users.
          </td>
        </tr>
        <tr>
          <td><code>settings.notificationSound</code></td>
          <td>
            <div class="spacerow media-holder" v-if="settings.notificationSound">
              <player
                :src="settings.notificationSound.file"
                :name="settings.notificationSound.filename"
                :volume="settings.notificationSound.volume"
                class="button is-small" />
              <volume-slider v-model="settings.notificationSound.volume" />
              <button class="button is-small" @click="settings.notificationSound = null"><i class="fa fa-remove" /></button>
            </div>
            <upload @uploaded="soundUploaded" accept="audio/*" label="Upload Audio" />
          </td>
          <td>
            Add a sound here that plays when new drawings arrive. <br />
            Note: Not played in drawing window, only in widget.
          </td>
        </tr>
        <tr>
          <td>
            <code>settings.favorites</code>
            <div class="preview">
              <img v-if="hoverFavorite" :src="hoverFavorite" />
            </div>
          </td>
          <td>
            <img
              :src="url"
              v-for="(url,idx) in allImages"
              :key="idx"
              width="50"
              height="50"
              :style="{'border': settings.favorites.includes(url) ? 'solid 2px black' : 'solid 2px transparent'}"
              @click="toggleFavorite(idx)"
              @mouseover="hoverFavorite=url"
              @mouseleave="hoverFavorite=''"
              class="thumbnail" />
          </td>
          <td>
            The favorite images will always be displayed in the gallery in the draw widget.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
`,
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson
    },
    receiveUrl() {
      return `${location.protocol}//${location.host}/widget/drawcast_receive/${this.conf.widgetToken}/`
    },
  },
  methods: {
    toggleFavorite(idx) {
      const url = this.allImages[idx]
      if (this.settings.favorites.includes(url)) {
        this.settings.favorites = this.settings.favorites.filter(u => u !== url)
      } else {
        this.settings.favorites.push(url)
      }
    },
    soundUploaded(file) {
      this.settings.notificationSound = {
        filename: file.originalname,
        file: file.filename,
        volume: 100,
      }
    },
    sendSave() {
      this.sendMsg({
        event: 'save', settings: {
          canvasWidth: parseInt(this.settings.canvasWidth, 10) || 720,
          canvasHeight: parseInt(this.settings.canvasHeight, 10) || 405,
          submitButtonText: this.settings.submitButtonText,
          submitConfirm: this.settings.submitConfirm,
          customDescription: this.settings.customDescription,
          palette: this.settings.palette,
          displayDuration: parseInt(this.settings.displayDuration, 10) || 5000,
          displayLatestForever: this.settings.displayLatestForever,
          displayLatestAutomatically: this.settings.displayLatestAutomatically,
          notificationSound: this.settings.notificationSound,
          favorites: this.settings.favorites,
        }
      })
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/drawcast',
      this.conf.token
    )

    this.ws.onMessage('init', async (data) => {
      this.settings = data.settings
      this.defaultSettings = data.defaultSettings
      this.unchangedJson = JSON.stringify(data.settings)
      this.drawUrl = data.drawUrl

      const res = await xhr.get('/drawcast/all-images/', {})
      this.allImages = await res.json()
    })
    this.ws.connect()
  }
}
