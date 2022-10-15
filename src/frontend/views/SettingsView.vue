<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <navbar-element />
      <div
        id="actionbar"
        class="p-1"
      >
        <button
          class="button is-small is-primary"
          :disabled="!changed"
          @click="sendSave"
        >
          Save
        </button>
      </div>
    </div>
    <div id="main">
      <div class="mb-4">
        <h1 class="title mb-2">
          User
        </h1>
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Name:</td>
              <td>{{ user.name }}</td>
            </tr>
            <tr>
              <td>Email:</td>
              <td>{{ user.email }}</td>
            </tr>
            <tr>
              <td>Twitch Id:</td>
              <td>{{ user.twitch_id }}</td>
            </tr>
            <tr>
              <td>Twitch Login:</td>
              <td>{{ user.twitch_login }}</td>
            </tr>
            <tr>
              <td>Bot enabled:</td>
              <td>
                <input
                  v-model="user.bot_enabled"
                  type="checkbox"
                >
              </td>
            </tr>
            <tr>
              <td>Bot status messages:</td>
              <td>
                <input
                  v-model="user.bot_status_messages"
                  type="checkbox"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="isAdmin"
        class="mb-4"
      >
        <h1 class="title mb-2">
          Twitch-Bot
        </h1>
        <p>
          Please refer to
          <a
            href="https://dev.twitch.tv/docs/irc/#building-the-bot"
            target="_blank"
          >building the bot</a>.
        </p>
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Bot name:</td>
              <td>
                <StringInput v-model="user.tmi_identity_username" />
              </td>
            </tr>
            <tr>
              <td>Bot oauth (pass):</td>
              <td>
                <input
                  v-model="user.tmi_identity_password"
                  class="input is-small"
                  type="password"
                >
              </td>
            </tr>
            <tr>
              <td>Bot client_id:</td>
              <td>
                <StringInput v-model="user.tmi_identity_client_id" />
              </td>
            </tr>
            <tr>
              <td>Bot client_secret:</td>
              <td>
                <input
                  v-model="user.tmi_identity_client_secret"
                  class="input is-small"
                  type="password"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import api from "../api";
import conf from "../conf";
import twitch from "../twitch";
import StringInput from "../components/StringInput.vue";

interface ComponentData {
  unchangedJson: string
  changedJson: string
  user: {
    id: number
    twitch_id: string
    twitch_login: string
    name: string
    email: string
    groups: string[]
    tmi_identity_client_id: string
    tmi_identity_client_secret: string
    tmi_identity_password: string
    tmi_identity_username: string
    bot_enabled: boolean
    bot_status_messages: boolean
  };
}

export default defineComponent({
  components: { StringInput },
  data: (): ComponentData => ({
    unchangedJson: "[]",
    changedJson: "[]",
    user: {
      id: 0,
      twitch_id: '',
      twitch_login: '',
      name: "",
      email: "",
      groups: [],
      tmi_identity_client_id: "",
      tmi_identity_client_secret: "",
      tmi_identity_password: "",
      tmi_identity_username: "",
      bot_enabled: false,
      bot_status_messages: false,
    },
  }),
  computed: {
    isAdmin() {
      return this.user.groups.includes("admin");
    },
    changed() {
      return this.unchangedJson !== this.changedJson;
    },
    accessTokenLink() {
      const twitchClientId = this.isAdmin
         ? this.user.tmi_identity_client_id || conf.getConf().twitchClientId
         : conf.getConf().twitchClientId
      return twitch.accessTokenLink(twitchClientId)
    },
  },
  watch: {
    user: {
      deep: true,
      handler() {
        this.setChanged();
      },
    },
  },
  async mounted() {
    const res = await api.getPageSettingsData();
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }
    const data = await res.json();
    this.user = data.user;
    this.setUnchanged();
  },
  methods: {
    openAuth() {
      window.open(this.accessTokenLink);
    },
    setChanged() {
      this.changedJson = JSON.stringify({
        user: this.user,
      });
    },
    setUnchanged() {
      this.unchangedJson = JSON.stringify({
        user: this.user,
      });
      this.changedJson = this.unchangedJson;
    },
    async sendSave() {
      await api.saveUserSettings({
        user: this.user,
      });
      this.setUnchanged();
    },
  }
});
</script>
