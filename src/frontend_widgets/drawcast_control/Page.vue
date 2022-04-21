<template>
  <div class="p-2">
    <h1 class="title">Drawings awaiting approval</h1>
    <div v-if="manualApproval.items.length">
      <div class="image-to-approve card mr-1" v-for="(url, idx2) in manualApproval.items" :key="idx2">
        <div class="card-body">
          <img :src="url" class="thumbnail mr-1" />
        </div>
        <div class="card-footer">
          <span class="card-footer-item button is-small is-success is-light" @click="approveImage(url)">
            Approve!
          </span>
          <span class="card-footer-item button is-small is-danger is-light" @click="denyImage(url)">
            Deny!
          </span>
        </div>
      </div>
    </div>
    <div v-else>Currently there are no drawings awaiting approval.</div>
  </div>
</template>
<script lang="ts">
import { DrawcastData } from "../../types";
import api from "../../frontend/api";

import { defineComponent } from "vue";
import WsClient from "../../frontend/WsClient";
import { DrawcastImage } from "../../mod/modules/DrawcastModuleCommon";
import util from "../util";
import MediaQueueElement from "../MediaQueueElement.vue";

interface ComponentData {
  inited: boolean;
  ws: WsClient | null;
  notificationSoundAudio: any;
  manualApproval: {
    items: string[];
  };
}

export default defineComponent({
  components: {
    MediaQueueElement,
  },
  data(): ComponentData {
    return {
      inited: false,
      ws: null,
      notificationSoundAudio: null,
      manualApproval: {
        items: [],
      },
    };
  },
  methods: {
    approveImage(path: string) {
      this.sendMsg({ event: "approve_image", path });
    },
    denyImage(path: string) {
      this.sendMsg({ event: "deny_image", path });
    },
    sendMsg(data: any) {
      if (!this.ws) {
        console.warn("sendMsg: this.ws not initialized");
        return;
      }
      this.ws.send(JSON.stringify(data));
    },
  },
  mounted() {
    this.ws = util.wsClient("drawcast_control");
    this.ws.onMessage("init", async (data: DrawcastData) => {
      const res = await api.getDrawcastAllImages();
      const images = await res.json();

      if (data.settings.notificationSound) {
        this.notificationSoundAudio = new Audio(
          data.settings.notificationSound.urlpath
        );
        this.notificationSoundAudio.volume =
          data.settings.notificationSound.volume / 100.0;
      }

      this.manualApproval.items = images
        .filter((item: DrawcastImage) => !item.approved)
        .map((item: DrawcastImage) => item.path);
      this.inited = true;
    });
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.manualApproval.items = this.manualApproval.items.filter(
          (img) => img !== data.img
        );
      }
    );
    this.ws.onMessage(
      "denied_image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.manualApproval.items = this.manualApproval.items.filter(
          (img) => img !== data.img
        );
      }
    );
    this.ws.onMessage(
      "image_received",
      (data: { nonce: string; img: string; mayNotify: boolean }) => {
        this.manualApproval.items = this.manualApproval.items.filter(
          (img) => img !== data.img
        );

        this.manualApproval.items.push(data.img);
        this.manualApproval.items = this.manualApproval.items.slice();

        if (data.mayNotify && this.notificationSoundAudio) {
          this.notificationSoundAudio.play();
        }
      }
    );
    this.ws.connect();
  },
  unmounted() {
    if (this.ws) {
      this.ws.disconnect()
    }
  },
});
</script>
