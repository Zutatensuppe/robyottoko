<template>
  <div class="view" v-if="widgets">
    <div id="top" ref="top">
      <navbar />
    </div>
    <div id="main" ref="main">
      <table class="table is-striped is-fullwidth">
        <thead>
          <tr>
            <th>Widget</th>
            <th>Hint</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(widget, idx) in widgets" :key="idx">
            <td>
              <a :href="widget.url" target="blank">{{ widget.title }}</a>
            </td>
            <td>{{ widget.hint }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import api from "../api";

export default defineComponent({
  data: () => ({
    widgets: null,
  }),
  async created() {
    const res = await api.getPageIndexData();
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }

    const data = await res.json();
    this.widgets = data.widgets;
  },
});
</script>
