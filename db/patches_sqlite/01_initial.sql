CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    pass TEXT,

    tmi_identity_username TEXT,
    tmi_identity_password TEXT,
    tmi_identity_client_id TEXT,

    twitch_channels TEXT
);

CREATE TABLE token (
    user_id INTEGER NOT NULL,
    type TEXT,
    token TEXT,

    FOREIGN KEY(user_id) REFERENCES user(id)
);

CREATE TABLE module (
    user_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',

    FOREIGN KEY(user_id) REFERENCES user(id),
    UNIQUE (user_id, key)
);

CREATE TABLE cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
