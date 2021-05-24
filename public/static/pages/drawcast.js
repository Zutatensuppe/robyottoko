import Navbar from '../components/navbar.js'
import WsClient from '../WsClient.js'

export default {
  components: {
    Navbar,
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
        <td><code>settings.submitButtonText</code></td>
        <td><input type="text" v-model="settings.submitButtonText" /></td>
        <td></td>
      </tr>
      <tr>
        <td><code>settings.submitConfirm</code></td>
        <td><input type="text" v-model="settings.submitConfirm" /></td>
        <td>Leave empty if no confirm is required by user before sending.</td>
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
    drawUrl() {
      return `${location.protocol}//${location.host}/widget/drawcast_draw/${this.conf.widgetToken}/`
    },
  },
  methods: {
    sendSave() {
      this.sendMsg({event: 'save', settings: {
        canvasWidth: parseInt(this.settings.canvasWidth, 10) || 720,
        canvasHeight: parseInt(this.settings.canvasHeight, 10) || 405,
        submitButtonText: this.settings.submitButtonText,
        submitConfirm: this.settings.submitConfirm,
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
    })
    this.ws.connect()
  }
}
