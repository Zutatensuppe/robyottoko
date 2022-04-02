CREATE SCHEMA robyottoko;

CREATE TABLE robyottoko.user (
  id SERIAL PRIMARY KEY,
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

CREATE TABLE robyottoko.token (
  user_id INTEGER NOT NULL,
  type TEXT,
  token TEXT
);

CREATE TABLE robyottoko.module (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  UNIQUE (user_id, key)
);

CREATE TABLE robyottoko.cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE robyottoko.twitch_channel (
  user_id INTEGER,
  channel_name TEXT,
  channel_id TEXT,
  access_token TEXT DEFAULT NULL,
  bot_status_messages INTEGER NOT NULL,
  UNIQUE (user_id, channel_name)
);

CREATE TABLE robyottoko.streams (
  id SERIAL PRIMARY KEY,
  broadcaster_user_id TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE robyottoko.chat_log (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP NOT NULL,
  broadcaster_user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL
);

CREATE TABLE robyottoko.user_group (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE robyottoko.user_x_user_group (
  user_id INTEGER NOT NULL,
  user_group_id INTEGER NOT NULL
);

CREATE TABLE robyottoko.pub (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL
);

CREATE TABLE robyottoko.variables (
  user_id INTEGER,
  name TEXT,
  value TEXT NOT NULL,
  UNIQUE (user_id, name)
);
