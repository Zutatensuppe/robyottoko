import { loadAssetsForChannel, getEmotes } from './lib/emote-parse'
import emojiDetect from '@zutatensuppe/emoji-detect'
import { ChatMessageContext } from '../types'

export class EmoteParser {
  loadAssetsForChannel(channel: string, channelId: string) {
    loadAssetsForChannel(channel, channelId)
  }

  private extractEmojiEmotes (context: ChatMessageContext) {
    return emojiDetect.detectStrings(context.msgOriginal).map(str => ({
      url: `https://cdn.betterttv.net/assets/emoji/${str}.svg`,
    }))
  }

  extractEmotes (context: ChatMessageContext) {
    const emotes = getEmotes(context.msgOriginal, context.context, context.target)

    return [
      ...emotes.map(e => ({ url: e.img })),
      ...this.extractEmojiEmotes(context),
    ]
  }

}
