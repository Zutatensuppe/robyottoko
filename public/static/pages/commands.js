import Navbar from '../components/navbar.js'
import Duration from '../components/duration.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import ResponsiveImage from '../components/responsive-image.js'
import Upload from '../components/upload.js'
import CountdownEdit from '../components/countdown-edit.js'
import CommandEdit from '../components/command-edit.js'
import DoubleclickButton from '../components/doubleclick-button.js'
import WsClient from '../WsClient.js'
import commands from '../commands.js'
import fn from '../fn.js'

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
    DoubleclickButton,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      commands: [],
      globalVariables: [],
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
        @click="add('madochan_createword')"
        title="Create a word with madochan"
      >Add madochan</button>
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
      :globalVariables="globalVariables"
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
            <th></th>
            <th>Trigger</th>
            <th>Response</th>
            <th>Type</th>
            <th>Permissions</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <draggable :value="commands" @end="dragEnd" tag="tbody" handle=".handle">
          <tr v-for="(item, idx) in commands" :key="idx">
            <td class="pt-4 handle">
              <i class="fa fa-arrows"></i>
            </td>
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
              <div v-if="item.action === 'madochan_createword'">Creates a word for a definition.</div>
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
                  <code>{{item.data.steps}}</code> ✕ <duration :value="item.data.interval" />
                  <span>→</span>
                  <code>{{item.data.outro}}</code>
                </div>
                <div v-else>
                  <template v-for="(a,idx) in item.data.actions" :key="idx">
                    <duration v-if="a.type==='delay'" :value="a.value" />
                    <code v-if="a.type==='text'">{{a.value}}</code>
                    <code v-if="a.type==='media'">
                      Media(<span v-if="a.value.image.file">{{a.value.image.filename}}</span><span
                      v-if="a.value.image.file && a.value.sound.file">+</span><span
                      v-if="a.value.sound.file">{{a.value.sound.filename}}</span>)
                    </code>
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
              <doubleclick-button
                class="button is-small mr-1"
                message="Are you sure?"
                timeout="1000"
                @doubleclick="remove(idx)"><i class="fa fa-trash" /></doubleclick-button>
              <button class="button is-small" @click="duplicate(idx)"><i class="fa fa-clone" /></button>
            </td>
          </tr>
        </draggable>
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
      const cmd = commands.newCmd(type)
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
    dragEnd(evt) {
      this.commands = fn.arrayMove(
        this.commands,
        evt.oldIndex,
        evt.newIndex
      )
      this.sendSave()
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/general',
      this.conf.token
    )
    this.ws.onMessage('init', (data) => {
      this.commands = data.commands
      this.globalVariables = data.globalVariables
    })
    this.ws.connect()
  }
}
