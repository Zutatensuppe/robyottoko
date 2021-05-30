import Navbar from '../components/navbar.js'
import Upload from '../components/upload.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import WsClient from '../WsClient.js'

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
    <div id="actionbar">
      <ul class="items">
        <li><button class="btn btn-primary" :disabled="!changed" @click="sendSave">Save</button>
        <li><a class="btn" :href="receiveUrl" target="_blank">Open widget</a>
        <li><a class="btn" :href="drawUrl" target="_blank">Open draw</a>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <table ref="table" v-if="settings">
      <tr>
        <td colspan="3">General</td>
      </tr>
      <tr>
        <td><code>settings.canvasWidth</code></td>
        <td><input type="text" v-model="settings.canvasWidth" /></td>
        <td>
          Width of the drawing area.<br />
          Caution: changing this will clear the area for currenty connected users.
        </td>
      </tr>
      <tr>
        <td><code>settings.canvasHeight</code></td>
        <td><input type="text" v-model="settings.canvasHeight" /></td>
        <td>
          Height of the drawing area.<br />
          Caution: changing this will clear the area for currenty connected users.
        </td>
      </tr>
      <tr>
        <td><code>settings.displayDuration</code></td>
        <td><input type="text" v-model="settings.displayDuration" /></td>
        <td>The duration in Milliseconds that each drawing will be shown</td>
      </tr>
      <tr>
        <td><code>settings.displayLatestForever</code></td>
        <td><input type="checkbox" v-model="settings.displayLatestForever" /></td>
        <td>If checked, the latest drawing will be shown indefinately.</td>
      </tr>
      <tr>
        <td><code>settings.submitButtonText</code></td>
        <td><input type="text" v-model="settings.submitButtonText" /></td>
        <td></td>
      </tr>
      <tr>
        <td><code>settings.submitConfirm</code></td>
        <td><input type="text" v-model="settings.submitConfirm" /></td>
        <td>Leave empty if no confirm is required by user before sending.</td>
      </tr>
      <tr>
        <td><code>settings.customDescription</code></td>
        <td><textarea v-model="settings.customDescription"></textarea></td>
        <td>Description text below the drawing panel.</td>
      </tr>
      <tr>
        <td><code>settings.palette</code></td>
        <td>
          <label class="square" v-for="(c,idx) in settings.palette" :key="idx">
            <input type="color" v-model="settings.palette[idx]" />
            <span class="square-inner" :style="{backgroundColor: c}"></span>
          </label>
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
              class="btn" />
            <volume-slider v-model="settings.notificationSound.volume" />
            <button class="btn" @click="settings.notificationSound = null"><i class="fa fa-remove" /></button>
          </div>
          <upload @uploaded="soundUploaded" accept="audio/*" label="Upload Audio" />
        </td>
        <td>
          Add a sound here that plays when new drawings arrive. <br />
          Note: Not played in drawing window, only in widget.
        </td>
      </tr>
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
    soundUploaded(file) {
      this.settings.notificationSound = {
        filename: file.originalname,
        file: file.filename,
        volume: 100,
      }
    },
    sendSave() {
      this.sendMsg({event: 'save', settings: {
        canvasWidth: parseInt(this.settings.canvasWidth, 10) || 720,
        canvasHeight: parseInt(this.settings.canvasHeight, 10) || 405,
        submitButtonText: this.settings.submitButtonText,
        submitConfirm: this.settings.submitConfirm,
        customDescription: this.settings.customDescription,
        palette: this.settings.palette,
        displayDuration: parseInt(this.settings.displayDuration, 10) || 5000,
        displayLatestForever: this.settings.displayLatestForever,
        notificationSound: this.settings.notificationSound,
      }})
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

    this.ws.onMessage('init', (data) => {
      this.settings = data.settings
      this.defaultSettings = data.defaultSettings
      this.unchangedJson = JSON.stringify(data.settings)
      this.drawUrl = data.drawUrl
    })
    this.ws.connect()
  }
}
