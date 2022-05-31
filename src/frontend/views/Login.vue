<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">Hyottoko.club</h1>
    <form>
      <div class="field has-background-success-light has-text-success-dark" v-if="success">
        {{ success }}
      </div>
      <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
        {{ error }}
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="text" placeholder="User" v-model="user" @keyup="error = ''" />
          <span class="icon is-left">
            <i class="fa fa-user"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="password" placeholder="Password" v-model="pass" @keyup="error = ''"
            @keyup.enter="submit" />
          <span class="icon is-left">
            <i class="fa fa-lock"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <span class="button is-primary is-fullwidth" @click="submit">Login</span>
      </div>
      <div class="field">
        <router-link :to="{ name: 'register' }">Register an account</router-link>
        |
        <router-link :to="{ name: 'forgot-password' }">Forgot password?</router-link>
      </div>
      <global-user-info />
    </form>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import api from "../api";
import userModule from "../user";
import util from "../util";

const user = ref<string>("")
const pass = ref<string>("")
const error = ref<string>("")
const success = ref<string>("")

onMounted(async () => {
  // TODO: move token handling to general place
  const token = util.getParam('t')
  if (token) {
    success.value = "";
    error.value = "";
    const res = await api.handleToken({ token });
    if (res.status === 200) {
      const json = await res.json();
      if (json.type === "registration-verified") {
        success.value = "Registration complete";
      }
    } else {
      error.value = "Unknown error";
    }
  }
})

const router = useRouter()

const submit = async () => {
  success.value = "";
  error.value = "";
  const res = await userModule.login(user.value, pass.value);
  if (res.error) {
    error.value = res.error;
  } else {
    router.push({ name: "index" });
  }
}
</script>
