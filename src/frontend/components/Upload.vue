<template>
  <label class="upload">
    <input type="file" :disabled="uploading" style="display: none" @change="upload" :accept="accept" />
    <span class="button is-small"><i class="fa fa-upload" :class="{ 'mr-1': buttonText }" />{{
      buttonText
    }}</span>
    <span class="progress" :style="progressStyle"></span>
  </label>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { UploadedFile } from "../../types";
import api from "../api";

const Upload = defineComponent({
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
    async uploadFile(file: File) {
      this.uploading = true;
      const res = await api.upload(file, (progressEvt) => {
        this.progress = progressEvt.loaded / progressEvt.total;
      });
      this.uploading = false;
      const uploadedFile: UploadedFile = await res.json();
      this.$emit("uploaded", uploadedFile);
    },
    async upload(evt: Event) {
      const input = evt.target as HTMLInputElement
      if (!input.files || input.files.length === 0) {
        return;
      }
      this.uploadFile(input.files[0]);
    },
  },
});

export type UploadInstance = InstanceType<typeof Upload>
export default Upload
</script>

<style lang="scss" scoped>
@import "../vars.scss";

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
  border-radius: 0 0 $radius $radius;
}
</style>
