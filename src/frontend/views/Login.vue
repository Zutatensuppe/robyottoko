<template>
  <div class="center-screen">
    <h1 class="title is-6">Hyottoko.club</h1>
    <form>
      <div
        class="field has-background-success-light has-text-success-dark"
        v-if="success"
      >
        {{ success }}
      </div>
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
            type="text"
            placeholder="User"
            v-model="user"
            @keyup="error = ''"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-user"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <div class="control has-icons-left">
          <input
            class="input is-small"
            type="password"
            placeholder="Password"
            v-model="pass"
            @keyup="error = ''"
            @keyup.enter="submit"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-lock"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <span class="button is-small is-primary" @click="submit">Login</span>
      </div>
      <div class="field">
        <router-link :to="{ name: 'register' }"
          >Register an account</router-link
        >
        |
        <router-link :to="{ name: 'forgot-password' }"
          >Forgot password?</router-link
        >
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import user from "../user";

export default defineComponent({
  data: () => ({
    user: "",
    pass: "",
    error: "",
    success: "",
  }),
  // TODO: move token handling to general place
  async mounted() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t");
    if (token) {
      this.success = "";
      this.error = "";
      const res = await fetch("/api/_handle-token", {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: token }),
      });
      if (res.status === 200) {
        const json = await res.json();
        if (json.type === "registration-verified") {
          this.success = "Registration complete";
        }
      } else {
        this.error = "Unknown error";
      }
    }
  },
  methods: {
    async submit() {
      this.success = "";
      this.error = "";
      const res = await user.login(this.user, this.pass);
      if (res.error) {
        this.error = res.error;
      } else {
        this.$router.push({ name: "index" });
      }
    },
  },
});
</script>
