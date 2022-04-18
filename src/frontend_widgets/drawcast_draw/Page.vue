<template>
  <div id="drawcast">
    <div class="drawcast_body" :class="{ blurred: dialog }">
      <div class="streamer_info" v-if="customDescription" :class="{ 'no-avatar': !customProfileImageUrl }">
        <div class="streamer_avatar" v-if="customProfileImageUrl"
          :style="{ backgroundImage: `url(${customProfileImageUrl})` }"></div>
        <div class="streamer_message">
          <span class="streamer_message_inner">{{ customDescription }} </span>
        </div>
      </div>
      <div class="draw_panel">
        <div class="draw_panel_inner">
          <div class="draw_panel_top">
            <div class="draw_canvas_holder">
              <div class="draw_canvas_holder_inner" :class="canvasClasses"
                :style="{ width: canvasWidth + 4, height: canvasHeight + 4 }">
                <canvas ref="finalcanvas" :width="canvasWidth" :height="canvasHeight" :style="styles"></canvas>
                <canvas ref="draftcanvas" :width="canvasWidth" :height="canvasHeight" :style="styles"
                  @touchstart.prevent="touchstart" @touchmove.prevent="touchmove" @mousedown="mousedown"></canvas>
              </div>
            </div>
            <div class="v355_1274">
              <div class="card draw_tools_panel">
                <div class="draw_tools_tool_buttons">
                  <div class="draw_tools_tool_button clickable tool-pen" :class="{
                    'is-current': tool === 'pen',
                  }" title="Pen" @click="tool = 'pen'">
                    <icon-pen />
                  </div>
                  <div class="draw_tools_tool_button clickable tool-eraser" :class="{
                    'is-current': tool === 'eraser',
                  }" title="Eraser" @click="tool = 'eraser'">
                    <icon-eraser />
                  </div>
                  <div class="draw_tools_tool_button clickable tool-eyedropper" :class="{
                    'is-current': tool === 'color-sampler',
                  }" title="Color Sampler" @click="tool = 'color-sampler'">
                    <icon-eyedropper />
                  </div>
                  <div class="draw_tools_tool_button clickable tool-undo" title="Undo" @click="undo">
                    <icon-undo />
                  </div>
                  <div class="draw_tools_tool_button clickable tool-clear" title="Clear the canvas"
                    @click="showClearDialog">
                    <icon-clear />
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-small bubble-dark"></div>
                  </div>
                  <div class="slider-input-holder">
                    <input v-model="sizeIdx" type="range" min="0" :max="sizes.length - 1" step="1" />
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark"></div>
                  </div>
                </div>
                <div class="slider">
                  <div class="bubble bubble-left">
                    <div class="bubble-big bubble-light"></div>
                  </div>
                  <div class="slider-input-holder">
                    <input v-model="transparencyIdx" type="range" min="0" :max="transparencies.length - 1" step="1"
                      @update:modelValue="updateTransparency" />
                  </div>
                  <div class="bubble bubble-right">
                    <div class="bubble-big bubble-dark"></div>
                  </div>
                </div>

                <div class="visual_background">
                  <div class="visual_background_title">Visual Background:</div>
                  <div class="visual_background_colors">
                    <div v-for="(bg, idx) of ['transparent-light', 'transparent-dark']" :key="idx"
                      @click="opt('canvasBg', bg)" class="visual_background_button clickable"
                      :class="{ 'is-current': canvasBg === bg, [`bg-${bg}`]: true }"></div>
                  </div>
                </div>
              </div>
              <div class="hotkey-help">
                <div class="hotkey-help-title">Hotkeys</div>
                <div class="hotkey-help-item" v-for="(item, idx) of hotkeys">{{ item }}</div>
              </div>
            </div>
          </div>
          <div class="draw_panel_bottom">
            <div class="draw_colors">
              <div class="draw_colors_current">
                <label class="draw_colors_current_label clickable">
                  <input type="color" v-model="color" />
                  <span class="draw_colors_current_inner" :class="{ active: tool === 'pen' }"
                    :style="currentColorStyle">
                  </span>
                  <div class="draw_colors_current_icon">
                    <icon-eyedropper />
                  </div>
                </label>
              </div>
              <div class="draw_colors_palette">
                <div class="palette_color clickable" v-for="(c, idx) in palette" :style="{ backgroundColor: c }"
                  :key="idx" @click="
  color = c;
