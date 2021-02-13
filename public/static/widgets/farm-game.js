import WsClient from '../WsClient.js'

const Inventory = {
  name: 'inventory',
  template: `<div class="inventory"><span v-for="(amount, thing) in inventory" v-if="amount">
    {{amount}}x <img :src="visualized(thing)" :alt="thing" :title="thing" />
    </span></div>`,
  props: {
    inventory: Array,
  },
  methods: {
    visualized (thing) {
      return `/static/widgets/farm-game/assets/${thing}.png`
    }
  },
}

const Place = {
  name: 'place',
  template: `<div class="place" :style="style">{{place.name}}</div>`,
  props: {
    place: Object,
  },
  computed: {
    style () {
      return {
        top: this.place.location[1],
        left: this.place.location[0],
      }
    },
  }
}

const Player = {
  name: 'player',
  template: `<div class="player" :class="currentAction" :style="style">👤 {{user.info.display_name}}<div class="details">({{acting}}) <inventory :inventory="user.inventory" /></div></div>`,
  props: {
    user: Object,
  },
  components: {
    Inventory,
  },
  computed: {
    style () {
      return {
        top: this.user.location[1],
        left: this.user.location[0],
      }
    },
    currentAction () {
      return this.user.state.action.name
    },
    acting () {
      if (this.user.state.action.name === 'idle') {
        return this.user.state.action.name
      }
      return [
        `${this.user.state.action.name.replace(/e$/, '')}ing`,
        ...this.user.state.queue.map(action => action.name)
      ].join(' → ')
    }
  }
}

export default {
  template: `<div id="app">
    <div class="map">
      <place v-for="place in places" :place="place" />
      <player v-for="user in displayUsers" :key="user.info.login" :user="user" />
    </div>
    <div class="log">
      <div v-for="msg in messages">{{msg}}</div>
    </div>
  </div>`,
  props: {
    conf: Object,
  },
  components: {
    Place,
    Player,
  },
  data() {
    return {
      users: [],
      places: [],
      messages: [],
    }
  },
  computed: {
    displayUsers () {
      const actionCount = {}
      return Object.values(this.users).map(user => {
        actionCount[user.state.action.name] = actionCount[user.state.action.name] || 0
        let base = [0,0]
        switch (user.state.action.name) {
          case 'hunt': base = [290, 166]; break;
          case 'fish': base = [578, 325]; break;
          case 'gather': base = [315, 425]; break;
          case 'mine': base = [815, 170]; break;
        }
        user.location = [base[0], base[1] + actionCount[user.state.action.name] * 32]

        actionCount[user.state.action.name]++
        return user
      })
    },
  },
  methods: {
    update (data) {
      this.users = data.users
      this.places = data.places
    },
    say (txt) {
      this.messages.unshift(txt)
      this.messages = this.messages.slice(0, 10)
    },
  },
  async mounted() {
    this.ws = new WsClient(
      this.conf.wsBase + '/farm-game',
      this.conf.widgetToken
    )
    this.ws.onMessage(['init', 'change'], (data) => {
      this.update(data)
    })
    this.ws.onMessage(['say'], (data) => {
      this.say(data)
    })
    this.ws.connect()
  }
}
