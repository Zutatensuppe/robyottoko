<template>
  <div class="view center-screen mt-2">
    <h1 class="title is-4">
      Hyottoko.club
    </h1>
    <form>
      <div class="field">
        <a
          class="button is-twitch is-fullwidth"
          :href="accessTokenLink"
        ><span class="icon is-left"><i class="fa fa-twitch" /></span>
          <span>Login with Twitch</span></a>
      </div>
      <global-user-info />
    </form>
  </div>
</template>
<script setup lang="ts">
import conf from "../conf";
import twitch from "../twitch";
const accessTokenLink = twitch.accessTokenLink(conf.getConf().twitchClientId)
</script>
