import Navbar from '../components/navbar.js'
import Player from '../components/player.js'
import VolumeSlider from '../components/volume-slider.js'
import ResponsiveImage from '../components/responsive-image.js'
import Upload from '../components/upload.js'
import CountdownEdit from '../components/countdown-edit.js'
import WsClient from '../WsClient.js'

const newTrigger = (type) => ({
  type,
  data: {
    // for trigger type "command" (todo: should only exist if type is command, not always)
    command: '',
    // for trigger type "timer" (todo: should only exist if type is timer, not always)
    minSeconds: 0,
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
    ResponsiveImage,
    Upload,
    CountdownEdit,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      unchangedJson: '[]',
      changedJson: '[]',
      commands: [],
      ws: null,
      newtriggers: [],
    }
  },
  watch: {
    commands: {
      deep: true,
      handler(ch) {
        this.changedJson = JSON.stringify(ch)
      }
    }
  },
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson
    },
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
      <button
        class="button is-small mr-1 is-primary"
        :disabled="!changed"
        @click="sendSave">Save</button>
      <a class="button is-small" :href="widgetUrl" target="_blank">Open Media widget</a>
    </div>
  </div>
  <div id="main" ref="main">
    <table class="table is-striped" ref="table" v-if="commands.length > 0">
      <thead>
        <tr>
            <th>Trigger</th>
            <th>Action</th>
            <th>Settings</th>
            <th>Streamer</th>
            <th>Mod</th>
            <th>Sub</th>
            <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, idx) in commands" :key="idx">
            <td>
                <div v-for="(trigger, idx2) in item.triggers" :key="idx2" class="spacerow">
                    <div class="field has-addons" v-if="item.triggers[idx2].type === 'command'">
                      <div class="control has-icons-left">
                        <input class="input is-small" type="text" v-model="item.triggers[idx2].data.command" />
                        <span class="icon is-small is-left">
                          <i class="fa fa-comments-o"></i>
                        </span>
                      </div>
                      <div class="control">
                        <button class="button is-small" :disabled="item.triggers.length <= 1" @click="rmtrigger(idx, idx2)"><i class="fa fa-remove" /></button>
                      </div>
                    </div>

                    <div v-if="item.triggers[idx2].type === 'timer'" class="timer-trigger">
                      <div class="control">
                        <button class="button is-small" :disabled="item.triggers.length <= 1" @click="rmtrigger(idx, idx2)"><i class="fa fa-remove" /></button>
                      </div>
                      <div class="field has-addons">
                        <div class="control has-icons-left">
                          <input class="input is-small spaceinput" v-model="item.triggers[idx2].data.minLines" />
                          <span class="icon is-small is-left">
                            <i class="fa fa-comments-o"></i>
                          </span>
                        </div>
                      </div>
                      <div class="field has-addons">
                        <div class="control has-icons-left has-icons-right">
                          <input class="input is-small spaceinput" v-model="item.triggers[idx2].data.minSeconds" />
                          <span class="icon is-small is-left">
                            <i class="fa fa-hourglass"></i>
                          </span>
                          <span class="icon is-small is-right">
                            sec
                          </span>
                        </div>
                      </div>
                    </div>

                </div>

                <div class="field has-addons mr-1">
                  <div class="control has-icons-left">
                    <div v-if="item.action !== 'jisho_org_lookup'" class="select is-small">
                        <select :value="newtriggers[idx] || 'command'" @change="newtriggers[idx] = $event.target.value">
                            <option value="command">Command</option>
                            <option value="timer">Timer</option>
                        </select>
                    </div>
                  </div>
                  <button
                    class="button is-small"
                    @click="addtrigger(idx)"><i class="fa fa-plus mr-1" /> Add</button>
                </div>
            </td>
            <td>
                {{item.action}}
            </td>
            <td>
                <div v-if="item.action === 'jisho_org_lookup'"></div>
                <div v-if="item.action === 'text'">
                    <div v-for="(txt, idx2) in item.data.text" :key="idx2" class="field has-addons">
                      <div class="control">
                        <input class="input is-small" type="text" v-model="item.data.text[idx2]" />
                      </div>
                      <div class="control">
                      <button class="button is-small" :disabled="item.data.text.length <= 1" @click="rmtxt(idx, idx2)"><i class="fa fa-remove" /></button>
                      </div>
                    </div>
                    <button class="button is-small" @click="addtxt(idx)"><i class="fa fa-plus mr-1" /> Add</button>
                </div>
                <div v-if="item.action === 'media'" :class="item.action">
                    <div class="spacerow media-holder" v-if="item.data.image.file || item.data.sound.file">
                      <responsive-image v-if="item.data.image.file" :src="item.data.image.file" :title="item.data.image.filename" width="100%" height="90" style="display:block;" />
                      <player :src="item.data.sound.file" :name="item.data.sound.filename" :volume="item.data.sound.volume" class="button is-small" />
                      <volume-slider v-model="item.data.sound.volume" />
                    </div>
                    <div class="spacerow">
                      <upload @uploaded="mediaSndUploaded(idx, $event)" accept="audio/*" label="Upload Audio" />
                      <upload @uploaded="mediaImgUploaded(idx, $event)" accept="image/*" label="Upload Image" />
                    </div>
                    <div class="spacerow">
                      <label class="spacelabel">Min. duration </label>
                      <span style="position: relative; display: inline-block">
                        <input type="text" class="input is-small spaceinput" v-model="item.data.minDurationMs" />
                        <span style="position: absolute; right:7px; top: 50%; transform: translateY(-50%);">ms</span>
                      </span>
                    </div>
                </div>
                <div v-if="item.action === 'countdown'">
                    <countdown-edit v-model="item.data" />
                </div>
            </td>
            <td>
              <input type="checkbox" v-model="item.restrict_to" value="broadcaster" />
            </td>
            <td>
              <input type="checkbox" v-model="item.restrict_to" value="mod" />
            </td>
            <td>
              <input type="checkbox" v-model="item.restrict_to" value="sub" />
            </td>
            <td>
              <button class="button is-small" @click="remove(idx)"><i class="fa fa-remove mr-1" /> Remove</button>
            </td>
        </tr>
      </tbody>
    </table>
    <div v-else>No commands set up</div>
  </div>
