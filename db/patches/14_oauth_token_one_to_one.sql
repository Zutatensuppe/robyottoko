DELETE FROM robyottoko.oauth_token t
USING robyottoko.oauth_token newer
WHERE t.user_id = newer.user_id
  AND t.expires_at < newer.expires_at;

ALTER TABLE robyottoko.oauth_token
  ADD CONSTRAINT oauth_token_user_unique
  UNIQUE (user_id);
