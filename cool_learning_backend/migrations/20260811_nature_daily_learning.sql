-- 115 學年度國小六年級自然科學：每日題組、學習日曆與錯題複習。
-- 套用前請先完成包含 schema 與 data 的 MariaDB 備份。

CREATE TABLE IF NOT EXISTS nature_daily_progress (
  seat_no VARCHAR(32) NOT NULL,
  learning_date DATE NOT NULL,
  publisher VARCHAR(16) NOT NULL,
  chapter_name VARCHAR(255) NOT NULL,
  curriculum_version VARCHAR(32) NOT NULL DEFAULT '115-G6-NATURE-1',
  questions_json LONGTEXT NOT NULL,
  answers_json LONGTEXT NOT NULL,
  wrong_questions_json LONGTEXT NOT NULL,
  current_question_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  score TINYINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, learning_date),
  KEY ix_nature_completed (seat_no, completed, learning_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS nature_wrong_questions (
  seat_no VARCHAR(32) NOT NULL,
  question_id VARCHAR(100) NOT NULL,
  question_json LONGTEXT NOT NULL,
  wrong_count INT UNSIGNED NOT NULL DEFAULT 1,
  mastered TINYINT(1) NOT NULL DEFAULT 0,
  last_wrong_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mastered_at TIMESTAMP NULL,
  PRIMARY KEY (seat_no, question_id),
  KEY ix_nature_review (seat_no, mastered, last_wrong_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