</div>
`,
  methods: {
    mediaSndUploaded(idx, j) {
      this.commands[idx].data.sound.filename = j.originalname
      this.commands[idx].data.sound.file = j.filename
    },
    mediaImgUploaded(idx, j) {
      this.commands[idx].data.image.filename = j.originalname
      this.commands[idx].data.image.file = j.filename
    },
    add(type) {
      const cmd = newCmd(type)
      if (!cmd) {
        return
      }

      // add command
      this.commands.push(cmd)

      // on next update, scroll to the new item and focus first input (command)
      Vue.nextTick(() => {
        const el = this.$refs.table.querySelector('table tr:nth-child(' + (this.commands.length + 1) + ')')
        el.scrollIntoView()
        el.classList.add('gain-attention')
        setTimeout(function () {
          el.classList.remove('gain-attention')
        }, 100)
        el.querySelector('td input').focus()
      })
    },
    rmtxt(idx, idx2) {
      this.commands[idx].data.text = this.commands[idx].data.text.filter((val, index) => index !== idx2)
    },
    addtxt(idx) {
      this.commands[idx].data.text.push(newText())
    },
    rmtrigger(idx, idx2) {
      this.commands[idx].triggers = this.commands[idx].triggers.filter((val, index) => index !== idx2)
    },
    addtrigger(idx) {
      this.commands[idx].triggers.push(newTrigger(this.newtriggers[idx] || 'command'))
    },
    remove(idx) {
      this.commands = this.commands.filter((val, index) => index !== idx)
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
      this.unchangedJson = JSON.stringify(data.commands)
    })
    this.ws.connect()
  }
}
