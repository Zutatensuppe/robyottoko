<template>
  <div
    v-if="widgets"
    class="view"
  >
    <div
      id="top"
      ref="top"
    >
      <NavbarElement />
    </div>
    <div
      id="main"
      ref="main"
    >
      <table class="table is-striped is-fullwidth">
        <thead>
          <tr>
            <th>Widget</th>
            <th>Hint</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(widget, idx) in widgets"
            :key="idx"
          >
            <td>
              <a
                :href="widget.url"
                target="blank"
              >{{ widget.title }}</a>
            </td>
            <td>{{ widget.hint }}</td>
            <td>
              <span
                class="button is-small ml-1"
                @click="newUrl(widget)"
              >Generate new url</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import api from "../api";
import { useToast } from "vue-toastification";
import NavbarElement from '../components/NavbarElement.vue'

interface WidgetDefinition {
  type: string
  pub: boolean
  title: string
  hint: string
  url: string
}

export default defineComponent({
  components: {
    NavbarElement,
  },
  data: () => ({
    widgets: [] as WidgetDefinition[],
    toast: useToast(),
  }),
  async created() {
    const res = await api.getPageIndexData();
    if (res.status !== 200) {
      this.$router.push({ name: "login" });
      return;
    }

    const data: { widgets: WidgetDefinition[] } = await res.json();
    this.widgets = data.widgets;
  },
  methods: {
    // TODO: define widget type
    async newUrl(widget: WidgetDefinition): Promise<void> {
      const res = await api.createWidgetUrl({
        type: widget.type,
        pub: widget.pub,
      });
      if (res.status === 200) {
        try {
          const json = await res.json();
          if (json.url) {
            this.widgets = this.widgets.map((w) => {
              if (w.type === widget.type) {
                w.url = json.url;
              }
              return w;
            });
          }
          this.toast.success("New URL created");
        } catch (e: any) {
          this.toast.error("New URL couldn't be created");
        }
      } else {
        this.toast.error("New URL couldn't be created");
      }
    },
  },
});
</script>
