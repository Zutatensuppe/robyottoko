-- Add bot columns
ALTER TABLE robyottoko.user
ADD COLUMN bot_enabled bool DEFAULT false;
ALTER TABLE robyottoko.user
ADD COLUMN bot_status_messages bool DEFAULT false;
ALTER TABLE robyottoko.user
ADD COLUMN is_streaming bool DEFAULT false;

-- Note: all users at the time of this patch have the name set to their
--       twitch accounts, so using u.name instead of u.twitch_login

-- Update the columns with data from current twitch_channel configs
UPDATE robyottoko.user u SET bot_enabled = true WHERE EXISTS (
  SELECT * FROM twitch_channel c WHERE c.user_id = u.id AND LOWER(c.channel_name) = LOWER(u.name));

UPDATE robyottoko.user u SET bot_status_messages = true WHERE EXISTS (
  SELECT * FROM twitch_channel c WHERE c.user_id = u.id AND LOWER(c.channel_name) = LOWER(u.name) AND c.bot_status_messages = 1);

-- Note: twitch_channel table will be dropped in a future patch
