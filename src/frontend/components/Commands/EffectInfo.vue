<template>
  <div v-if="effect.type === CommandEffectType.CHAT">
    <template
      v-for="(txt, idx) in effect.data.text"
      :key="idx"
    >
      <code>{{ effect.data.text[idx] }}</code>
      <span v-if="idx < effect.data.text.length - 1">or</span>
    </template>
  </div>
  <div
    v-else-if="effect.type === CommandEffectType.MEDIA"
    :class="effect.type"
  >
    <div v-if="effect.data.video.url">
      Play Video <code>{{ effect.data.video.url }}</code>
      in the
      <a
        v-if="effect.data.widgetIds.length === 0"
        class="button is-small mr-1"
        :href="`${mediaWidgetUrl}`"
        target="_blank"
      >default widget</a>
      <a
        v-for="(id, idx) in effect.data.widgetIds"
        :key="idx"
        class="button is-small mr-1"
        :href="`${mediaWidgetUrl}?id=${encodeURIComponent(id)}`"
        target="_blank"
      >
        <code>{{ id }}</code> Widget
      </a>
    </div>
    <div
      v-else-if="effect.data.image_url || effect.data.image.file || effect.data.sound.file"
      class="spacerow media-holder media-holder-inline"
    >
      <ResponsiveImage
        v-if="(effect.data.image_url || effect.data.image.file) && imagesVisible"
        :src="effect.data.image_url || effect.data.image.urlpath"
        :title="effect.data.image.filename"
        width="100px"
        height="50px"
        style="display: inline-block"
      />
      <code v-else-if="(effect.data.image_url || effect.data.image.file)">{{
        effect.data.image_url || effect.data.image.filename
      }}</code>

      <i
        v-if="(effect.data.image_url || effect.data.image.file) && effect.data.sound.file"
        class="fa fa-plus is-justify-content-center mr-2 ml-2"
      />
      <AudioPlayer
        :src="effect.data.sound.urlpath"
        :name="effect.data.sound.filename"
        :volume="effect.data.sound.volume"
        :base-volume="baseVolume"
        class="button is-small is-justify-content-center"
      />
      <span
        v-if="(effect.data.image_url || effect.data.image.file) && effect.data.sound.file"
        class="ml-2"
      >for at least
        <DurationDisplay :value="effect.data.minDurationMs" />
      </span>
      <span
        v-else-if="(effect.data.image_url || effect.data.image.file)"
        class="ml-2"
      >for
        <DurationDisplay :value="effect.data.minDurationMs" />
      </span>
      <span class="ml-1 mr-1">in the</span>
      <a
        v-if="effect.data.widgetIds.length === 0"
        class="button is-small mr-1"
        :href="`${mediaWidgetUrl}`"
        target="_blank"
      >default widget</a>
      <a
        v-for="(id, idx) in effect.data.widgetIds"
        :key="idx"
        class="button is-small mr-1"
        :href="`${mediaWidgetUrl}?id=${encodeURIComponent(id)}`"
        target="_blank"
      >
        <code>{{ id }}</code> Widget
      </a>
    </div>
  </div>
  <div v-else-if="effect.type === CommandEffectType.COUNTDOWN">
    <div v-if="(effect.data.type || 'auto') === 'auto'">
      <code>{{ effect.data.intro }}</code>
      <span>→</span>
      <code>{{ effect.data.steps }}</code> ✕
      <DurationDisplay :value="effect.data.interval" />
      <span>→</span>
      <code>{{ effect.data.outro }}</code>
    </div>
    <div v-else>
      <template
        v-for="(a, idxActions) in effect.data.actions"
        :key="idxActions"
      >
        <DurationDisplay
          v-if="a.type === 'delay'"
          :value="a.value"
        />
        <code v-if="a.type === 'text'">{{ a.value }}</code>
        <code v-if="a.type === 'media'">
          Media(<span v-if="a.value.image.file">{{
            a.value.image.filename
          }}</span><span v-if="a.value.image.file && a.value.sound.file">+</span><span v-if="a.value.sound.file">{{
            a.value.sound.filename
          }}</span>)
        </code>
        <span v-if="idxActions < effect.data.actions.length - 1">→</span>
      </template>
    </div>
  </div>
  <div v-else-if="effect.type === CommandEffectType.DICT_LOOKUP">
    Dictionary lookup. Language: <code>{{ effect.data.lang }}</code> Phrase: <code>{{ effect.data.phrase }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.CHATTERS">
    Outputs the people who chatted during the stream.
  </div>
  <div v-else-if="effect.type === CommandEffectType.ADD_STREAM_TAGS">
    Add stream tags. Tags: <code>{{ effect.data.tag }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.REMOVE_STREAM_TAGS">
    Remove stream tags. Tags: <code>{{ effect.data.tag }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.SET_CHANNEL_GAME_ID">
    Set stream category to <code>{{ effect.data.game_id }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.SET_CHANNEL_TITLE">
    Set stream title to <code>{{ effect.data.title }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.EMOTES">
    Show emotes on the emote wall. <br>
    Function(s): <code>{{ effect.data.displayFn.map((item: EmoteDisplayFn) => item.fn).join(', ') }}</code><br>
    Emote(s): <img
      v-for="(emote, idx) in effect.data.emotes"
      :key="idx"
      :src="emote.url"
      width="32"
    >
  </div>
  <div v-else-if="effect.type === CommandEffectType.MADOCHAN">
    Generate a definition for a word. <br>
    Model: <code>{{ effect.data.model }}</code> <br>
    Weirdness: <code>{{ effect.data.weirdness }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.MEDIA_VOLUME">
    Change the base volume of media playing in the media widget.
  </div>
  <div v-else-if="effect.type === CommandEffectType.VARIABLE_CHANGE">
    Change variable. <code>{{ effect.data.name }}</code><code>{{ effect.data.change }}</code><code>{{ effect.data.value }}</code>
  </div>
  <div v-else-if="effect.type === CommandEffectType.ROULETTE">
    Spin the roulette wheel
  </div>
  <div v-else>
    {{ effect }}
  </div>
</template>
<script setup lang="ts">
import { CommandEffectData, CommandEffectType } from '../../../types'
import ResponsiveImage from '../ResponsiveImage.vue'
import AudioPlayer from '../AudioPlayer.vue'
import DurationDisplay from '../DurationDisplay.vue'
import { EmoteDisplayFn } from '../../../mod/modules/GeneralModuleCommon'

defineProps<{
  effect: CommandEffectData,
  imagesVisible: boolean,
  baseVolume: number,
  mediaWidgetUrl: string,
}>()
</script>
