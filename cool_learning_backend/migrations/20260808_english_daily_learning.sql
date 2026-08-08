CREATE TABLE IF NOT EXISTS english_word_cycle_state (
  seat_no VARCHAR(32) NOT NULL,
  difficulty TINYINT NOT NULL,
  cycle_no INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (seat_no, difficulty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS english_daily_assignments (
  seat_no VARCHAR(32) NOT NULL,
  learning_date DATE NOT NULL,
  position_no TINYINT UNSIGNED NOT NULL,
  word_id BIGINT NOT NULL,
  difficulty TINYINT NOT NULL,
  cycle_no INT NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, learning_date, position_no),
  UNIQUE KEY uq_english_daily_word (seat_no, learning_date, word_id),
  KEY ix_english_cycle_words (seat_no, difficulty, cycle_no, word_id),
  KEY ix_english_completed_words (seat_no, completed, word_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS english_daily_progress (
  seat_no VARCHAR(32) NOT NULL,
  learning_date DATE NOT NULL,
  current_word_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, learning_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO english_daily_progress
  (seat_no, learning_date, current_word_index, completed, completed_at)
SELECT seat_no, completed_date, 29, 1, CURRENT_TIMESTAMP
FROM learning_progress;
