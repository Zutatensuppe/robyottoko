import { loadAssetsForChannel, getTwitchEmotes } from './lib/emote-parse'
import emojiDetect from '@zutatensuppe/emoji-detect'
import type { TwitchHelixClient } from './TwitchHelixClient'
import type { TwitchContext } from './twitch'

export class EmoteParser {
  async loadAssetsForChannel(rawChannel: string, channelId: string, helixClient: TwitchHelixClient) {
    const channel = this.sanitizeChannel(rawChannel)
    await loadAssetsForChannel(channel, channelId, helixClient)
  }

  private sanitizeChannel (channel: string) {
    return channel.replace('#', '').trim().toLowerCase()
  }

  private extractEmojiEmotes (message: string) {
    return emojiDetect.detectStrings(message).map((str: string) => ({
      url: `https://cdn.betterttv.net/assets/emoji/${str}.svg`,
    }))
  }

  extractEmotes (message: string, context: TwitchContext | null, rawChannel: string) {
    const channel = this.sanitizeChannel(rawChannel)
    const emotes = getTwitchEmotes(message, context, channel)

    return [
      ...emotes.map(e => ({ url: e.img })),
      ...this.extractEmojiEmotes(message),
    ]
  }
}
