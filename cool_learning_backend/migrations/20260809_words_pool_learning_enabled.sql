ALTER TABLE words_pool
  ADD COLUMN IF NOT EXISTS learning_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER level;

CREATE INDEX IF NOT EXISTS ix_words_pool_learning_level
  ON words_pool (learning_enabled, level, id);
