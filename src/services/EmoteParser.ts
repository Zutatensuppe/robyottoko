import { loadAssetsForChannel, getEmotes } from './lib/emote-parse'
import emojiDetect from '@zutatensuppe/emoji-detect'
import { ChatUserstate } from 'tmi.js'
import TwitchHelixClient from './TwitchHelixClient'

export class EmoteParser {
  async loadAssetsForChannel(channel: string, channelId: string, helixClient: TwitchHelixClient) {
    await loadAssetsForChannel(channel, channelId, helixClient)
  }

  private extractEmojiEmotes (message: string) {
    return emojiDetect.detectStrings(message).map(str => ({
      url: `https://cdn.betterttv.net/assets/emoji/${str}.svg`,
    }))
  }

  extractEmotes (message: string, context: ChatUserstate | null, target: string) {
    const emotes = getEmotes(message, context, target)

    return [
      ...emotes.map(e => ({ url: e.img })),
      ...this.extractEmojiEmotes(message),
    ]
  }

}
