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
        <li><a class="btn" :href="widgetUrl" target="_blank">Open widget</a>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <table ref="table" v-if="settings">
      <tr>
        <td colspan="3">General</td>
      </tr>
      <tr>
        <td><code>settings.style.bgColor</code></td>
        <td><input type="color" v-model="settings.styles.bgColor" /></td>
        <td><button class="btn" :disabled="settings.styles.bgColor === defaultSettings.styles.bgColor" @click="settings.styles.bgColor=defaultSettings.styles.bgColor"><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.style.vAlign</code></td>
        <td>
          <div class="select">
            <i class="fa fa-caret-down" />
            <select v-model="settings.styles.vAlign">
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </div>
        </td>
        <td><button class="btn"
          :disabled="settings.styles.vAlign === defaultSettings.styles.vAlign"
          @click="settings.styles.vAlign=defaultSettings.styles.vAlign"
          ><i class="fa fa-remove"></i></button></td>
      </tr>

      <tr>
        <td colspan="3">Recognition</td>
      </tr>
      <tr>
        <td><code>settings.recognition.lang</code></td>
        <td><input type="text" v-model="settings.recognition.lang" /></td>
        <td><button class="btn"
          :disabled="settings.recognition.lang === defaultSettings.recognition.lang"
          @click="settings.recognition.lang=defaultSettings.recognition.lang"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.recognition.synthesize</code></td>
        <td><input type="checkbox" v-model="settings.recognition.synthesize" /></td>
        <td><button class="btn"
          :disabled="settings.recognition.synthesize === defaultSettings.recognition.synthesize"
          @click="settings.translation.enabled=defaultSettings.translation.enabled"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.recognition.display</code></td>
        <td><input type="checkbox" v-model="settings.recognition.display" /></td>
        <td><button class="btn"
          :disabled="settings.recognition.display === defaultSettings.recognition.display"
          @click="settings.recognition.display=defaultSettings.recognition.display"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.color</code></td>
        <td><input type="color" v-model="settings.styles.recognition.color" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.color === defaultSettings.styles.recognition.color"
          @click="settings.styles.recognition.color=defaultSettings.styles.recognition.color"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.strokeWidth</code></td>
        <td><input type="text" v-model="settings.styles.recognition.strokeWidth" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.strokeWidth === defaultSettings.styles.recognition.strokeWidth"
          @click="settings.styles.recognition.strokeWidth=defaultSettings.styles.recognition.strokeWidth"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.strokeColor</code></td>
        <td><input type="color" v-model="settings.styles.recognition.strokeColor" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.strokeColor === defaultSettings.styles.recognition.strokeColor"
          @click="settings.styles.recognition.strokeColor=defaultSettings.styles.recognition.strokeColor"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.fontFamily</code></td>
        <td><input type="text" v-model="settings.styles.recognition.fontFamily" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.fontFamily === defaultSettings.styles.recognition.fontFamily"
          @click="settings.styles.recognition.fontFamily=defaultSettings.styles.recognition.fontFamily"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.fontSize</code></td>
        <td><input type="text" v-model="settings.styles.recognition.fontSize" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.fontSize === defaultSettings.styles.recognition.fontSize"
          @click="settings.styles.recognition.fontSize=defaultSettings.styles.recognition.fontSize"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.recognition.fontWeight</code></td>
        <td><input type="text" v-model="settings.styles.recognition.fontWeight" /></td>
        <td><button class="btn"
          :disabled="settings.styles.recognition.fontWeight === defaultSettings.styles.recognition.fontWeight"
          @click="settings.styles.weight=defaultSettings.styles.weight"
          ><i class="fa fa-remove"></i></button></td>
      </tr>

      <tr>
        <td colspan="3">Translation</td>
      </tr>
      <tr>
        <td><code>settings.translation.enabled</code></td>
        <td><input type="checkbox" v-model="settings.translation.enabled" /></td>
        <td><button class="btn"
          :disabled="settings.translation.enabled === defaultSettings.translation.enabled"
          @click="settings.translation.enabled=defaultSettings.translation.enabled"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.translation.synthesize</code></td>
        <td><input type="checkbox" v-model="settings.translation.synthesize" /></td>
        <td><button class="btn"
          :disabled="settings.translation.synthesize === defaultSettings.translation.synthesize"
          @click="settings.translation.synthesize=defaultSettings.translation.synthesize"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.translation.langSrc</code></td>
        <td><input type="text" v-model="settings.translation.langSrc" /></td>
        <td><button class="btn"
          :disabled="settings.translation.langSrc === defaultSettings.translation.langSrc"
          @click="settings.translation.langSrc=defaultSettings.translation.langSrc"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.translation.langDst</code></td>
        <td><input type="text" v-model="settings.translation.langDst" /></td>
        <td><button class="btn"
          :disabled="settings.translation.langDst === defaultSettings.translation.langDst"
          @click="settings.translation.langDst=defaultSettings.translation.langDst"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.color</code></td>
        <td><input type="color" v-model="settings.styles.translation.color" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.color === defaultSettings.styles.translation.color"
          @click="settings.styles.translation.color=defaultSettings.styles.translation.color"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.strokeWidth</code></td>
        <td><input type="text" v-model="settings.styles.translation.strokeWidth" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.strokeWidth === defaultSettings.styles.translation.strokeWidth"
          @click="settings.styles.translation.strokeWidth=defaultSettings.styles.translation.strokeWidth"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.strokeColor</code></td>
        <td><input type="color" v-model="settings.styles.translation.strokeColor" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.strokeColor === defaultSettings.styles.translation.strokeColor"
          @click="settings.styles.translation.strokeColor=defaultSettings.styles.translation.strokeColor"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.fontFamily</code></td>
        <td><input type="text" v-model="settings.styles.translation.fontFamily" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.fontFamily === defaultSettings.styles.translation.fontFamily"
          @click="settings.styles.translation.fontFamily=defaultSettings.styles.translation.fontFamily"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.fontSize</code></td>
        <td><input type="text" v-model="settings.styles.translation.fontSize" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.fontSize === defaultSettings.styles.translation.fontSize"
          @click="settings.styles.translation.fontSize=defaultSettings.styles.translation.fontSize"
          ><i class="fa fa-remove"></i></button></td>
      </tr>
      <tr>
        <td><code>settings.styles.translation.fontWeight</code></td>
        <td><input type="text" v-model="settings.styles.translation.fontWeight" /></td>
        <td><button class="btn"
          :disabled="settings.styles.translation.fontWeight === defaultSettings.styles.translation.fontWeight"
          @click="settings.styles.weight=defaultSettings.styles.weight"
          ><i class="fa fa-remove"></i></button></td>
      </tr>

      <tr>
        <td colspan="3">Debug</td>
      </tr>
      <tr>
        <td><code>settings.status.enabled</code></td>
        <td><input type="checkbox" v-model="settings.status.enabled" /></td>
        <td><button class="btn" :disabled="settings.status.enabled === defaultSettings.status.enabled" @click="settings.status.enabled=defaultSettings.status.enabled"><i class="fa fa-remove"></i></button></td>
      </tr>
    </table>
  </div>
</div>
`,
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson
    },
    widgetUrl() {
      return `${location.protocol}//${location.host}/widget/speech-to-text/${this.conf.widgetToken}/`
    },
  },
  methods: {
    sendSave() {
      this.sendMsg({event: 'save', settings: this.settings})
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/speech-to-text',
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
