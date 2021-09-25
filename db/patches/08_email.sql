-- this patch adds email to user table
CREATE TABLE _tmp_user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  pass TEXT,
  salt TEXT,
  email TEXT UNIQUE,
  status TEXT,
  tmi_identity_username TEXT,
  tmi_identity_password TEXT,
  tmi_identity_client_id TEXT,
  tmi_identity_client_secret TEXT
);
INSERT INTO _tmp_user
SELECT id,
  name,
  pass,
  '',
  NULL,
  'verified',
  tmi_identity_username,
  tmi_identity_password,
  tmi_identity_client_id,
  tmi_identity_client_secret
FROM user;
CREATE TABLE _tmp_user_x_user_group (
  user_id INTEGER NOT NULL,
  user_group_id INTEGER NOT NULL
);
INSERT INTO _tmp_user_x_user_group
SELECT user_id,
  user_group_id
FROM user_x_user_group;
CREATE TABLE _tmp_variables (
  user_id INTEGER,
  name TEXT,
  value TEXT NOT NULL,
  UNIQUE (user_id, name)
);
INSERT INTO _tmp_variables
SELECT user_id,
  name,
  value
FROM variables;
DROP TABLE variables;
DROP TABLE user_x_user_group;
DROP TABLE user;
ALTER TABLE _tmp_user
  RENAME TO user;
ALTER TABLE _tmp_user_x_user_group
  RENAME TO user_x_user_group;
ALTER TABLE _tmp_variables
  RENAME TO variables;
