CREATE TABLE streams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  broadcaster_user_id TEXT NOT NULL,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP DEFAULT NULL
);

CREATE TABLE chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TIMESTAMP NOT NULL,
  broadcaster_user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  message TEXT NOT NULL
);
