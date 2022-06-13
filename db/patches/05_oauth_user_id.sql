ALTER TABLE robyottoko.oauth_token
  ADD COLUMN user_id INTEGER DEFAULT 0;
ALTER TABLE robyottoko.oauth_token
  ADD COLUMN channel_id TEXT DEFAULT '';
