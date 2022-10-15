import { logger } from "./common/fn";
import TwitchHelixClient from "./services/TwitchHelixClient";
import { User } from "./services/Users";
import { Bot } from "./types";

const log = logger('oauth.ts')

const TABLE = 'robyottoko.oauth_token'

interface TokenRefreshResult {
  error: false | string
  refreshed: boolean
}

export const getMatchingAccessToken = async (
  bot: Bot,
  user: User,
): Promise<string | null> => {
  const row = await bot.getDb().get(TABLE, {
    user_id: user.id,
    channel_id: user.twitch_id,
    expires_at: { '$gt': new Date() },
  })
  return row ? row.access_token : null
}

/**
 * Tries to refresh the access token and returns the new token
 * if successful, otherwise null.
 */
export const tryRefreshAccessToken = async (
  accessToken: string,
  bot: Bot,
  user: User,
): Promise<string | null> => {
  const client = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!client) {
    return null
  }

  if (!user.twitch_id) {
    return null
  }

  // try to refresh the token, if possible
  const row = await bot.getDb().get(TABLE, {
    access_token: accessToken,
  })
  if (!row || !row.refresh_token) {
    // we have no information about that token
    // or at least no way to refresh it
    return null
  }

  const refreshResp = await client.refreshAccessToken(row.refresh_token)
  if (!refreshResp) {
    return null
  }

  // update the token in the database
  await bot.getDb().insert(TABLE, {
    user_id: user.id,
    channel_id: user.twitch_id,
    access_token: refreshResp.access_token,
    refresh_token: refreshResp.refresh_token,
    scope: refreshResp.scope.join(','),
    token_type: refreshResp.token_type,
    expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
  })

  log.info('tryRefreshAccessToken - refreshed an access token')
  return refreshResp.access_token
}

// TODO: check if anything has to be put in a try catch block
export const refreshExpiredTwitchChannelAccessToken = async (
  bot: Bot,
  user: User,
): Promise<TokenRefreshResult> => {
  const client = bot.getUserTwitchClientManager(user).getHelixClient()
  if (!client) {
    return { error: false, refreshed: false }
  }
  const accessToken = await getMatchingAccessToken(bot, user)
  if (!accessToken) {
    return { error: false, refreshed: false }
  }

  let channelId = user.twitch_id
  if (!channelId) {
    channelId = await client.getUserIdByNameCached(user.twitch_login, bot.getCache())
    if (!channelId) {
      return { error: false, refreshed: false }
    }
  }

  const resp = await client.validateOAuthToken(channelId, accessToken)

  if (resp.valid) {
    // token is valid, check next :)
    return { error: false, refreshed: false }
  }

  // try to refresh the token, if possible
  const row = await bot.getDb().get(TABLE, {
    access_token: accessToken,
  })
  if (!row || !row.refresh_token) {
    // we have no information about that token
    // or at least no way to refresh it
    return { error: 'no_refresh_token_found', refreshed: false }
  }

  const refreshResp = await client.refreshAccessToken(row.refresh_token)
  if (!refreshResp) {
    // there was something wrong when refreshing
    return { error: 'refresh_oauth_token_failed', refreshed: false }
  }

  // update the token in the database
  await bot.getDb().insert(TABLE, {
    user_id: user.id,
    channel_id: channelId,
    access_token: refreshResp.access_token,
    refresh_token: refreshResp.refresh_token,
    scope: refreshResp.scope.join(','),
    token_type: refreshResp.token_type,
    expires_at: new Date(new Date().getTime() + refreshResp.expires_in * 1000),
  })

  log.info('refreshExpiredTwitchChannelAccessToken - refreshed an access token')
  return { error: false, refreshed: true }
}

export interface HandleCodeCallbackResult {
  error: boolean
  updated: boolean
  user: User | null
}

// TODO: check if anything has to be put in a try catch block
export const handleOAuthCodeCallback = async (
  code: string,
  redirectUri: string,
  bot: Bot,
  loggedInUser: User | null,
): Promise<HandleCodeCallbackResult> => {
  const helixClient = new TwitchHelixClient(
    bot.getConfig().twitch.tmi.identity.client_id,
    bot.getConfig().twitch.tmi.identity.client_secret
  )
  const resp = await helixClient.getAccessTokenByCode(code, redirectUri)
  if (!resp) {
    return { error: true, updated: false, user: loggedInUser }
  }

  // get the user that corresponds to the token
  const userResp = await helixClient.getUser(resp.access_token)
  if (!userResp) {
    return { error: true, updated: false, user: loggedInUser }
  }

  // update currently logged in user if they dont have a twitch id set yet
  if (loggedInUser && !loggedInUser.twitch_id) {
    loggedInUser.twitch_id = userResp.id
    loggedInUser.twitch_login = userResp.login
    await bot.getUsers().save({
      id: loggedInUser.id,
      twitch_id: loggedInUser.twitch_id,
      twitch_login: loggedInUser.twitch_login,
    })
  }

  let user = await bot.getUsers().getByTwitchId(userResp.id)
  if (!user) {
    user = await bot.getUsers().getByName(userResp.login)
    if (user) {
      user.twitch_id = userResp.id
      user.twitch_login = userResp.login
      await bot.getUsers().save(user)
    }
  }

  if (!user) {
    // create user
    const userId = await bot.getUsers().createUser({
      twitch_id: userResp.id,
      twitch_login: userResp.login,
      name: userResp.login,
      email: userResp.email,
      tmi_identity_username: '',
      tmi_identity_password: '',
      tmi_identity_client_id: '',
      tmi_identity_client_secret: '',
      bot_enabled: true,
      bot_status_messages: false,
      is_streaming: false,
    })
    user = await bot.getUsers().getById(userId)
    if (!user) {
      return { error: true, updated: false, user: loggedInUser }
    }
  }

  // store the token
  await bot.getDb().insert(TABLE, {
    user_id: user.id,
    channel_id: userResp.id,
    access_token: resp.access_token,
    refresh_token: resp.refresh_token,
    scope: resp.scope.join(','),
    token_type: resp.token_type,
    expires_at: new Date(new Date().getTime() + resp.expires_in * 1000),
  })

  return { error: false, updated: true, user }
}
