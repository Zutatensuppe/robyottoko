<template>
  <div class="macro-select">
    <a @click="show = !show">Select macro</a>
    <div
      v-if="show"
      class="table-holder"
    >
      <table>
        <tr
          v-for="(m, idx) in macros"
          :key="idx"
        >
          <td :title="m.title">
            <code
              class="is-clickable"
              @click="emit('selected', m)"
            >{{
              m.value
            }}</code>
          </td>
          <td>{{ m.title }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface ComponentDataMacro {
  value: string;
  title: string;
}

const macros: ComponentDataMacro[] = [
  { value: "$args", title: "All arguments, joined with spaces" },
  { value: "$args(0)", title: "First argument" },
  {
    value: "$args(1:)",
    title: "Arguments starting from the second one, joined with spaces",
  },
  {
    value: "$args(1:4)",
    title: "Second to fifth arguments, joined with spaces",
  },
  {
    value: "$args(:4)",
    title: "All arguments up to and including the fifth, joined with spaces",
  },
  { value: "$var(VARNAME)", title: "Value of variable VARNAME" },
  { value: "$bot.version", title: "Bot version" },
  { value: "$bot.date", title: "Bot build date" },
  { value: "$bot.website", title: "Bot website" },
  { value: "$bot.github", title: "Bot github link" },
  { value: "$bot.features", title: "Bot feature description" },
  {
    value: "$rand(1,100)",
    title: "Random number between (inclusive) 1 and 100",
  },
  {
    value: "$daysuntil(\"2023-12-24\")",
    title: "Days until a specified date in the format YYYY-MM-DD.",
  },
  {
    value: "$daysuntil(\"2023-12-24\", \"{days} days left\", \"One day left\", \"It is today\")",
    title: "Days until a specified date in the format YYYY-MM-DD, with more control over output.",
  },
  { value: "$user.name", title: "Name of user who executed the command" },
  {
    value: "$user.profile_image_url",
    title: "Profile image url of user who executed the command",
  },
  {
    value: "$user.username",
    title: "Username of user who executed the command",
  },
  {
    value: "$user.twitch_url",
    title: "Twitch url of user who executed the command",
  },
  {
    value: "$user.recent_clip_url",
    title: "Recent clip url of user who executed the command",
  },
  {
    value: "$user.last_stream_category",
    title: "Last stream category of user who executed the command",
  },
  {
    value: "$user(NAME).name",
    title: "Name of user identified by username NAME",
  },
  {
    value: "$user(NAME).username",
    title: "Username of user identified by username NAME",
  },
  {
    value: "$user(NAME).twitch_url",
    title: "Twitch url of user identified by username NAME",
  },
  {
    value: "$user(NAME).profile_image_url",
    title: "Profile image url of user identified by username NAME",
  },
  {
    value: "$user(NAME).recent_clip_url",
    title: "Recent clip url of user identified by username NAME",
  },
  {
    value: "$user(NAME).last_stream_category",
    title: "Last stream category of user identified by username NAME",
  },
  {
    value: "$customapi(URL)",
    title: "Text response of a GET request to URL.",
  },
  {
    value: "$customapi(URL)['FIELD']",
    title: "Field FIELD of a json returned from GET request to URL.",
  },
  {
    value: "$calc(NUM_1+NUM_2)",
    title: "The result of addition of NUM_1 and NUM_2",
  },
  {
    value: "$calc(NUM_1-NUM_2)",
    title: "The result of substraction of NUM_1 and NUM_2",
  },
  {
    value: "$calc(NUM_1*NUM_2)",
    title: "The result of multiplication of NUM_1 and NUM_2",
  },
  {
    value: "$calc(NUM_1/NUM_2)",
    title: "The result of division of NUM_1 and NUM_2",
  },
]

const show = ref<boolean>(false)

const emit = defineEmits<{
  (e: 'selected', val: ComponentDataMacro): void
}>()
</script>
