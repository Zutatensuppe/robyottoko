<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">Hyottoko.club</h1>

    <div class="field has-background-success-light has-text-success-dark" v-if="success">
      Password successfully set. Click
      <router-link :to="{ name: 'login' }">here</router-link>
      to login.
    </div>
    <div v-else>
      <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
        {{ error }}
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="password" placeholder="New Password" v-model="pass" @keyup="error = ''"
            @keyup.enter="submit" />
          <span class="icon is-left">
            <i class="fa fa-lock"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <button class="button is-primary is-fullwidth" :disabled="canSubmit ? null : true" @click="submit">
          Save Password
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import api from "../api";
import util from "../util";

const pass = ref<string>("")
const error = ref<string>("")
const success = ref<boolean>(false)

const canSubmit = computed(() => pass.value && !error.value)

const submit = async () => {
  const token = util.getParam('t')
  success.value = false;
  error.value = "";
  const res = await api.resetPassword({ pass: pass.value, token });
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
