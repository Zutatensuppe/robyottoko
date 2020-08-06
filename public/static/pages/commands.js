import Navbar from '../components/navbar.js'
import Player from '../components/player.js'
import ResponsiveImage from '../components/responsive-image.js'
import Upload from '../components/upload.js'
import Ws from "../ws.js"

export default {
  components: {
    Navbar,
    Player,
    ResponsiveImage,
    Upload,
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
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user" />
    <div id="actionbar">
      <ul class="items">
        <li><button class="btn" @click="add('text')">Add text</button>
        <li><button class="btn" @click="add('media')">Add media</button>
        <li><button class="btn" @click="add('countdown')">Add countdown</button>
        <li><button class="btn" @click="add('jisho_org_lookup')">Add jisho_org_lookup</button>
        <li><button class="btn btn-primary" :disabled="!changed" @click="sendSave">Save</button>
      </ul>
    </div>
  </div>
  <div id="main" ref="main">
    <table ref="table">
        <tr>
            <th>Command</th>
            <th>Type</th>
            <th>Settings</th>
            <th>Streamer</th>
            <th>Mod</th>
            <th>Sub</th>
            <th></th>
        </tr>
        <tr v-for="(item, idx) in commands" :key="idx">
            <td>
                <input type="text" v-model="item.command" />
            </td>
            <td>
                {{item.action}}
            </td>
            <td>
                <div v-if="item.action === 'jisho_org_lookup'"></div>
                <div v-if="item.action === 'text'">
                    <div v-for="(txt, idx2) in item.data.text" :key="idx2" class="spacerow">
                        <input type="text" v-model="item.data.text[idx2]" />
                        <button class="btn" @click="rmtxt(idx, idx2)"><i class="fa fa-remove" /></button>
                    </div>
                    <button class="btn" @click="addtxt(idx)"><i class="fa fa-plus" /> Add</button>
                </div>
                <div v-if="item.action === 'media'" :class="item.action">
                    <div class="spacerow media-holder" v-if="item.data.image.file || item.data.sound.file">
                      <responsive-image v-if="item.data.image.file" :src="item.data.image.file" :title="item.data.image.filename" width="100%" height="90" style="display:block;" />
                      <player :src="item.data.sound.file" :name="item.data.sound.filename" class="btn" />
                    </div>
                    <div class="spacerow">
                      <upload @uploaded="mediaSndUploaded(idx, $event)" accept="audio/*" label="Upload Audio" />
                      <upload @uploaded="mediaImgUploaded(idx, $event)" accept="image/*" label="Upload Image" />
                    </div>
                    <div class="spacerow">
                      <label class="spacelabel">Min. duration </label>
                      <span style="position: relative; display: inline-block">
                        <input type="text" class="spaceinput" v-model="item.data.minDurationMs" />
                        <span style="position: absolute; right:7px; top: 50%; transform: translateY(-50%);">ms</span>
                      </span>
                    </div>
                </div>
                <div v-if="item.action === 'countdown'">
                    <div class="spacerow">
                        <label class="spacelabel">Steps </label>
                        <input class="spaceinput" v-model="item.data.steps" />
                    </div>
                    <div class="spacerow">
                        <label class="spacelabel">Interval </label>
                        <input class="spaceinput" v-model="item.data.interval" />
                    </div>
                    <div class="spacerow">
                        <label class="spacelabel">Intro </label>
                        <input class="spaceinput" v-model="item.data.intro" />
                    </div>
                    <div class="spacerow">
                        <label class="spacelabel">Outro </label>
                        <input class="spaceinput" v-model="item.data.outro" />
                    </div>
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
                <button class="btn" @click="remove(idx)"><i class="fa fa-remove" /> Remove</button>
            </td>
        </tr>
    </table>
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
      let cmd = null
      if (type === 'text') {
        cmd = {
          command: '',
          action: 'text',
          restrict_to: [],
          data: {
            text: [''],
          },
        }
      } else if (type === 'media') {
        cmd = {
          command: '',
          action: 'media',
          restrict_to: [],
          data: {
            sound: {
              filename: '',
              file: '',
            },
            image: {
              filename: '',
              file: '',
            },
            minDurationMs: 1000,
          },
        }
      } else if (type === 'countdown') {
        cmd = {
          command: '',
          action: 'countdown',
          restrict_to: [],
          data: {
            steps: 3,
            interval: 1000,
            intro: 'Starting countdown...',
            outro: 'Done!'
          },
        }
      } else if (type === 'jisho_org_lookup') {
        cmd = {
          command: '',
          action: 'jisho_org_lookup',
          restrict_to: [],
          data: {},
        }
      }

      if (cmd) {
        // add command
        this.commands.push(cmd)

        // on next update, scroll to the new item and focus first input (command)
        Vue.nextTick(() => {
          const el = this.$refs.table.querySelector('table tr:nth-child(' + (this.commands.length + 1) + ')')
          el.scrollIntoView()
          el.classList.add('new-item')
          setTimeout(function () {
            el.classList.remove('new-item')
          }, 100)
          el.querySelector('td input').focus()
        })
      }
    },
    rmtxt(idx, idx2) {
      this.commands[idx].data.text = this.commands[idx].data.text.filter((val, index) => index !== idx2)
    },
    addtxt(idx) {
      this.commands[idx].data.text.push('')
    },
    remove(idx) {
      this.commands = this.commands.filter((val, index) => index !== idx)
    },
    sendSave() {
      this.sendMsg({
        event: 'save',
        commands: this.commands
      })
    },
    sendMsg(data) {
      this.ws.send(JSON.stringify(data))
    },
    fix (commands) {
      return (commands || []).map(cmd => {
        if (cmd.action === 'media') {
          cmd.data.minDurationMs = cmd.data.minDurationMs || 0
        }
        return cmd
      })
    },
    onMsg(e) {
      const d = JSON.parse(e.data)
      if (!d.event) {
        return
      }
      switch (d.event) {
        case 'general/init':
          this.commands = this.fix(d.data.commands)
          this.unchangedJson = JSON.stringify(d.data.commands)
          break
      }
    },
  },
  async mounted() {
    this.ws = new Ws(this.conf.wsBase + '/commands', this.conf.token)
    this.ws.onmessage = this.onMsg
    this.$refs.main.style.marginTop = this.$refs.top.clientHeight + 'px'
  }
}
