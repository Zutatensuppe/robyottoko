'use strict'

// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
export enum SubscriptionType {
  ChannelFollow = 'channel.follow',
  ChannelCheer = 'channel.cheer',
  ChannelRaid = 'channel.raid',
  ChannelSubscribe = 'channel.subscribe',
  ChannelPointsCustomRewardRedemptionAdd = 'channel.channel_points_custom_reward_redemption.add',
  StreamOnline = 'stream.online',
  StreamOffline = 'stream.offline',
}

export const ALL_SUBSCRIPTIONS_TYPES = Object.values(SubscriptionType)
