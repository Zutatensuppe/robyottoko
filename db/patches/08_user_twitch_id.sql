ALTER TABLE robyottoko.user ADD COLUMN twitch_id TEXT NOT NULL DEFAULT '';
ALTER TABLE robyottoko.user ADD COLUMN twitch_login TEXT NOT NULL DEFAULT '';
ALTER TABLE robyottoko.user DROP COLUMN pass;
ALTER TABLE robyottoko.user DROP COLUMN salt;
ALTER TABLE robyottoko.user DROP COLUMN status;
