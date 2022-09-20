<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">
      Hyottoko.club
    </h1>

    <div
      v-if="success"
      class="field has-background-success-light has-text-success-dark"
    >
      Account registered. Please check your mail. Click
      <router-link :to="{ name: 'login' }">
        here
      </router-link>
      to login.
    </div>
    <div v-else>
      <div
        v-if="error"
        class="field has-background-danger-light has-text-danger-dark"
      >
        <div v-if="error === 'verified_mail_already_exists'">
          A user with this email is already registered. <br>
          <router-link :to="{ name: 'forgot-password' }">
            Request a password reset.
          </router-link>
        </div>
        <div v-else-if="error === 'unverified_mail_already_exists'">
          A user with this email is already registered. <br>
          <span
            class="button is-small"
            @click="onRequestVerificationEmail"
          >Resend verification email</span>
        </div>
        <div v-else-if="error === 'verified_name_already_exists'">
          A user with this name is already registered.
        </div>
        <div v-else-if="error === 'unverified_name_already_exists'">
          A user with this name is already registered.
        </div>
        <span v-else>{{ error }}</span>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            v-model="user"
            class="input"
            type="text"
            placeholder="User"
            @update:modelValue="error = ''"
          >
          <span class="icon is-left">
            <i class="fa fa-user" />
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            v-model="email"
            class="input"
            type="email"
            placeholder="Email"
            @update:modelValue="error = ''"
          >
          <span class="icon is-left">
            <i class="fa fa-envelope" />
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            v-model="pass"
            class="input"
            type="password"
            placeholder="Password"
            @update:modelValue="error = ''"
            @keyup.enter="submit"
          >
          <span class="icon is-left">
            <i class="fa fa-lock" />
          </span>
        </div>
      </div>
      <div class="field">
        <button
          class="button is-primary is-fullwidth"
          :disabled="canRegister ? undefined : true"
          @click="submit"
        >
          Register
        </button>
      </div>
      <div class="field">
        Already have an account?
        <router-link :to="{ name: 'login' }">
          Login!
        </router-link>
      </div>
      <global-user-info />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import api from "../api";

const user = ref<string>("")
const pass = ref<string>("")
const email = ref<string>("")
const error = ref<string>("")
const success = ref<boolean>(false)

const canRegister = computed(() => {
  return user.value && pass.value && email.value && !error.value
})

const onRequestVerificationEmail = async () => {
  success.value = false
  error.value = ""
  const res = await api.resendVerificationMail({ email: email.value })
  if (res.status === 200) {
    success.value = true
  } else {
    try {
      error.value = (await res.json()).reason;
    } catch (e) {
      error.value = "Unknown error";
    }
  }
}

const submit = async () => {
  success.value = false
  error.value = ""
  const res = await api.register({
    user: user.value,
    pass: pass.value,
    email: email.value,
  })
  if (res.status === 200) {
    success.value = true
  } else {
    try {
      error.value = (await res.json()).reason
    } catch (e) {
      error.value = "Unknown error"
    }
  }
}
</script>
