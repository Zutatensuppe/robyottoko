<template>
  <nav class="navbar" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <router-link class="navbar-item" :to="{ name: 'index' }">
        <img
          src="/hyottoko.png"
          width="32"
          height="32"
          alt="hyottoko.club"
          class="flip-horizontal mr-1"
        />
        <span class="greeting">Welcome back, {{ user }}</span>
      </router-link>

      <a
        role="button"
        class="navbar-burger"
        :class="{ 'is-active': burgerActive }"
        aria-label="menu"
        aria-expanded="false"
        data-target="navbarBasicExample"
        @click="toggleBurgerMenu"
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>
    <div
      id="navbarBasicExample"
      class="navbar-menu"
      :class="{ 'is-active': burgerActive }"
    >
      <div class="navbar-start">
        <router-link
          class="navbar-item"
          v-for="(l, idx) in linksStart"
          :key="idx"
          :to="l.to"
          >{{ l.text }}</router-link
        >
      </div>
      <div class="navbar-end">
        <a class="navbar-item" @click="onLogoutClick">Logout</a>
      </div>
    </div>
  </nav>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import user from "../user";

export default defineComponent({
  name: "navbar",
  computed: {
    user() {
      return this.$me?.user?.name || "";
    },
  },
  created() {
    this.$me = user.getMe();
  },
  data: () => ({
    $me: null,
    linksStart: [
      {
        to: { name: "index" },
        text: "Widgets",
      },
      {
        to: { name: "commands" },
        text: "Commands",
      },
      {
        to: { name: "variables" },
        text: "Variables",
      },
      {
        to: { name: "sr" },
        text: "Song Request",
      },
      {
        to: { name: "speech-to-text" },
        text: "Speech-To-Text",
      },
      {
        to: { name: "avatar" },
        text: "Avatar",
      },
      {
        to: { name: "drawcast" },
        text: "Drawcast",
      },
      {
        to: { name: "settings" },
        text: "Settings",
      },
    ],
    burgerActive: false,
  }),
  methods: {
    toggleBurgerMenu() {
      this.burgerActive = !this.burgerActive;
    },
    async onLogoutClick() {
      const res = await user.logout();
      if (res.error) {
        throw new Error(res.error);
      } else {
        this.$router.push({ name: "login" });
      }
    },
  },
});
</script>
