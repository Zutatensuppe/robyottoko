<template>
  <div v-if="trigger.type === 'first_chat'">
    First chat:
    <code v-if="trigger.data.since === 'alltime'">alltime</code>
    <code v-if="trigger.data.since === 'stream'">current stream</code>
  </div>
  <div v-else-if="trigger.type === 'command'">
    <code>{{ trigger.data.command }}</code>
  </div>
  <div v-else-if="trigger.type === 'reward_redemption'">
    <span
      class="is-small"
      title="Channel Point Reward"
    ><i class="fa fa-bullseye" />:
    </span>
    <code>{{ trigger.data.command }}</code>
  </div>
  <div v-else-if="trigger.type === 'timer'">
    <span class="is-small">Timer: </span>
    <code>{{ trigger.data.minLines }} lines,
      <duration
        :value="trigger.data.minInterval"
      /></code>
  </div>
  <div v-else-if="trigger.type === 'sub'">
    <span class="is-small">Sub</span>
  </div>
  <div v-else-if="trigger.type === 'follow'">
    <span class="is-small">Follow</span>
  </div>
  <div v-else-if="trigger.type === 'bits'">
    <span class="is-small">Bits</span>
  </div>
  <div v-else-if="trigger.type === 'raid'">
    <span class="is-small">Raid</span>
  </div>
</template>
<script setup lang="ts">
import { CommandTrigger } from '../../../types';

defineProps<{
  trigger: CommandTrigger,
}>()
</script>
