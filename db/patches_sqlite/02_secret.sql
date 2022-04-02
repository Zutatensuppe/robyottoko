PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- twitch channel information is moved to its own table
CREATE TABLE twitch_channel (
	user_id INTEGER,

  channel_name TEXT,

	channel_id TEXT,
  access_token TEXT DEFAULT NULL,

  UNIQUE (user_id, channel_name)
);

WITH split(id, word, str) AS (
    SELECT id, '', twitch_channels||',' FROM user
    UNION ALL
    SELECT
      id,
      substr(str, 0, instr(str, ',')),
      substr(str, instr(str, ',')+1)
    FROM split WHERE str!=''
)
INSERT INTO twitch_channel (user_id, channel_name)
SELECT id, word FROM split WHERE word!='';

-- user table gets a row for secret
CREATE TABLE user_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    pass TEXT,

    tmi_identity_username TEXT,
    tmi_identity_password TEXT,
    tmi_identity_client_id TEXT,
    tmi_identity_client_secret TEXT
);
INSERT INTO user_new SELECT
	id,
	name,
	pass,
	tmi_identity_username,
	tmi_identity_password,
	tmi_identity_client_id,
  NULL
FROM user;
DROP TABLE user;
ALTER TABLE user_new RENAME TO user;

-- recreate token table
CREATE TABLE token_new (
    user_id INTEGER NOT NULL,
    type TEXT,
    token TEXT
);
INSERT INTO token_new SELECT * FROM token;
DROP TABLE token;
ALTER TABLE token_new RENAME TO token;

-- recreate module table
CREATE TABLE module_new (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',

    UNIQUE (user_id, key)
);
INSERT INTO module_new SELECT * FROM module;
DROP TABLE module;
ALTER TABLE module_new RENAME TO module;

COMMIT;

PRAGMA foreign_keys=on;
