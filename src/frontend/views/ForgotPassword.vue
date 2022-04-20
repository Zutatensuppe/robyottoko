<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">Hyottoko.club</h1>
    <div class="field has-background-success-light has-text-success-dark" v-if="success">
      Password-reset mail sent. Click
      <router-link :to="{ name: 'login' }">here</router-link>
      to login.
    </div>
    <form v-else>
      <div class="field has-background-danger-light has-text-danger-dark" v-if="error">
        {{ error }}
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input class="input" type="email" placeholder="Email" v-model="email" @keyup="error = ''" />
          <span class="icon is-left">
            <i class="fa fa-envelope"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <span class="button is-primary is-fullwidth" @click="submit">Request Password Reset</span>
      </div>
      <div class="field">
        <router-link :to="{ name: 'register' }">Register an account</router-link>
        |
        <router-link :to="{ name: 'login' }">Login</router-link>
      </div>
      <div class="field has-text-grey-light">
        There are currently {{ data.registeredUserCount }} streamers registered
        ✨. <span v-if="data.streamingUserCount">{{ data.streamingUserCount }} are live right now.</span>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import api from "../api";
import global from "../global";

export default defineComponent({
  data: () => ({
    email: "",
    error: "",
    success: false,

    data: global.getData(),
  }),
  methods: {
    async submit() {
      this.success = false;
      this.error = "";
      const res = await api.requestPasswordReset({ email: this.email });
      if (res.status === 200) {
        this.success = true;
      } else {
        try {
          this.error = (await res.json()).reason;
        } catch (e) {
          this.error = "Unknown error";
        }
      }
    },
  },
});
</script>
