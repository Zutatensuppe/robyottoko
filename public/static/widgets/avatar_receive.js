import AvatarAnimation from '../components/avatar-animation.js'
export default {
  template: `<div class="base" v-if="initialized">
    <div class="avatar">
      <avatar-animation v-for="(anim,idx) in animations" :key="idx" :frames="anim.frames" :width="256" :height="256" />
    </div>
  </div>`,
  components: {
    AvatarAnimation,
  },
  props: {
    ws: Object,
  },
  data() {
    return {
      speaking: false,
      lockedState: 'default',
      initialized: false,
      tuber: {
        slot: {},
      },
      tuberDef: null,
      settings: null,
    }
  },
  computed: {
    animationName() {
      if (this.lockedState !== 'default') {
        return this.lockedState
      }
      return this.speaking ? 'speaking' : 'default'
    },
    animations() {
      return this.tuberDef.slotDefinitions.map((slotDef) => {
        const item = slotDef.items[this.tuber.slot[slotDef.slot]];
        const stateDef = item.states.find(({ state }) => state === this.animationName);
        if (stateDef.frames.length > 0) {
          return stateDef
        }
        return item.states.find(({ state }) => state === 'default')
      })
    },
  },
  methods: {
    setSlot(slotName, itemIdx) {
      this.tuber.slot[slotName] = itemIdx
      this.tuber.slot = Object.assign({}, this.tuber.slot)
    },
    setSpeaking(speaking) {
      if (this.speaking !== speaking) {
        this.speaking = speaking
      }
    },
    lockState(lockedState) {
      if (this.lockedState !== lockedState) {
        this.lockedState = lockedState
      }
    },
    setTuber(tuber) {
      this.tuber.slot = {}
      this.tuberDef = JSON.parse(JSON.stringify(tuber))
      this.tuberDef.slotDefinitions.forEach(slotDef => {
        this.tuber.slot[slotDef.slot] = slotDef.defaultItemIndex
      })
    },
  },
  async mounted() {
    this.ws.onMessage('init', (data) => {
      this.settings = data.settings
      this.setTuber(this.settings.avatarDefinitions[0])
      this.initialized = true
    })
    this.ws.onMessage('ctrl', ({ data }) => {
      if (data.ctrl === 'setSlot') {
        const slotName = data.args[0]
        const itemIdx = data.args[1]
        this.setSlot(slotName, itemIdx)
      } else if (data.ctrl === 'setSpeaking') {
        const speaking = data.args[0]
        this.setSpeaking(speaking)
      } else if (data.ctrl === 'lockState') {
        const lockedState = data.args[0]
        this.lockState(lockedState)
      } else if (data.ctrl === 'setTuber') {
        const tuber = data.args[0]
        this.setTuber(tuber)
      }
    })
    this.ws.connect()
  }
}
