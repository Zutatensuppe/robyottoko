'use strict'

// TODO: better type hint
export type Subscription = any

// https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types
export enum SubscriptionType {
  ChannelFollow = 'channel.follow',
  ChannelCheer = 'channel.cheer',
  ChannelRaid = 'channel.raid',
  ChannelSubscribe = 'channel.subscribe',
  ChannelSubscriptionGift = 'channel.subscription.gift',
  ChannelPointsCustomRewardRedemptionAdd = 'channel.channel_points_custom_reward_redemption.add',
  StreamOnline = 'stream.online',
  StreamOffline = 'stream.offline',
}

export const ALL_SUBSCRIPTIONS_TYPES = Object.values(SubscriptionType)