tool = 'pen';
                  "></div>
              </div>
            </div>
            <div></div>
            <div class="drawing_panel_bottom_right">
              <div v-if="sending.nonce" class="button button-primary send_button" @click="prepareSubmitImage">
                <span class="send_button_text">⏳ Sending...</span>
              </div>
              <div v-else class="button button-primary send_button clickable" @click="prepareSubmitImage">
                <icon-send />
                <span class="send_button_text">
                  {{ submitButtonText }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-for="(fav, idx) in favoriteListsFiltered" :key="idx" class="drawings-panel favorite-drawings-panel">
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            fav.title || "Streamer's favorites:"
          }}</span>
        </div>
        <div class="drawing_panel_drawings" v-if="nonfavorites.length">
          <img class="image favorite clickable" v-for="(img, idx) in fav.list" :key="idx" @click="prepareModify(img)"
            :src="img" height="190" />
        </div>
      </div>
      <div class="drawings-panel recent-drawings-panel">
        <div class="drawings_panel_title">
          <span class="drawings_panel_title_inner">{{
            recentImagesTitle
          }}</span>
        </div>
        <div class="drawing_panel_drawings">
          <img class="image clickable" v-for="(img, idx) in nonfavorites" :key="idx" @click="prepareModify(img)"
            :src="img" height="190" />
          <div class="dotdotdot"></div>
        </div>
      </div>
    </div>

    <div class="drawcast_footer" :class="{ blurred: dialog }">
      <span class="drawcast_footer_left">Hyottoko.club | Developed by
        <a href="https://github.com/zutatensuppe" target="_blank">para</a>. UI
        Design by
        <a href="https://www.artstation.com/lisadikaprio" target="_blank">LisadiKaprio</a></span><span
        class="drawcast_footer_right"><a href="https://github.com/zutatensuppe/robyottoko" target="_blank">Source code
          on Github</a>
        |
        <a href="https://twitch.tv/nc_para_" target="_blank">Developer’s Twitch channel</a>
        |
        <a href="https://jigsaw.hyottoko.club" target="_blank">Jigsaw Puzzle Multiplayer</a></span>
    </div>

    <div class="dialog success-dialog" v-if="dialog === 'success'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-image">
          <div class="responsive-image" :style="successImageUrlStyle"></div>
        </div>
        <div class="dialog-title">Success!</div>
        <div class="dialog-body" v-html="dialogBody"></div>
        <div class="dialog-footer">
          <div class="button button-ok clickable" @click="dialogClose">
            Draw another one
          </div>
        </div>
      </div>
    </div>
    <div class="dialog confirm-dialog" v-if="dialog === 'replace'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-body" v-html="dialogBody"></div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-danger clickable" @click="dialogConfirm">
            Replace image
          </div>
        </div>
      </div>
    </div>
    <div class="dialog confirm-dialog" v-if="dialog === 'confirm-submit'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-body" v-html="dialogBody"></div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-ok clickable" @click="dialogConfirm">
            Send
          </div>
        </div>
      </div>
    </div>
    <div class="dialog clear-dialog" v-if="dialog === 'clear'">
      <div class="dialog-bg" @click="dialogClose"></div>
      <div class="dialog-container">
        <div class="dialog-image">
          <div class="responsive-image" :style="clearImageUrlStyle"></div>
        </div>
        <div class="dialog-body" v-html="dialogBody"></div>
        <div class="dialog-footer">
          <div class="button button-no-button clickable" @click="dialogClose">
            Cancel
          </div>
          <div class="button button-danger clickable" @click="dialogConfirm">
            Clear
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { nonce, logger, pad } from "../../common/fn";
import WsClient from "../../frontend/WsClient";
import { DrawcastFavoriteList } from "../../types";
import util from "../util";
import { DrawcastModuleWsDataData } from "../../mod/modules/DrawcastModuleCommon";

