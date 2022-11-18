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
        <span class="greeting">Welcome back, {{ userName }}</span>
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
          <CheckboxInput
            id="darkmode-switch"
            v-model="darkmode"
            class="mr-1"
            @update:model-value="onDarkmodeSwitch"
          />
          <label for="darkmode-switch">Switch dark/light mode</label>
        </span>
        <a
          class="navbar-item"
          @click="onLogoutClick"
        >Logout</a>
      </div>
    </div>
  </nav>
  <ProblemsDialog
    v-if="showProblems"
    :problems="problems"
    @close="showProblems = false"
  />
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import user from "../user";
import { eventBus } from "../wsstatus";
import { ApiUserData } from '../../types';
import CheckboxInput from "./CheckboxInput.vue";
import ProblemsDialog from './ProblemsDialog.vue'
import { RouteLocationRaw, useRouter } from 'vue-router'

const linksStart: { to: RouteLocationRaw, text: string }[] = [
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
]

const me = ref<ApiUserData | null>(user.getMe())
const showProblems = ref<boolean>(false)
const problems = ref<{ message: string, details: any }[]>([])
const burgerActive = ref<boolean>(false)
const darkmode = ref<boolean>(user.isDarkmode())

const userName = computed(() => me.value?.user?.name || "")

const onDarkmodeSwitch = (): void => {
  user.setDarkmode(darkmode.value);
}

const statusChanged = (status: any): void => {
  problems.value = status.problems;
}

const toggleBurgerMenu = (): void => {
  burgerActive.value = !burgerActive.value;
}

const router = useRouter()
const onLogoutClick = async () => {
  const res = await user.logout();
  if (res.error) {
    throw new Error(res.error);
  }
  router.push({ name: "login" });
}

onMounted(() => {
  eventBus.on("status", statusChanged)
})

onUnmounted(() => {
  eventBus.off("status", statusChanged)
})
</script>
