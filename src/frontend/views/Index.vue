<template>
  <div id="app" v-if="conf">
    <div id="top" ref="top">
      <navbar :user="conf.page_data.name" />
    </div>
    <div id="main" ref="main">
      <table class="table is-striped">
        <thead>
          <tr>
            <th>Title</th>
            <th>URL</th>
            <th>Hint</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(widget, idx) in conf.page_data.widgets" :key="idx">
            <td>{{ widget.title }}</td>
            <td>
              <a :href="widget.url">{{ widget.url }}</a>
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
import Navbar from "../components/Navbar.vue";

export default defineComponent({
  components: {
    Navbar,
  },
  data() {
    return {
      conf: null,
    };
  },
  async created() {
    const res = await fetch("/api/page/index");
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
    } else {
      this.conf = await res.json();
    }
  },
});
</script>
<style>
@import "../style-pages.scss";
</style>
