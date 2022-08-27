<template>
  <nav
    class="navbar"
    role="navigation"
    aria-label="main navigation"
  >
    <div class="navbar-brand">
      <router-link
        class="navbar-item"
        :to="{ name: 'index' }"
      >
        <img
          src="/hyottoko.png"
          width="32"
          height="32"
          alt="hyottoko.club"
          class="flip-horizontal mr-1"
        >
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
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
    </div>
    <div
      id="navbarBasicExample"
      class="navbar-menu"
      :class="{ 'is-active': burgerActive }"
    >
      <div class="navbar-start">
        <router-link
          v-for="(l, idx) in linksStart"
          :key="idx"
          class="navbar-item"
          :to="l.to"
        >
          {{ l.text }}
        </router-link>
      </div>
      <div class="navbar-end">
        <a
          v-if="problems.length"
          class="navbar-item has-text-danger"
          @click="showProblems = true"
        ><i
          class="fa fa-warning mr-1"
        /> {{ problems.length }} Problem{{
          problems.length > 1 ? "s" : ""
        }}</a>
        <span class="navbar-item">
          <input
            id="darkmode-switch"
            v-model="darkmode"
            type="checkbox"
            class="mr-1"
            @change="onDarkmodeSwitch"
          >
          <label for="darkmode-switch">Switch dark/light mode</label>
        </span>
        <a
          class="navbar-item"
          @click="onLogoutClick"
        >Logout</a>
      </div>
    </div>
  </nav>
  <problems-dialog
    v-if="showProblems"
    :problems="problems"
    @close="showProblems = false"
  />
</template>
<script lang="ts">
import { defineComponent } from "vue";
import user from "../user";
import { eventBus } from "../wsstatus";
import { ApiUserData } from '../../types';

interface ComponentData {
  me: ApiUserData | null
  showProblems: boolean
  linksStart: { to: { name: string }, text: string }[]
  problems: { message: string, details: any }[]
  burgerActive: boolean
  darkmode: boolean
}

export default defineComponent({
  data: (): ComponentData => ({
    me: null,
    showProblems: false,
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
        to: { name: "pomo" },
        text: "Pomo",
      },
      {
        to: { name: "settings" },
        text: "Settings",
      },
    ],
    problems: [],
    burgerActive: false,
    darkmode: false,
  }),
  computed: {
    user() {
      return this.me?.user?.name || "";
    },
  },
  created() {
    this.me = user.getMe();
    this.darkmode = user.isDarkmode();
    eventBus.on("status", this.statusChanged);
  },
  beforeUnmount() {
    eventBus.off("status", this.statusChanged);
  },
  methods: {
    onDarkmodeSwitch() {
      user.setDarkmode(this.darkmode);
    },
    statusChanged(status: any) {
      this.problems = status.problems;
    },
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
