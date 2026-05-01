CREATE TABLE robyottoko.event_sub_subscription_state (
  user_id INTEGER NOT NULL,
  subscription_type TEXT NOT NULL,
  state TEXT NOT NULL,
  state_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subscription_type)
);
