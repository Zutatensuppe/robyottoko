CREATE TABLE variables (
  user_id INTEGER,
  name TEXT,
  value TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id),
  UNIQUE (user_id, name)
);
