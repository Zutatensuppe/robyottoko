<template>
  <div id="app">
    <div id="top" ref="top">
      <navbar />
      <div id="actionbar" class="p-1">
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
        <h1 class="title mb-2">User</h1>
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Name:</td>
              <td>{{ user.name }}</td>
            </tr>
            <tr>
              <td>Email:</td>
              <td><input type="email" v-model="user.email" /></td>
            </tr>
            <tr>
              <td>Password:</td>
              <td><input type="password" v-model="user.pass" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-4" v-if="isAdmin">
        <h1 class="title mb-2">Twitch-Bot</h1>
        <p>
          Please refer to
          <a
            href="https://dev.twitch.tv/docs/irc/#building-the-bot"
            target="_blank"
            >building the bot</a
          >.
        </p>
        <table class="table is-striped">
          <tbody>
            <tr>
              <td>Bot name:</td>
              <td>
                <input
                  class="input is-small"
                  type="text"
                  v-model="user.tmi_identity_username"
                />
              </td>
            </tr>
            <tr>
              <td>Bot oauth (pass):</td>
              <td>
                <input
                  class="input is-small"
                  type="password"
                  v-model="user.tmi_identity_password"
                />
              </td>
            </tr>
            <tr>
              <td>Bot client_id:</td>
              <td>
                <input
                  class="input is-small"
                  type="text"
                  v-model="user.tmi_identity_client_id"
                />
              </td>
            </tr>
            <tr>
              <td>Bot client_secret:</td>
              <td>
                <input
                  class="input is-small"
                  type="password"
                  v-model="user.tmi_identity_client_secret"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mb-4">
        <h1 class="title mb-2">Twitch Channels</h1>
        <p>
          List of twitch channels where the bot will connect to.
          <span v-if="twitch_channels.length === 0">
            Currently no channels are configured.
          </span>
        </p>
        <table class="table is-striped" v-if="twitch_channels.length > 0">
          <thead>
            <tr>
              <td>Channel name</td>
              <td>Channel id*</td>
              <td>Access Token*</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(channel, idx) in twitch_channels"
              :key="channel.channel_name"
            >
              <td>
                <input
                  class="input is-small"
                  type="text"
                  v-model="channel.channel_name"
                />
              </td>
              <td>
                <input
                  class="input is-small"
                  type="text"
                  v-model="channel.channel_id"
                  v-if="channel.channel_id"
                />
                <button
                  class="button is-small"
                  @click="loadid(idx)"
                  v-if="!channel.channel_id"
                >
                  Load id
                </button>
              </td>
              <td>
                <input
                  class="input is-small"
                  type="password"
                  v-model="channel.access_token"
                />
              </td>
              <td>
                <button class="button is-small" @click="rmchannel(idx)">
                  <i class="fa fa-remove" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button class="button is-small" @click="addchannel()">
          Add channel
        </button>
      </div>

      <div class="content" v-if="twitch_channels.length > 0">
        <p>
          Channel Id* and Access Token*: You may not need the client id or
          access token. No public feature currently uses them.
        </p>
        <p v-if="accessTokenLink">To get an access token, do the following:</p>
        <ol v-if="accessTokenLink" class="list">
          <li class="list-item">Login to twitch as the channel owner</li>
          <li class="list-item">
            Click <a :href="accessTokenLink" target="_blank">here</a> to
            authorize the bot with the channel
          </li>
          <li class="list-item">
            If authorized, you get redirected back to hyottoko.club, and the
            access token will display
          </li>
        </ol>

        <p v-else-if="isAdmin">
          To configure an access token, please configure the "Bot client_id"
          above.
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  data: () => ({
    unchangedJson: "[]",
    changedJson: "[]",
    user: {
      id: 0,
      name: "",
      email: "",
      pass: "",
      groups: [],
    },
    twitch_channels: [],
  }),
  computed: {
    isAdmin() {
      return this.user.groups.includes("admin");
    },
    changed() {
      return this.unchangedJson !== this.changedJson;
    },
    accessTokenLink() {
      if (!this.user.tmi_identity_client_id) {
        return;
      }
      // all scopes, see https://dev.twitch.tv/docs/authentication/#scopes
      const scopes = [
        "analytics:read:extensions",
        "analytics:read:games",
        "bits:read",
        "channel:edit:commercial",
        "channel:manage:broadcast",
        "channel:manage:extensions",
        "channel:manage:redemptions",
        "channel:manage:videos",
        "channel:read:editors",
        "channel:read:hype_train",
        "channel:read:redemptions",
        "channel:read:stream_key",
        "channel:read:subscriptions",
        "clips:edit",
        "moderation:read",
        "user:edit",
        "user:edit:follows",
        "user:read:blocked_users",
        "user:manage:blocked_users",
        "user:read:broadcast",
        "user:read:email",
      ];
      const loc = document.location;
      const redirectUri = `${loc.protocol}//${loc.host}/twitch/redirect_uri`;
      return (
        "https://id.twitch.tv/oauth2/authorize" +
        "?response_type=token" +
        `&client_id=${this.user.tmi_identity_client_id}` +
        `&redirect_uri=${redirectUri}` +
        `&scope=${scopes.join("+")}`
      );
    },
  },
  methods: {
    setChanged() {
      this.changedJson = JSON.stringify({
        user: this.user,
        twitch_channels: this.twitch_channels,
      });
    },
    setUnchanged() {
      this.unchangedJson = JSON.stringify({
        user: this.user,
        twitch_channels: this.twitch_channels,
      });
      this.changedJson = this.unchangedJson;
    },
    rmchannel(idx) {
      this.twitch_channels = this.twitch_channels.filter(
        (val, index) => index !== idx
      );
    },
    addchannel() {
      this.twitch_channels.push({
        channel_id: "",
        channel_name: "",
        access_token: "",
      });
    },
    async loadid(idx) {
      this.twitch_channels[idx].channel_id = await this.getUserIdByName(
        this.twitch_channels[idx].channel_name
      );
    },
    async getUserIdByName(name) {
      const data = {
        name,
        client_id: this.user.tmi_identity_client_id || null,
        client_secret: this.user.tmi_identity_client_secret || null,
      };
      const res = await fetch("/twitch/user-id-by-name", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      try {
        const json = await res.json();
        return json.id;
      } catch (e) {
        // TODO: display error message
        return "";
      }
    },
    async sendSave() {
      await fetch("/api/save-settings", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: this.user,
          twitch_channels: this.twitch_channels,
        }),
      });
      this.setUnchanged();
    },
  },
  watch: {
    user: {
      deep: true,
      handler() {
        this.setChanged();
      },
    },
    twitch_channels: {
      deep: true,
      handler() {
        this.setChanged();
      },
    },
  },
  async mounted() {
    const res = await fetch("/api/page/settings");
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }

    const data = await res.json();
    this.user = data.user;
    this.twitch_channels = data.twitchChannels;
    this.setUnchanged();
  },
});
</script>
