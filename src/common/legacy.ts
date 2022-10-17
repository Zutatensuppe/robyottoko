import { ChatEffect, CommandEffectType, CommandVariableChange, DictLookupEffect, EmotesEffect, MediaEffect, VariableChangeEffect } from "../types"

const variableChangeToCommandEffect = (variableChange: CommandVariableChange): VariableChangeEffect => {
  return {
    type: CommandEffectType.VARIABLE_CHANGE,
    data: variableChange,
  }
}

const textToCommandEffect = (cmd: any): ChatEffect => {
  return {
    type: CommandEffectType.CHAT,
    data: {
      text: !Array.isArray(cmd.data.text) ? [cmd.data.text] : cmd.data.text
    },
  }
}

const dictLookupToCommandEffect = (cmd: any): DictLookupEffect => {
  return {
    type: CommandEffectType.DICT_LOOKUP,
    data: {
      lang: cmd.data.lang,
      phrase: cmd.data.phrase,
    },
  }
}

const emotesToCommandEffect = (cmd: any): EmotesEffect => {
  return {
    type: CommandEffectType.EMOTES,
    data: {
      displayFn: cmd.data.displayFn,
      emotes: cmd.data.emotes,
    },
  }
}

const mediaToCommandEffect = (cmd: any): MediaEffect => {
  if (cmd.data.excludeFromGlobalWidget) {
    cmd.data.widgetIds = [cmd.id]
  } else if (typeof cmd.data.widgetIds === 'undefined') {
    cmd.data.widgetIds = []
  }
  if (typeof cmd.data.excludeFromGlobalWidget !== 'undefined') {
    delete cmd.data.excludeFromGlobalWidget
  }
  cmd.data.minDurationMs = cmd.data.minDurationMs || 0
  cmd.data.sound.volume = cmd.data.sound.volume || 100

  if (!cmd.data.sound.urlpath && cmd.data.sound.file) {
    cmd.data.sound.urlpath = `/uploads/${encodeURIComponent(cmd.data.sound.file)}`
  }

  if (!cmd.data.image.urlpath && cmd.data.image.file) {
    cmd.data.image.urlpath = `/uploads/${encodeURIComponent(cmd.data.image.file)}`
  }

  if (!cmd.data.image_url || cmd.data.image_url === 'undefined') {
    cmd.data.image_url = ''
  }
  if (!cmd.data.video) {
    cmd.data.video = {
      url: cmd.data.video || cmd.data.twitch_clip?.url || '',
      volume: cmd.data.twitch_clip?.volume || 100,
    }
  }
  if (typeof cmd.data.twitch_clip !== 'undefined') {
    delete cmd.data.twitch_clip
  }

  return {
    type: CommandEffectType.MEDIA,
    data: {
      image: cmd.data.image,
      image_url: cmd.data.image_url,
      minDurationMs: cmd.data.minDurationMs,
      sound: cmd.data.sound,
      video: cmd.data.video,
      widgetIds: cmd.data.widgetIds,
    },
  }
}

export default {
  dictLookupToCommandEffect,
  emotesToCommandEffect,
  mediaToCommandEffect,
  textToCommandEffect,
  variableChangeToCommandEffect,
}
