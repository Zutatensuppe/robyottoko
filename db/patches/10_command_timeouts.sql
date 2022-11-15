CREATE TABLE robyottoko.command_execution (
  command_id TEXT NOT NULL,
  executed_at TIMESTAMP NOT NULL,
  trigger_user_name TEXT DEFAULT NULL -- can be null, some commands are not executed triggered by a user
);
