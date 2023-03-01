<template>
  <div>
    <div>
      Title:
      <input 
        v-model="title"
        class="input"
      >
      Message:
      <textarea
        v-model="message"
        class="textarea"
      />
      <span
        class="button is-small"
        @click="publish"
      >
        Publish
      </span>
    </div>
    <h1>Announcements</h1>
    <table>
      <thead>
        <tr>
          <th>Id</th>
          <th>Created</th>
          <th>Title</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, idx) in announcements"
          :key="idx"
        >
          <td>{{ item.id }}</td>
          <td>{{ item.created }}</td>
          <td>{{ item.title }}</td>
          <td>{{ item.message }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import user from '../../user'
import api from '../../_api/admin'

const announcements = ref<any[]>([])

const title = ref<string>('')
const message = ref<string>('')
const publish = async () => {
  await api.postAnnouncement(title.value, message.value)
  announcements.value = await api.getAnnouncements()
}

onMounted(async () => {
  if (user.getMe()) {
    announcements.value = await api.getAnnouncements()
  }
  user.eventBus.on('login', async () => {
    announcements.value = await api.getAnnouncements()
  })
  user.eventBus.on('logout', () => {
    announcements.value = []
  })
})
</script>
