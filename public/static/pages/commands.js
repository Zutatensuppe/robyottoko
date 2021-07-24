import Navbar from '../components/navbar.js'
import Duration from '../components/duration.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import ResponsiveImage from '../components/responsive-image.js'
import Upload from '../components/upload.js'
import CountdownEdit from '../components/countdown-edit.js'
import CommandEdit from '../components/command-edit.js'
import WsClient from '../WsClient.js'

const newTrigger = (type) => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: '',
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minInterval: 0, // duration in ms or something parsable (eg 1s, 10m, ....)
    minLines: 0,
  },
})

const newText = () => ''

const newCmd = (type) => {
  switch (type) {
    case 'text': return {
      triggers: [newTrigger('command')],
      action: 'text',
      restrict_to: [],
      data: {
        text: [newText()],
      },
    }
    case 'media': return {
      triggers: [newTrigger('command')],
      action: 'media',
      restrict_to: [],
      data: {
        sound: {
          filename: '',
          file: '',
          volume: 100,
        },
        image: {
          filename: '',
          file: '',
        },
        minDurationMs: 1000,
      },
    }
    case 'countdown': return {
      triggers: [newTrigger('command')],
      action: 'countdown',
      restrict_to: [],
      data: {
        steps: 3,
        interval: 1000,
        intro: 'Starting countdown...',
        outro: 'Done!'
      },
    }
    case 'jisho_org_lookup': return {
      triggers: [newTrigger('command')],
      action: 'jisho_org_lookup',
      restrict_to: [],
      data: {},
    }
    case 'chatters': return {
      triggers: [newTrigger('command')],
      action: 'chatters',
      restrict_to: [],
      data: {},
    }
    default: return null
  }
}

