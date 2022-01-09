<template>
  <div class="center-screen">
    <h1 class="title is-6">Hyottoko.club</h1>

    <div
      class="field has-background-success-light has-text-success-dark"
      v-if="success"
    >
      Account registered. Please check your mail. Click
      <router-link :to="{ name: 'login' }">here</router-link>
      to login.
    </div>
    <div v-else>
      <div
        class="field has-background-danger-light has-text-danger-dark"
        v-if="error"
      >
        <div v-if="error === 'verified_mail_already_exists'">
          A user with this email is already registered. <br />
          <router-link :to="{ name: 'forgot-password' }"
            >Request a password reset.</router-link
          >
        </div>
        <div v-else-if="error === 'unverified_mail_already_exists'">
          A user with this email is already registered. <br />
          <span class="button is-small" @click="onRequestVerificationEmail"
            >Resend verification email</span
          >
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
            class="input is-small"
            type="text"
            placeholder="User"
            v-model="user"
            @update:modelValue="error = ''"
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
            type="email"
            placeholder="Email"
            v-model="email"
            @update:modelValue="error = ''"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-envelope"></i>
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
            @update:modelValue="error = ''"
            @keyup.enter="submit"
          />
          <span class="icon is-small is-left">
            <i class="fa fa-lock"></i>
          </span>
        </div>
      </div>
      <div class="field">
        <button
          class="button is-small is-primary"
          :disabled="canRegister ? null : true"
          @click="submit"
        >
          Register
        </button>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import api from "../api";

export default defineComponent({
  data: () => ({
    user: "",
    pass: "",
    email: "",
    error: "",
    success: false,
  }),
  computed: {
    canRegister() {
      return this.user && this.pass && this.email && !this.error;
    },
  },
  methods: {
    async onRequestVerificationEmail() {
      this.success = false;
      this.error = "";
      const res = await api.resendVerificationMail({ email: this.email });
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
    async submit() {
      this.success = false;
      this.error = "";
      const res = await api.register({
        user: this.user,
        pass: this.pass,
        email: this.email,
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
