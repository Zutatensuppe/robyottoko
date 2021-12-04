<template>
  <label class="upload">
    <input
      type="file"
      :disabled="uploading"
      style="display: none"
      @change="upload"
      :accept="accept"
    />
    <span class="button is-small"
      ><i class="fa fa-upload" :class="{ 'mr-1': buttonText }" />{{
        buttonText
      }}</span
    >
    <span class="progress" :style="progressStyle"></span>
  </label>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import xhr from "../xhr";

export default defineComponent({
  name: "upload",
  props: {
    accept: String,
    label: {
      type: String,
      default: "Upload File",
    },
  },
  data: () => ({
    uploading: false,
    progress: 0,
  }),
  computed: {
    uploadPercent() {
      return Math.round(this.progress * 100);
    },
    buttonText() {
      if (!this.uploading) {
        return this.label ? ` ${this.label}` : "";
      }
      return ` Uploading (${this.uploadPercent}%)`;
    },
    progressStyle() {
      if (!this.uploading) {
        return {};
      }
      const p = this.uploadPercent;
      const c = "rgba(0,255,0, .5)";
      return {
        background: `linear-gradient(90deg, ${c} 0%, ${c} ${p}%, transparent ${p}%)`,
      };
    },
  },
  methods: {
    async upload(evt) {
      const file = evt.target.files[0];
      if (!file) {
        return;
      }
      this.uploading = true;
      const formData = new FormData();
      formData.append("file", file, file.name);
      const res = await xhr.post("/api/upload", {
        body: formData,
        onUploadProgress: (evt: ProgressEvent<XMLHttpRequestEventTarget>) => {
          this.progress = evt.loaded / evt.total;
        },
      });
      this.uploading = false;
      const j = await res.json();
      this.$emit("uploaded", j);
    },
  },
});
</script>

<style scoped>
.upload {
  position: relative;
  display: inline-block;
  vertical-align: text-bottom;
}
.upload .progress {
  height: 2px;
  position: absolute;
  bottom: 1px;
  left: 1px;
  right: 1px;
  display: block;
  border-radius: 0 0 var(--button-border-radius) var(--button-border-radius);
}
</style>
