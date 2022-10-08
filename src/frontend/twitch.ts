export const accessTokenLink = (twitchClientId: string): string => {
  // all scopes, see https://dev.twitch.tv/docs/authentication/#scopes
  const scopes = [
    "analytics:read:extensions",
    "analytics:read:games",
    "bits:read",
    "channel:edit:commercial",
    "channel:manage:broadcast",
    "channel:manage:extensions",
    "channel:manage:redemptions",
    "channel:manage:videos",
    "channel:read:editors",
    "channel:read:hype_train",
    "channel:read:redemptions",
    "channel:read:stream_key",
    "channel:read:subscriptions",
    "clips:edit",
    "moderation:read",
    "user:edit",
    "user:edit:follows",
    "user:read:blocked_users",
    "user:manage:blocked_users",
    "user:read:broadcast",
    "user:read:email",
  ];
  const loc = document.location;
  const redirectUri = `${loc.protocol}//${loc.host}/twitch/redirect_uri`;

  // https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow
  // TODO: put a CSRF token in &state
  return ("https://id.twitch.tv/oauth2/authorize" +
    "?response_type=code" +
    `&client_id=${twitchClientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scopes.join("+")}`);
}

export default {
  accessTokenLink,
}
