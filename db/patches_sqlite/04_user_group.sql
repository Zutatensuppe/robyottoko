CREATE TABLE user_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE user_x_user_group (
  user_id INTEGER NOT NULL,
  user_group_id INTEGER NOT NULL,

  FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY(user_group_id) REFERENCES user_group(id)
);

INSERT INTO user_group (name) VALUES ('admin');
