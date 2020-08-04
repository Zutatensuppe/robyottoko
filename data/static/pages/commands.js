Vue.component('rimg', {
  props: {
    src: String,
    title: String,
    height: {
      type: String,
      default: '100%'
    },
    width: {
      type: String,
      default: '100%'
    },
  },
  template: `
  <div :style="style" :title="title"></div>
  `,
  computed: {
    style() {
      return {
        display: 'inline-block',
        verticalAlign: 'text-bottom',
        backgroundImage: 'url(/uploads/' + this.src + ')',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        width: this.width,
        height: this.height,
      }
    }
  }
})

Vue.component('upload', {
  props: {
    accept: String,
    label: String,
  },
  template: `
<label>
    <input type="file" style="display: none" @change="upload" :accept="accept" />
    <span class="btn"><i class="fa fa-upload" /> {{label || 'Upload File'}}</span>
</label>
`,
  methods: {
    async upload(evt) {
      const file = evt.target.files[0]
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch('/upload', {
        method: 'post',
        body: formData,
      })
      const j = await res.json()
      this.$emit('uploaded', j)
    },
  }
});

Vue.component('player', {
  props: ['src', 'nam'],
  data() {
    return {
      audio: null,
      playing: false,
    }
  },
  created: function () {
    this.load()
    this.$watch('src', () => {
      this.load()
    })
  },
  computed: {
    cls() {
      return this.playing ? 'fa-stop' : 'fa-play'
    }
  },
  methods: {
    toggle() {
      if (this.playing) {
        this.audio.pause()
        this.audio.currentTime = 0;
      } else {
        this.audio.play()
      }
      this.playing = !this.playing
    },
    load() {
      if (this.audio) {
        this.audio.pause()
        this.audio = null
      }
      this.audio = new Audio('/uploads/' + this.src)
      this.playing = false
    }
  },
  template: `<span class="player" v-if="src" @click="toggle">{{ nam }} <i class="fa" :class="cls"/></span>`
})

new Vue({
  el: '#app',
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
    <navbar />
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
                <div v-if="item.action === 'sound'" :class="item.action">
                    <player :src="item.data.file" :nam="item.data.filename" class="btn" />
                    <upload @uploaded="sndUploaded(idx, $event)" accept="audio/*" label="Upload Audio" />
                </div>
                <div v-if="item.action === 'media'" :class="item.action">
                    <div class="spacerow media-holder" v-if="item.data.image.file || item.data.sound.file">
                      <rimg v-if="item.data.image.file" :src="item.data.image.file" :title="item.data.image.filename" width="100%" height="90" style="display:block;" />
                      <player :src="item.data.sound.file" :nam="item.data.sound.filename" class="btn" />
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
    sndUploaded(idx, j) {
      this.commands[idx].data.filename = j.originalname
      this.commands[idx].data.file = j.filename
    },
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
        if (cmd.action === 'sound') {
          cmd.action = 'media'
          cmd.data = {sound: cmd.data, image: {filename: '', file: ''}}
        }
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
    this.ws = new Sockhyottoko('/commands')
    this.ws.onmessage = this.onMsg
    this.$refs.main.style.marginTop = this.$refs.top.clientHeight + 'px'
  }
})
