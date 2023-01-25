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
          :class="{'is-active': l.to.name === route.name}"
          :to="l.to"
        >
          <i
            v-if="l.icon"
            class="fa mr-2"
            :class="l.icon"
          />
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
        >
          <i class="fa mr-2 fa-sign-out" /> Logout</a>
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
import { RouteLocationNamedRaw, useRoute, useRouter } from 'vue-router'

const linksStart: { to: RouteLocationNamedRaw, text: string, icon: string | null }[] = [
  {
    to: { name: "index" },
    text: "Widgets",
    icon: 'fa-home',
  },
  {
    to: { name: "commands" },
    text: "Commands",
    icon: 'fa-terminal',
  },
  {
    to: { name: "variables" },
    text: "Variables",
    icon: 'fa-code',
  },
  {
    to: { name: "sr" },
    text: "Song Request",
    icon: 'fa-music',
  },
  {
    to: { name: "speech-to-text" },
    text: "Speech-To-Text",
    icon: 'fa-commenting-o',
  },
  {
    to: { name: "avatar" },
    text: "Avatar",
    icon: 'fa-user-o',
  },
  {
    to: { name: "drawcast" },
    text: "Drawcast",
    icon: 'fa-paint-brush',
  },
  {
    to: { name: "pomo" },
    text: "Pomo",
    icon: 'fa-hourglass-1',
  },
  {
    to: { name: "settings" },
    text: "Settings",
    icon: 'fa-cogs',
  },
  {
    to: { name: "bug-reports" },
    text: "Bug Reports",
    icon: 'fa-bug',
  },
  {
    to: { name: "feature-requests" },
    text: "Feature Requests",
    icon: 'fa-university',
  },
]

const me = ref<ApiUserData | null>(user.getMe())
const showProblems = ref<boolean>(false)
const problems = ref<{ message: string, details: any }[]>([])
const burgerActive = ref<boolean>(false)
const darkmode = ref<boolean>(user.isDarkmode())
const route = useRoute()

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
  console.log(route.name)
  eventBus.on("status", statusChanged)
})

onUnmounted(() => {
  eventBus.off("status", statusChanged)
})
</script>
