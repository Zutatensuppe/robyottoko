<template>
  <div class="view">
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
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

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import api from '../_api'
import StringInput from '../components/StringInput.vue'
import NavbarElement from '../components/NavbarElement.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const unchangedJson = ref<string>('[]')
const changedJson = ref<string>('[]')
const user = ref<{
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
}>({
  id: 0,
  twitch_id: '',
  twitch_login: '',
  name: '',
  email: '',
  groups: [],
  tmi_identity_client_id: '',
  tmi_identity_client_secret: '',
  tmi_identity_password: '',
  tmi_identity_username: '',
  bot_enabled: false,
  bot_status_messages: false,
})

const isAdmin = computed(() => {
  return user.value.groups.includes('admin')
})

const changed = computed(() => {
  return unchangedJson.value !== changedJson.value
})

const setChanged = () => {
  changedJson.value = JSON.stringify({
    user: user.value,
  })
}
const setUnchanged = () => {
  unchangedJson.value = JSON.stringify({
    user: user.value,
  })
  changedJson.value = unchangedJson.value
}
const sendSave = async () => {
  await api.saveUserSettings({
    user: user.value,
  })
  setUnchanged()
}

watch(user, () => {
  setChanged()
}, { deep: true })

onMounted(async () => {
  const res = await api.getPageSettingsData()
  if (res.status !== 200) {
    router.push({ name: 'login' })
    return
  }
  const data = await res.json()
  user.value = data.user
  setUnchanged()
})
</script>