const log = logger("Page.vue");

interface Point {
  x: number
  y: number
}

const touchPoint = (canvas: HTMLCanvasElement, evt: TouchEvent) => {
  const bcr = canvas.getBoundingClientRect();
  return {
    x: evt.targetTouches[0].clientX - bcr.x,
    y: evt.targetTouches[0].clientY - bcr.y,
  };
};

const mousePoint = (canvas: HTMLCanvasElement, evt: MouseEvent) => {
  const bcr = canvas.getBoundingClientRect();
  return { x: evt.clientX - bcr.x, y: evt.clientY - bcr.y };
};

const hexIsLight = (color: string) => {
  const hex = color.replace("#", "");
  const c_r = parseInt(hex.substr(0, 2), 16);
  const c_g = parseInt(hex.substr(2, 2), 16);
  const c_b = parseInt(hex.substr(4, 2), 16);
  const brightness = (c_r * 299 + c_g * 587 + c_b * 114) / 1000;
  return brightness > 69;
};

export default defineComponent({
  data() {
    return {
      ws: null as WsClient | null,
      opts: {} as Record<string, string>,
      palette: ["#000000"],

      images: [] as string[],
      favoriteLists: [] as DrawcastFavoriteList[],

      color: "#000000",
      sampleColor: "",

      hotkeys: ['E Eraser', 'B Pencil', 'S Color sampler', '1-7 Adjust size', 'Ctrl+Z Undo'],

      tool: "pen", // 'pen'|'eraser'|'color-sampler'
      sizes: [1, 2, 5, 10, 30, 60, 100],
      sizeIdx: 2,
      transparencies: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
      transparencyIdx: 9,
      ctx: {} as CanvasRenderingContext2D,
      finalctx: {} as CanvasRenderingContext2D,

      last: null as Point | null,

      canvasWidth: 720,
      canvasHeight: 405,
      submitButtonText: "Submit",
      submitConfirm: "",
      customDescription: "",
      customProfileImageUrl: "",
      recentImagesTitle: "",

      stack: [] as ImageData[],
      drawing: false,

      dialog: "",
      dialogBody: "",
      modifyImageUrl: "",
      successImageUrlStyle: {},
      clearImageUrlStyle: {},

      sending: {
        date: null as null | Date,
        nonce: "",
      },
    };
  },
  computed: {
    finalcanvas(): HTMLCanvasElement {
      return this.$refs.finalcanvas as HTMLCanvasElement;
    },
    draftcanvas(): HTMLCanvasElement {
      return this.$refs.draftcanvas as HTMLCanvasElement;
    },
    favoriteListsFiltered(): DrawcastFavoriteList[] {
      return this.favoriteLists.filter(
        (fav: DrawcastFavoriteList) => fav.list.length > 0
      );
    },
    favorites(): string[] {
      const favorites = [];
      for (const fav of this.favoriteLists) {
        favorites.push(...fav.list);
      }
      return favorites;
    },
    currentColorStyle(): { backgroundColor: string } {
      return {
        backgroundColor:
          this.tool === "color-sampler" ? this.sampleColor : this.color,
      };
    },
    size(): number {
      return this.sizes[this.sizeIdx];
    },
    transparency(): number {
      return this.transparencies[this.transparencyIdx];
    },
    nonfavorites(): string[] {
      return this.images.filter((url: string) => !this.favorites.includes(url));
    },
    canvasBg(): string {
      return ["transparent-light", "transparent-dark"].includes(this.opts.canvasBg)
        ? this.opts.canvasBg
        : "transparent-light";
    },
    canvasClasses(): string[] {
      return [`bg-${this.canvasBg}`];
    },
    halfSize(): number {
      return Math.round(this.size / 2);
    },
    styles(): { cursor: string } {
      return {
        cursor: this.cursor,
      };
    },
    cursor(): string {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d") as CanvasRenderingContext2D;
      if (this.tool === "color-sampler") {
        return "crosshair";
      }

      c.width = this.size + 1;
      c.height = this.size + 1;
      ctx.beginPath();
      if (this.tool === "eraser") {
        ctx.fillStyle = "#fff";
      } else {
        ctx.fillStyle = this.color;
      }
      ctx.strokeStyle = hexIsLight(String(ctx.fillStyle)) ? "#000" : "#fff";

      ctx.arc(this.halfSize, this.halfSize, this.halfSize, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return `url(${c.toDataURL()}) ${this.halfSize} ${this.halfSize}, default`;
    },
  },
  methods: {
    updateTransparency() {
      this.draftcanvas.style.opacity = `${this.transparency / 100}`;
    },
    opt(option: string, value: string) {
      this.opts[option] = value;
      window.localStorage.setItem("drawcastOpts", JSON.stringify(this.opts));
    },
    async modify(imageUrl: string) {
      const image = new Image();
      return new Promise(async (resolve) => {
        image.src = imageUrl;
        image.onload = async (ev) => {
          this.img(image);
          this.stack = [];
          this.drawing = false;
          this.stack.push(this.getImageData());
        };
      });
    },
    undo() {
      this.stack.pop();
      this.clear();
      this.drawing = false;
      if (this.stack.length > 0) {
        this.putImageData(this.stack[this.stack.length - 1]);
      }
    },
    getImageData(): ImageData {
      return this.finalctx.getImageData(
        0,
        0,
        this.finalcanvas.width,
        this.finalcanvas.height
      );
    },
    putImageData(imageData: ImageData) {
      this.finalctx.putImageData(imageData, 0, 0);
    },
    img(imageObject: CanvasImageSource) {
      this.clear();
      const tmp = this.finalctx.globalCompositeOperation;
      this.finalctx.globalCompositeOperation = "source-over";
      this.finalctx.drawImage(imageObject, 0, 0);
      this.finalctx.globalCompositeOperation = tmp;
    },
    drawPathPart(pts: Point[]) {
      this.drawing = true;
      const color = this.color;
      const size = this.size;
      const halfSize = this.halfSize;
      if (pts.length === 0) {
        return;
      }

      const fillpath = (ctx: CanvasRenderingContext2D) => {
        if (pts.length === 1) {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(pts[0].x, pts[0].y, halfSize, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.fill();
          return;
        }

        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.stroke();
      };

      if (this.tool === "eraser") {
        this.finalctx.globalCompositeOperation = "destination-out";
        fillpath(this.finalctx);
        return;
      }

      this.finalctx.globalCompositeOperation = "source-over";
      fillpath(this.ctx);
    },

    cancelDraw() {
      if (!this.drawing) {
        return;
      }

      if (this.tool !== "eraser") {
        this.finalctx.globalAlpha = this.transparency / 100;
        this.finalctx.drawImage(this.draftcanvas, 0, 0);
        this.finalctx.globalAlpha = 1;

        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      }

      this.stack.push(this.getImageData());
      this.drawing = false;
      this.last = null;
    },

    startDraw(pt: Point) {
      if (this.tool === "color-sampler") {
        if (
          pt.x >= 0 &&
          pt.y >= 0 &&
          pt.x < this.canvasWidth &&
          pt.y < this.canvasHeight
        ) {
          this.color = this.getColor(pt);
        }
        return;
      }

      if (
        pt.x >= -this.size &&
        pt.y >= -this.size &&
        pt.x < this.canvasWidth + this.size &&
        pt.y < this.canvasHeight + this.size
      ) {
        const cur = pt;
        this.drawPathPart([cur]);
        this.last = cur;
      }
    },

    continueDraw(pt: Point) {
      if (this.tool === "color-sampler") {
        this.sampleColor = this.getColor(pt);
      }
      if (!this.last) {
        return;
      }
      const cur = pt;
      this.drawPathPart([this.last, cur]);
      this.last = cur;
    },

    touchstart(e: TouchEvent) {
      e.preventDefault();
      this.startDraw(touchPoint(this.draftcanvas, e));
    },
    mousedown(e: MouseEvent) {
      this.startDraw(mousePoint(this.draftcanvas, e));
    },

    touchmove(e: TouchEvent) {
      e.preventDefault();
      this.continueDraw(touchPoint(this.draftcanvas, e));
    },
    mousemove(e: MouseEvent) {
      this.continueDraw(mousePoint(this.draftcanvas, e));
    },

    clear() {
      this.ctx.clearRect(0, 0, this.draftcanvas.width, this.draftcanvas.height);
      this.finalctx.clearRect(
        0,
        0,
        this.finalcanvas.width,
        this.finalcanvas.height
      );
    },
    clearClick() {
      this.clear();
      this.stack = [];
      this.drawing = false;
    },
    prepareSubmitImage() {
      if (this.submitConfirm) {
        this.dialog = "confirm-submit";
        this.dialogBody = this.submitConfirm;
        return;
      }
      this.submitImage();
    },
    submitImage() {
      if (!this.ws) {
        log.error("submitImage: this.ws not set");
        return;
      }

      if (this.sending.nonce) {
        // we are already sending something
        log.error("submitImage: nonce not empty");
        return;
      }

      this.sending.date = new Date();
      this.sending.nonce = nonce(10);
      this.ws.send(
        JSON.stringify({
          event: "post",
          data: {
            nonce: this.sending.nonce,
            img: this.finalcanvas.toDataURL(),
          },
        })
      );
      // success will be handled in onMessage('post') below
    },
    showClearDialog() {
      const w = 100;
      const h = Math.round((w * this.canvasHeight) / this.canvasWidth);

      this.clearImageUrlStyle = {
        backgroundImage: `url(${this.finalcanvas.toDataURL()})`,
        width: w + "px",
        height: h + "px",
      };
      this.dialog = "clear";
      this.dialogBody = `
        If you click this, your current drawing will be erased. <br />
        <br />
        Do you want to proceed?`;
    },
    prepareModify(imageUrl: string) {
      this.modifyImageUrl = imageUrl;
      this.dialog = "replace";
      this.dialogBody = `
        If you click this, your current drawing will be erased and replaced by
        the drawing you just clicked on. <br />
        <br />
        Do you want to proceed?`;
    },
    dialogClose() {
      this.dialog = "";
      this.dialogBody = "";
    },
    dialogConfirm() {
      if (this.dialog === "confirm-submit") {
        this.dialog = "";
        this.submitImage();
      } else if (this.dialog === "clear") {
        this.dialog = "";
        this.clearClick();
      } else if (this.dialog === "replace") {
        this.dialog = "";
        this.modify(this.modifyImageUrl);
      }
    },
    getColor(pt: Point) {
      const [r, g, b, a] = this.finalctx.getImageData(pt.x, pt.y, 1, 1).data;
      const hex = (v: number) => pad(v.toString(16), "00");
      // when selecting transparent color, instead use first color in palette
      return a ? `#${hex(r)}${hex(g)}${hex(b)}` : this.palette[0];
    },
    keyup(e: KeyboardEvent) {
      if (e.code === "Digit1") {
        this.sizeIdx = 0;
      } else if (e.code === "Digit2") {
        this.sizeIdx = 1;
      } else if (e.code === "Digit3") {
        this.sizeIdx = 2;
      } else if (e.code === "Digit4") {
        this.sizeIdx = 3;
      } else if (e.code === "Digit5") {
        this.sizeIdx = 4;
      } else if (e.code === "Digit6") {
        this.sizeIdx = 5;
      } else if (e.code === "Digit7") {
        this.sizeIdx = 6;
      } else if (e.code === "KeyB") {
        // pencil
        this.tool = "pen";
      } else if (e.code === "KeyS") {
        // color Sampler
        this.tool = "color-sampler";
      } else if (e.code === "KeyE") {
        // eraser
        this.tool = "eraser";
      } else if (e.code === "KeyZ" && e.ctrlKey) {
        this.undo();
      }
    },
  },
  mounted() {
    this.ctx = this.draftcanvas.getContext("2d") as CanvasRenderingContext2D;
    this.finalctx = this.finalcanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;

    this.ws = util.wsClient("drawcast_draw");

    const opts = window.localStorage.getItem("drawcastOpts");
    this.opts = opts ? JSON.parse(opts) : { canvasBg: "transparent" };

    this.ws.onMessage("init", (data: DrawcastModuleWsDataData) => {
      // submit button may not be empty
      this.submitButtonText = data.settings.submitButtonText || "Send";
      this.submitConfirm = data.settings.submitConfirm;
      this.canvasWidth = data.settings.canvasWidth;
      this.canvasHeight = data.settings.canvasHeight;
      this.customDescription = data.settings.customDescription || "";
      this.customProfileImageUrl =
        data.settings.customProfileImage &&
          data.settings.customProfileImage.urlpath
          ? data.settings.customProfileImage.urlpath
          : "";
      this.recentImagesTitle =
        data.settings.recentImagesTitle || "Newest submitted:";
      this.palette = data.settings.palette || this.palette;
      this.favoriteLists = data.settings.favoriteLists;
      this.color = this.palette[0];
      this.images = data.images.map((image) => image.path);

      if (this.images.length > 0 && data.settings.autofillLatest) {
        this.modify(this.images[0]);
      }

      // test data
      // this.submitButtonText = "Send this image to the striiim";
      // this.customProfileImageUrl =
      //   "https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_783ce3fc0013443695c62933da3669c5/default/dark/3.0";
      // this.customDescription = `💙👀 Please draw something cute. This will appear on my stream
      //           screen!~ Click any of the drawings in the gallery to continue
      //           drawing on them!`;
    });
    this.ws.onMessage(
      "image_received",
      (data: { nonce: string; img: string }) => {
        if (
          this.sending.date &&
          this.sending.nonce &&
          data.nonce === this.sending.nonce
        ) {
          // we want to have the 'sending' state for at least minMs ms
          // for images that we have just sent, for other images they may
          // be added immediately
          const minMs = 500;
          const now = new Date();
          const timeoutMs = this.sending.date.getTime() + minMs - now.getTime();
          setTimeout(() => {
            this.successImageUrlStyle = {
              backgroundImage: `url(${data.img})`,
            };
            this.dialog = "success";
            this.dialogBody = "Your drawing was sent and is pending approval.";
            this.sending.nonce = "";
            this.sending.date = null;
          }, Math.max(0, timeoutMs));
        }
      }
    );
    this.ws.onMessage(
      "approved_image_received",
      (data: { nonce: string; img: string }) => {
        if (
          this.sending.date &&
          this.sending.nonce &&
          data.nonce === this.sending.nonce
        ) {
          // we want to have the 'sending' state for at least minMs ms
          // for images that we have just sent, for other images they may
          // be added immediately
          const minMs = 500;
          const now = new Date();
          const timeoutMs = this.sending.date.getTime() + minMs - now.getTime();
          setTimeout(() => {
            this.successImageUrlStyle = {
              backgroundImage: `url(${data.img})`,
            };
            this.dialog = "success";
            this.dialogBody = "Your drawing was sent to the stream.";
            this.sending.nonce = "";
            this.sending.date = null;

            this.images.unshift(data.img);
            this.images = this.images.slice(0, 20);
          }, Math.max(0, timeoutMs));
        } else {
          this.images.unshift(data.img);
          this.images = this.images.slice(0, 20);
        }
      }
    );
    this.ws.connect();

    window.addEventListener("mousemove", this.mousemove);
    window.addEventListener("mouseup", this.cancelDraw);
    window.addEventListener("touchend", this.cancelDraw);
    window.addEventListener("touchcancel", this.cancelDraw);
    window.addEventListener("keyup", this.keyup);

    this.$watch("color", () => {
      this.tool = "pen";
    });
  },
  unmounted() {
    window.removeEventListener("mousemove", this.mousemove);
    window.removeEventListener("mouseup", this.cancelDraw);
    window.removeEventListener("touchend", this.cancelDraw);
    window.removeEventListener("touchcancel", this.cancelDraw);
    window.removeEventListener("keyup", this.keyup);
  },
});
</script>
