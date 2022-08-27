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
              @click="onMacroClicked(m)"
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

<script lang="ts">
import { defineComponent } from "vue";

interface ComponentDataMacro {
  value: string;
  title: string;
}

interface ComponentData {
  show: boolean;
  macros: ComponentDataMacro[];
}

export default defineComponent({
  emits: ['selected'],
  data: (): ComponentData => ({
    show: false,
    macros: [
      { value: "$args", title: "All args, joined with spaces" },
      {
        value: "$args(1:)",
        title: "Args starting from the second one, joined with spaces",
      },
      {
        value: "$args(1:4)",
        title: "Second to fifth args, joined with spaces",
      },
      {
        value: "$args(:4)",
        title: "All args up to and including the fifth, joined with spaces",
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
    ],
  }),
  methods: {
    onMacroClicked(macro: ComponentDataMacro) {
      this.$emit("selected", macro);
    },
  },
});
</script>
