<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">
      Hyottoko.club
    </h1>
    <div
      v-if="success"
      class="field has-background-success-light has-text-success-dark"
    >
      Password-reset mail sent. Click
      <router-link :to="{ name: 'login' }">
        here
      </router-link>
      to login.
    </div>
    <form v-else>
      <div
        v-if="error"
        class="field has-background-danger-light has-text-danger-dark"
      >
        {{ error }}
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            v-model="email"
            class="input"
            type="email"
            placeholder="Email"
            @keyup="error = ''"
          >
          <span class="icon is-left">
            <i class="fa fa-envelope" />
          </span>
        </div>
      </div>
      <div class="field">
        <span
          class="button is-primary is-fullwidth"
          @click="submit"
        >Request Password Reset</span>
      </div>
      <div class="field">
        <router-link :to="{ name: 'register' }">
          Register an account
        </router-link>
        |
        <router-link :to="{ name: 'login' }">
          Login
        </router-link>
      </div>
      <global-user-info />
    </form>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import api from "../api";

const email = ref<string>("")
const error = ref<string>("")
const success = ref<boolean>(false)

const submit = async () => {
  success.value = false;
  error.value = "";
  const res = await api.requestPasswordReset({ email: email.value });
  if (res.status === 200) {
    success.value = true;
  } else {
    try {
      error.value = (await res.json()).reason;
    } catch (e) {
      error.value = "Unknown error";
    }
  }
}
</script>
