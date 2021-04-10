import Navbar from '../components/navbar.js'

export default {
  components: {
    Navbar,
  },
  props: {
    conf: Object,
  },
  data() {
    return {
      unchangedJson: '[]',
      changedJson: '[]',
      user: {},
      twitch_channels: [],
    }
  },
  template: `
<div id="app">
  <div id="top" ref="top">
    <navbar :user="conf.user.name" />
    <div id="actionbar">
      <ul class="items">
        <li><button class="btn btn-primary" :disabled="!changed" @click="sendSave">Save</button>
      </ul>
    </div>
  </div>
  <div id="main">
    <h1>Hyottoko.club</h1>
    <table>
      <tr>
        <td>User name:</td>
        <td>{{user.name}}</td>
      </tr>
      <tr>
        <td>User pass:</td>
        <td><input type="password" v-model="user.pass" /></td>
      </tr>
    </table>

    <h1>Twitch-Bot</h1>
    <p>Please refer to <a href="https://dev.twitch.tv/docs/irc/#building-the-bot" target="_blank">building the bot</a>.</p>
    <table>
      <tr>
        <td>Bot name:</td>
        <td><input type="text" v-model="user.tmi_identity_username" /></td>
      </tr>
      <tr>
        <td>Bot oauth (pass):</td>
        <td><input type="text" v-model="user.tmi_identity_password" /></td>
      </tr>
      <tr>
        <td>Bot client_id:</td>
        <td><input type="text" v-model="user.tmi_identity_client_id" /></td>
      </tr>
      <tr>
        <td>Bot client_secret:</td>
        <td><input type="text" v-model="user.tmi_identity_client_secret" /></td>
      </tr>
    </table>

    <h1>Twitch-Channels</h1>
    <p>Where should the bot connect to?</p>
    <p>To get an access token:</p>
    <ol>
      <li>Login to twitch as the channel owner
      <li>Click <a :href="accessTokenLink" target="_blank">here</a> to authorize the bot with the channel
      <li>If authorized, you get redirected back to hyottoko.club, and the access token will display
    </ol>
    <table>
      <tr>
        <td>Channel name</td>
        <td>Channel id</td>
        <td>Access Token</td>
        <td></td>
      </tr>
      <tr v-for="(channel, idx) in twitch_channels" v-key="channel.channel_name">
        <td><input type="text" v-model="channel.channel_name" /></td>
        <td>
          <input type="text" v-model="channel.channel_id" v-if="channel.channel_id" />
          <button class="btn" @click="loadid(idx)" v-if="!channel.channel_id">Load id</button></td>
        <td><input type="text" v-model="channel.access_token" /></td>
        <td><button class="btn" @click="rmchannel(idx)"><i class="fa fa-remove" /></button></td>
      </tr>
    </table>
    <button class="btn" @click="addchannel()">Add channel</button>
  </div>
</div>
`,
  computed: {
    changed() {
      return this.unchangedJson !== this.changedJson
    },
    accessTokenLink () {
      // all scopes, see https://dev.twitch.tv/docs/authentication/#scopes
      const scopes = [
        'analytics:read:extensions',
        'analytics:read:games',
        'bits:read',
        'channel:edit:commercial',
        'channel:manage:broadcast',
        'channel:manage:extensions',
        'channel:manage:redemptions',
        'channel:manage:videos',
        'channel:read:editors',
        'channel:read:hype_train',
        'channel:read:redemptions',
        'channel:read:stream_key',
        'channel:read:subscriptions',
        'clips:edit',
        'moderation:read',
        'user:edit',
        'user:edit:follows',
        'user:read:blocked_users',
        'user:manage:blocked_users',
        'user:read:broadcast',
        'user:read:email',
      ]
      const loc = document.location
      const redirectUri = `${loc.protocol}//${loc.host}/twitch/redirect_uri`
      return 'https://id.twitch.tv/oauth2/authorize'
        + '?response_type=token'
        + `&client_id=${this.user.tmi_identity_client_id}`
        + `&redirect_uri=${redirectUri}`
        + `&scope=${scopes.join('+')}`
    }
  },
  methods: {
    setChanged () {
      this.changedJson = JSON.stringify({
        user: this.user,
        twitch_channels: this.twitch_channels,
    })
    },
    setUnchanged () {
      this.unchangedJson = JSON.stringify({
        user: this.user,
        twitch_channels: this.twitch_channels,
      })
      this.changedJson = this.unchangedJson
    },
    rmchannel (idx) {
      this.twitch_channels = this.twitch_channels.filter((val, index) => index !== idx)
    },
    addchannel () {
      this.twitch_channels.push({
        channel_id: '',
        channel_name: '',
        access_token: '',
      })
    },
    async loadid (idx) {
      this.twitch_channels[idx].channel_id = await this.getUserIdByName(
        this.twitch_channels[idx].channel_name
      )
    },
    async getUserIdByName (name) {
      const res = await fetch('/twitch/user-id-by-name', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          client_id: this.user.tmi_identity_client_id,
          client_secret: this.user.tmi_identity_client_secret,
        })
      })
      const json = await res.json()
      return json.id
    },
    async sendSave() {
      await fetch('/save-settings', {
        method: 'post',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: this.user,
          twitch_channels: this.twitch_channels,
        })
      })
      this.setUnchanged()
    },
  },
  watch: {
    user: {
      deep: true,
      handler() {
        this.setChanged()
      }
    },
    twitch_channels: {
      deep: true,
      handler() {
        this.setChanged()
      }
    }
  },
  async mounted() {
    this.user = this.conf.user
    this.twitch_channels = this.conf.twitch_channels
    this.setUnchanged()
  }
}
