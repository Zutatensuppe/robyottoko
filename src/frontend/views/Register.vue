<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">Hyottoko.club</h1>

    <div class="field has-background-success-light has-text-success-dark" v-if="success">
      Account registered. Please check your mail. Click
      <router-link :to="{ name: 'login' }">here</router-link>
      to login.
    </div>
    <div v-else>
      <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
        <div v-if="error === 'verified_mail_already_exists'">
          A user with this email is already registered. <br />
          <router-link :to="{ name: 'forgot-password' }">Request a password reset.</router-link>
        </div>
        <div v-else-if="error === 'unverified_mail_already_exists'">
          A user with this email is already registered. <br />
          <span class="button is-small" @click="onRequestVerificationEmail">Resend verification email</span>
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
          <input class="input" type="text" placeholder="User" v-model="user" @update:modelValue="error = ''" />
          <span class="icon is-left">
            <i class="fa fa-user"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="email" placeholder="Email" v-model="email" @update:modelValue="error = ''" />
          <span class="icon is-left">
            <i class="fa fa-envelope"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="password" placeholder="Password" v-model="pass" @update:modelValue="error = ''"
            @keyup.enter="submit" />
          <span class="icon is-left">
            <i class="fa fa-lock"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <button class="button is-primary is-fullwidth" :disabled="canRegister ? null : true" @click="submit">
          Register
        </button>
      </div>
      <div class="field">
        Already have an account?
        <router-link :to="{ name: 'login' }">Login!</router-link>
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
