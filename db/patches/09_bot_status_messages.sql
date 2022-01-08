-- this patch adds bot_status_messages field to twitch_channel table
CREATE TABLE _twitch_channel (
  user_id INTEGER,
  channel_name TEXT,
  channel_id TEXT,
  access_token TEXT DEFAULT NULL,
  bot_status_messages INTEGER NOT NULL,
  UNIQUE (user_id, channel_name)
);
INSERT INTO _twitch_channel
SELECT user_id,
  channel_name,
  channel_id,
  access_token,
  1
FROM twitch_channel;
DROP TABLE twitch_channel;
ALTER TABLE _twitch_channel
  RENAME TO twitch_channel;
