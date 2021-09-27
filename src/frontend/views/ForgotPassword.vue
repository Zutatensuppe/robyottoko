<template>
  <div class="center-screen">
    <h1 class="title is-6">Hyottoko.club</h1>

    <div
      class="field has-background-success-light has-text-success-dark"
      v-if="success"
    >
      Password-reset mail sent. Click
      <router-link :to="{ name: 'login' }">here</router-link>
      to login.
    </div>
    <form v-else>
      <div
        class="field has-background-danger-light has-text-danger-dark"
        v-if="error"
      >
        {{ error }}
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            class="input is-small"
            type="email"
            placeholder="Email"
            v-model="email"
            @keyup="error = ''"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-envelope"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <span class="button is-small is-primary" @click="submit"
          >Request Password Reset</span
        >
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  data: () => ({
    email: "",
    error: "",
    success: false,
  }),
  methods: {
    async submit() {
      this.success = false;
      this.error = "";
      const res = await fetch("/api/user/_request_password_reset", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: this.email }),
      });
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

<style>
@import "../style-pages.scss";
</style>
