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
      this.audio = new Audio('/media/sounds/' + this.src)
      this.playing = false
    }
  },
  template: `<span class="player" v-if="src" @click="toggle">{{ nam }} <i class="fa" :class="cls"/></span>`
})

new Vue({
  el: '#app',
  template: `
<div>
    <div id="menu" style="position: fixed; bottom: 0; height: auto; width: 100%;">
        <span class="btn" @click="add('text')">Add text</span>
        <span class="btn" @click="add('sound')">Add sound</span>
        <span class="btn" @click="add('countdown')">Add countdown</span>
        <span class="btn" @click="add('jisho_org_lookup')">Add jisho_org_lookup</span>
        <span class="btn" @click="sendSave">Save</span>
    </div>
    <table>
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
                        <span class="btn" @click="rmtxt(idx, idx2)"><i class="fa fa-remove" /></span>
                    </div>
                    <span class="btn" @click="addtxt(idx)"><i class="fa fa-plus" /> Add</span>
                </div>
                <div v-if="item.action === 'sound'" :class="item.action">
                    <player :src="item.data.file" :nam="item.data.filename" class="btn" />
                    <label>
                        <input type="file" name="file" style="display: none" @change="onchange(idx, $event.target.files[0])" />
                        <span class="btn"><i class="fa fa-upload" /> Upload File</span>
                    </label>
                </div>
                <div v-if="item.action === 'countdown'">
                    <div class="spacerow">
                        <label>Steps </label>
                        <input v-model="item.data.steps" />
                    </div>
                    <div class="spacerow">
                        <label>Interval </label>
                        <input v-model="item.data.interval" />
                    </div>
                    <div class="spacerow">
                        <label>Intro </label>
                        <input v-model="item.data.intro" />
                    </div>
                    <div class="spacerow">
                        <label>Outro </label>
                        <input v-model="item.data.outro" />
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
                <span class="btn" @click="remove(idx)"><i class="fa fa-remove" /> Remove</span>
            </td>
        </tr>
    </table>
</div>
`,
  data() {
    return {
      commands: [],
      ws: null,
    }
  },
  methods: {
    async onchange(idx, file) {
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch('/upload', {
        method: 'post',
        body: formData,
      })
      const j = await res.json()
      this.commands[idx].data.filename = j.originalname
      this.commands[idx].data.file = j.filename
    },
    add(type) {
      if (type === 'text') {
        this.commands.push({
          command: '',
          action: 'text',
          restrict_to: [],
          data: {
            text: [''],
          },
        })
      } else if (type === 'sound') {
        this.commands.push({
          command: '',
          action: 'sound',
          restrict_to: [],
          data: {
            filename: '',
            file: '',
          },
        })
      } else if (type === 'countdown') {
        this.commands.push({
          command: '',
          action: 'countdown',
          restrict_to: [],
          data: {
            steps: 3,
            interval: 1000,
            intro: 'Starting countdown...',
            outro: 'Done!'
          },
        })
      } else if (type === 'jisho_org_lookup') {
        this.commands.push({
          command: '',
          action: 'jisho_org_lookup',
          restrict_to: [],
          data: {},
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
    onMsg(e) {
      const d = JSON.parse(e.data)
      if (!d.event) {
        return
      }
      switch (d.event) {
        case 'general/init':
          this.commands = d.data.commands
          break
        case 'playsound':
          const audio = new Audio('/media/sounds/' + d.data.file)
          audio.play();
          break
      }
    },
  },
  async mounted() {
    this.ws = new Sockhyottoko('/commands')
    this.ws.onmessage = this.onMsg
  },
})