export default {
  components: {
    Navbar,
    Player,
    VolumeSlider,
    Duration,
    ResponsiveImage,
    Upload,
    CountdownEdit,
    CommandEdit,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      commands: [],
      ws: null,

      editIdx: null,
      editCommand: null,
    }
  },
  computed: {
    widgetUrl() {
      return `${location.protocol}//${location.host}/widget/media/${this.conf.widgetToken}/`
    },
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar" class="p-1">
      <button
        class="button is-small mr-1"
        @click="add('text')"
        title="Send a message to chat"
      >Add text</button>
      <button
        class="button is-small mr-1"
        @click="add('media')"
        title="Display an image and/or play a sound"
      >Add media</button>
      <button
        class="button is-small mr-1"
        @click="add('countdown')"
        title="Add a countdown or messages spaced by time intervals"
      >Add countdown</button>
      <button
        class="button is-small mr-1"
        @click="add('jisho_org_lookup')"
        title="Lookup a word via jisho.org"
      >Add jisho_org_lookup</button>
      <button
        class="button is-small mr-1"
        @click="add('chatters')"
        title="Displays users who chatted during the stream"
      >Add chatters</button>
      <a class="button is-small" :href="widgetUrl" target="_blank">Open Media widget</a>
    </div>
  </div>
  <div id="main" ref="main">
    <command-edit
      v-if="editCommand"
      :modelValue="editCommand"
      :mode="editIdx >= commands.length ? 'create' : 'edit'"
      @update:modelValue="editedCommand"
      @cancel="editCommand=null"
      />

    <div class="table-container" v-if="commands.length > 0">
      <table class="table is-striped" ref="table">
        <thead>
          <tr>
            <th></th>
            <th>Trigger</th>
            <th>Response</th>
            <th>Type</th>
            <th>Permissions</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in commands" :key="idx">
            <td class="pl-0 pr-0">
              <button class="button is-small" @click="edit(idx)"><i class="fa fa-pencil" /></button>
            </td>
            <td class="col-triggers">
              <div v-for="(trigger, idx2) in item.triggers" :key="idx2" class="spacerow">
                <div><code v-if="item.triggers[idx2].type === 'command'">{{item.triggers[idx2].data.command}}</code></div>
                <div v-if="item.triggers[idx2].type === 'timer'">
                  <span class="is-small">Timer: </span>
                  <code>{{item.triggers[idx2].data.minLines}} lines, <duration :value="item.triggers[idx2].data.minInterval" /></code>
                </div>
              </div>
            </td>
            <td>
              <div v-if="item.action === 'jisho_org_lookup'">Outputs the translation for the searched word.</div>
              <div v-if="item.action === 'chatters'">Outputs the people who chatted during the stream.</div>
              <div v-if="item.action === 'text'">
                <template v-for="(txt, idx2) in item.data.text" :key="idx2" class="field has-addons">
                  <code>{{item.data.text[idx2]}}</code>
                  <span v-if="idx2 < item.data.text.length -1">or</span>
                </template>
              </div>
              <div v-if="item.action === 'media'" :class="item.action">
                <div class="spacerow media-holder media-holder-inline" v-if="item.data.image.file || item.data.sound.file">
                  <responsive-image v-if="item.data.image.file" :src="item.data.image.file" :title="item.data.image.filename" width="100px" height="50px" style="display:inline-block;" />
                  <i class="fa fa-plus is-justify-content-center mr-2 ml-2" v-if="item.data.image.file && item.data.sound.file" />
                  <player :src="item.data.sound.file" :name="item.data.sound.filename" :volume="item.data.sound.volume" class="button is-small is-justify-content-center" />
                  <span class="ml-2" v-if="item.data.image.file && item.data.sound.file">for at least <duration :value="item.data.minDurationMs" /></span>
                  <span class="ml-2" v-else-if="item.data.image.file">for <duration :value="item.data.minDurationMs" /></span>
                </div>
              </div>
              <div v-if="item.action === 'countdown'">
                <div v-if="(item.data.type || 'auto') === 'auto'">
                  <code>{{item.data.intro}}</code>
                  <span>→</span>
                  <template v-for="i in item.data.steps">
                    <duration :value="item.data.interval" />
                    <span>→</span>
                    <code>{{item.data.steps - i + 1}}</code>
                    <span>→</span>
                  </template>
                  <code>{{item.data.outro}}</code>
                </div>
                <div v-else>
                  <template v-for="(a,idx) in item.data.actions" :key="idx">
                    <duration v-if="a.type==='delay'" :value="a.value" />
                    <code v-if="a.type==='text'">{{a.value}}</code>
                    <span v-if="idx < item.data.actions.length - 1">→</span>
                  </template>
                </div>
              </div>
            </td>
            <td>
              {{item.action}}
            </td>
            <td>
              {{permissionsStr(item)}}
            </td>
            <td class="pl-0 pr-0">
              <button class="button is-small mr-1" @click="remove(idx)"><i class="fa fa-trash" /></button>
              <button class="button is-small" @click="duplicate(idx)"><i class="fa fa-clone" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>No commands set up</div>
  </div>
</div>
`,
  methods: {
    permissionsStr(item) {
      if (!item.restrict_to || item.restrict_to.length === 0) {
        return 'Everyone'
      }
      const parts = []
      if (item.restrict_to.includes('broadcaster')) {
        parts.push('Broadcaster')
      }
      if (item.restrict_to.includes('mod')) {
        parts.push('Moderators')
      }
      if (item.restrict_to.includes('sub')) {
        parts.push('Subscribers')
      }
      return parts.join(', ')
    },
    add(type) {
      const cmd = newCmd(type)
      if (!cmd) {
        return
      }
      this.editIdx = this.commands.length
      this.editCommand = cmd
    },
    remove(idx) {
      this.commands = this.commands.filter((val, index) => index !== idx)
      this.sendSave()
    },
    edit(idx) {
      this.editIdx = idx
      this.editCommand = this.commands[idx]
    },
    duplicate(idx) {
      this.editIdx = this.commands.length
      this.editCommand = JSON.parse(JSON.stringify(this.commands[idx]))
    },
    editedCommand(command) {
      this.commands[this.editIdx] = command
      this.sendSave()
      this.editIdx = null
      this.editCommand = null
    },
    sendSave() {
      this.sendMsg({ event: 'save', commands: this.commands })
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/general',
      this.conf.token
    )
    this.ws.onMessage('init', (data) => {
      this.commands = data.commands
    })
    this.ws.connect()
  }
}
