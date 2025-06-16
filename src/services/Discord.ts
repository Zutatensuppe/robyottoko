import type { DiscordConfig } from '../types'

export class Discord {
  constructor(
    private config: DiscordConfig,
  ) {
    // pass
  }

  async announce (message: string) {
    return await fetch(this.config.bot.url + '/announce', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        guildId: this.config.announce.guildId,
        channelId: this.config.announce.channelId,
        message: message,
      }),
    })
  }
}
