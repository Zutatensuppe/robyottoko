export enum CommandTriggerType {
  COMMAND = 'command',
  REWARD_REDEMPTION = 'reward_redemption',
  FOLLOW = 'follow',
  SUB = 'sub',
  GIFTSUB = 'giftsub',
  BITS = 'bits',
  RAID = 'raid',
  TIMER = 'timer',
  FIRST_CHAT = 'first_chat',
}

export enum CommandEffectType {
  VARIABLE_CHANGE = 'variable_change',
  CHAT = 'chat',
  DICT_LOOKUP = 'dict_lookup',
  EMOTES = 'emotes',
  MEDIA = 'media',
  MEDIA_V2 = 'media_v2',
  SET_CHANNEL_TITLE = 'set_channel_title',
  SET_CHANNEL_GAME_ID = 'set_channel_game_id',
  ADD_STREAM_TAGS = 'add_stream_tags',
  REMOVE_STREAM_TAGS = 'remove_stream_tags',
  CHATTERS = 'chatters',
  COUNTDOWN = 'countdown',
  MEDIA_VOLUME = 'media_volume',
  ROULETTE = 'roulette',
}

export enum CommandAction {
  // general
  GENERAL = 'general',
  // song request
  SR_CURRENT = 'sr_current',
  SR_UNDO = 'sr_undo',
  SR_GOOD = 'sr_good',
  SR_BAD = 'sr_bad',
  SR_STATS = 'sr_stats',
  SR_PREV = 'sr_prev',
  SR_NEXT = 'sr_next',
  SR_JUMPTONEW = 'sr_jumptonew',
  SR_CLEAR = 'sr_clear',
  SR_RM = 'sr_rm',
  SR_SHUFFLE = 'sr_shuffle',
  SR_RESET_STATS = 'sr_reset_stats',
  SR_LOOP = 'sr_loop',
  SR_NOLOOP = 'sr_noloop',
  SR_PAUSE = 'sr_pause',
  SR_UNPAUSE = 'sr_unpause',
  SR_HIDEVIDEO = 'sr_hidevideo',
  SR_SHOWVIDEO = 'sr_showvideo',
  SR_REQUEST = 'sr_request',
  SR_RE_REQUEST = 'sr_re_request',
  SR_ADDTAG = 'sr_addtag',
  SR_RMTAG = 'sr_rmtag',
  SR_VOLUME = 'sr_volume',
  SR_FILTER = 'sr_filter',
  SR_PRESET = 'sr_preset',
  SR_QUEUE = 'sr_queue',
  SR_MOVE_TAG_UP = 'sr_move_tag_up',
}

export enum CountdownActionType {
  TEXT = 'text',
  MEDIA = 'media',
  DELAY = 'delay',
}

export enum MODULE_NAME {
  CORE = 'core', // not really a module
  AVATAR = 'avatar',
  DRAWCAST = 'drawcast',
  GENERAL = 'general',
  POMO = 'pomo',
  SR = 'sr',
  SPEECH_TO_TEXT = 'speech-to-text',
  VOTE = 'vote',
}

export enum WIDGET_TYPE {
  SR = 'sr',
  MEDIA = 'media',
  MEDIA_V2 = 'media_v2',
  EMOTE_WALL = 'emote_wall',
  SPEECH_TO_TEXT_CONTROL = 'speech-to-text',
  SPEECH_TO_TEXT_RECEIVE = 'speech-to-text_receive',
  AVATAR_CONTROL = 'avatar',
  AVATAR_RECEIVE = 'avatar_receive',
  DRAWCAST_RECEIVE = 'drawcast_receive',
  DRAWCAST_DRAW = 'drawcast_draw',
  DRAWCAST_CONTROL = 'drawcast_control',
  POMO = 'pomo',
  ROULETTE = 'roulette',
}
