-- 建立國小六年級社會人文學科（Social Humanities）每日進度表與錯題掌握表

CREATE TABLE IF NOT EXISTS social_daily_progress (
  seat_no VARCHAR(32) NOT NULL,
  learning_date DATE NOT NULL,
  attempt_no SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  publisher VARCHAR(16) NOT NULL,
  chapter_name VARCHAR(255) NOT NULL,
  curriculum_version VARCHAR(32) NOT NULL DEFAULT '115-G6-SOCIAL-1',
  questions_json LONGTEXT NOT NULL,
  answers_json LONGTEXT NOT NULL,
  wrong_questions_json LONGTEXT NOT NULL,
  current_question_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, learning_date, attempt_no),
  KEY ix_social_completed (seat_no, completed, learning_date),
  KEY ix_social_daily_attempt (seat_no, learning_date, completed, attempt_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_wrong_questions (
  seat_no VARCHAR(32) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  question_json LONGTEXT NOT NULL,
  wrong_count INT UNSIGNED NOT NULL DEFAULT 1,
  mastered TINYINT(1) NOT NULL DEFAULT 0,
  last_wrong_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mastered_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, question_id),
  KEY ix_social_review (seat_no, mastered, last_wrong_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
