CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS library (
  teacher_id TEXT NOT NULL REFERENCES teachers(id),
  section TEXT NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY (teacher_id, section)
);
