import { AddStreamTagEffectData, ChatEffectData, ChattersEffectData, CommandEffectType, CommandVariableChange, CountdownAction, CountdownEffectData, DictLookupEffectData, EmotesEffectData, MadochanEffectData, MediaEffectData, MediaVolumeEffectData, RemoveStreamTagEffectData, SetChannelGameIdEffectData, SetChannelTitleEffectData, VariableChangeEffectData } from '../types'

const variableChangeToCommandEffect = (variableChange: CommandVariableChange): VariableChangeEffectData => {
  return {
    type: CommandEffectType.VARIABLE_CHANGE,
    data: variableChange,
  }
}

const textToCommandEffect = (cmd: any): ChatEffectData => {
  return {
    type: CommandEffectType.CHAT,
    data: {
      text: !Array.isArray(cmd.data.text) ? [cmd.data.text] : cmd.data.text
    },
  }
}

const dictLookupToCommandEffect = (cmd: any): DictLookupEffectData => {
  return {
    type: CommandEffectType.DICT_LOOKUP,
    data: {
      lang: cmd.data.lang,
      phrase: cmd.data.phrase,
    },
  }
}

const emotesToCommandEffect = (cmd: any): EmotesEffectData => {
  return {
    type: CommandEffectType.EMOTES,
    data: {
      displayFn: cmd.data.displayFn,
      emotes: cmd.data.emotes,
    },
  }
}

const mediaToCommandEffect = (cmd: any): MediaEffectData => {
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

const madochanToCommandEffect = (cmd: any): MadochanEffectData => {
  return {
    type: CommandEffectType.MADOCHAN,
    data: {
      model: cmd.data.model,
      weirdness: cmd.data.weirdness,
    },
  }
}

const setChannelTitleToCommandEffect = (cmd: any): SetChannelTitleEffectData => {
  return {
    type: CommandEffectType.SET_CHANNEL_TITLE,
    data: {
      title: cmd.data.title,
    },
  }
}

const setChannelGameIdToCommandEffect = (cmd: any): SetChannelGameIdEffectData => {
  return {
    type: CommandEffectType.SET_CHANNEL_GAME_ID,
    data: {
      game_id: cmd.data.game_id,
    },
  }
}

const addStreamTagsToCommandEffect = (cmd: any): AddStreamTagEffectData => {
  return {
    type: CommandEffectType.ADD_STREAM_TAGS,
    data: {
      tag: cmd.data.tag,
    },
  }
}

const removeStreamTagsToCommandEffect = (cmd: any): RemoveStreamTagEffectData => {
  return {
    type: CommandEffectType.REMOVE_STREAM_TAGS,
    data: {
      tag: cmd.data.tag,
    },
  }
}

const chattersToCommandEffect = (_cmd: any): ChattersEffectData => {
  return {
    type: CommandEffectType.CHATTERS,
    data: {},
  }
}

const mediaVolumeToCommandEffect = (_cmd: any): MediaVolumeEffectData => {
  return {
    type: CommandEffectType.MEDIA_VOLUME,
    data: {},
  }
}

const countdownToCommandEffect = (cmd: any): CountdownEffectData => {
  cmd.data.actions = (cmd.data.actions || []).map((action: CountdownAction) => {
    if (typeof action.value === 'string') {
      return action
    }
    if (action.value.sound && !action.value.sound.urlpath && action.value.sound.file) {
      action.value.sound.urlpath = `/uploads/${encodeURIComponent(action.value.sound.file)}`
    }

    if (action.value.image && !action.value.image.urlpath && action.value.image.file) {
      action.value.image.urlpath = `/uploads/${encodeURIComponent(action.value.image.file)}`
    }
    return action
  })

  return {
    type: CommandEffectType.COUNTDOWN,
    data: cmd.data
  }
}

export default {
  addStreamTagsToCommandEffect,
  chattersToCommandEffect,
  countdownToCommandEffect,
  dictLookupToCommandEffect,
  emotesToCommandEffect,
  madochanToCommandEffect,
  mediaToCommandEffect,
  mediaVolumeToCommandEffect,
  removeStreamTagsToCommandEffect,
  setChannelGameIdToCommandEffect,
  setChannelTitleToCommandEffect,
  textToCommandEffect,
  variableChangeToCommandEffect,
}
