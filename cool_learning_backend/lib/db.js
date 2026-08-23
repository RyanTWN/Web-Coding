// 資料庫連線池與 schema 初始化。
const mysql = require('mysql2/promise');

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '192.168.173.200', // ⚠️ 請改成您的 Synology NAS 局域網 IP
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD, // 改由環境變數讀取密碼
    database: process.env.DB_NAME || 'cool_learning',
    waitForConnections: true,
    connectionLimit: 10
  });
}

async function initializeDatabaseSchema(pool, AUTH_SECRET) {
  if (AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET 必須設定為至少 32 個字元');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_learning_state (
      seat_no VARCHAR(32) PRIMARY KEY,
      learning_date DATE NULL,
      current_word_index INT NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_dates LONGTEXT NOT NULL,
      learned_word_ids LONGTEXT NOT NULL,
      starred_ids LONGTEXT NOT NULL,
      starred_words LONGTEXT NOT NULL,
      starred_spelling_counts LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_math_state (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      publisher VARCHAR(32) NOT NULL,
      unit_name VARCHAR(255) NOT NULL,
      questions_json LONGTEXT NOT NULL,
      current_question_index INT NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS english_word_cycle_state (
      seat_no VARCHAR(32) NOT NULL,
      difficulty TINYINT NOT NULL,
      cycle_no INT NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (seat_no, difficulty)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS english_daily_progress (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      current_word_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      PRIMARY KEY (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    INSERT IGNORE INTO english_daily_progress (seat_no, learning_date, current_word_index, completed, completed_at)
    SELECT seat_no, completed_date, 29, 1, CURRENT_TIMESTAMP FROM learning_progress
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS math_quiz_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      publisher VARCHAR(32) NOT NULL,
      unit_name VARCHAR(255) NOT NULL,
      score INT NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_math_daily_result (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nature_daily_progress (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      attempt_no SMALLINT UNSIGNED NOT NULL DEFAULT 1,
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
      PRIMARY KEY (seat_no, learning_date, attempt_no),
      KEY ix_nature_completed (seat_no, completed, learning_date),
      KEY ix_nature_daily_attempt (seat_no, learning_date, completed, attempt_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // B2C 家長付費模式：家長帳號、子女檔案、訂閱狀態，與既有 students/seat_no 系統並存。
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guardians (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      email_verified TINYINT(1) NOT NULL DEFAULT 0,
      password_hash VARCHAR(255) NULL,
      display_name VARCHAR(100) NULL,
      apple_sub VARCHAR(255) NULL,
      google_sub VARCHAR(255) NULL,
      failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
      locked_until TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_guardians_email (email),
      UNIQUE KEY uq_guardians_apple_sub (apple_sub),
      UNIQUE KEY uq_guardians_google_sub (google_sub)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS child_profiles (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guardian_id INT UNSIGNED NOT NULL,
      nickname VARCHAR(50) NOT NULL,
      avatar_key VARCHAR(50) NULL,
      grade_level VARCHAR(20) NULL,
      linked_seat_no CHAR(5) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
      UNIQUE KEY uq_child_profiles_seat (linked_seat_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      guardian_id INT UNSIGNED NOT NULL,
      platform ENUM('apple','google') NOT NULL,
      product_id VARCHAR(100) NOT NULL,
      original_transaction_id VARCHAR(255) NULL,
      purchase_token VARCHAR(500) NULL,
      status ENUM('trial','active','grace_period','billing_retry','expired','canceled','revoked') NOT NULL DEFAULT 'trial',
      environment ENUM('sandbox','production') NOT NULL DEFAULT 'sandbox',
      expires_at TIMESTAMP NULL,
      last_notification_type VARCHAR(50) NULL,
      raw_payload JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (guardian_id) REFERENCES guardians(id) ON DELETE CASCADE,
      KEY ix_subscriptions_guardian (guardian_id, status),
      UNIQUE KEY uq_subscriptions_purchase_token (purchase_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscription_events (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      subscription_id INT UNSIGNED NULL,
      platform ENUM('apple','google') NOT NULL,
      notification_type VARCHAR(50) NULL,
      payload JSON NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [quizCreatedAtColumns] = await pool.query("SHOW COLUMNS FROM quiz_logs LIKE 'created_at'");
  if (quizCreatedAtColumns.length === 0) {
    await pool.query('ALTER TABLE quiz_logs ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
  }
  // 學生登入密碼驗證（2026-08-12）：password_hash 為 NULL 代表該學生尚未設定密碼。
  const [studentPasswordColumns] = await pool.query("SHOW COLUMNS FROM students LIKE 'password_hash'");
  if (studentPasswordColumns.length === 0) {
    await pool.query(`
      ALTER TABLE students
        ADD COLUMN password_hash VARCHAR(255) NULL AFTER name,
        ADD COLUMN failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER password_hash,
        ADD COLUMN locked_until TIMESTAMP NULL AFTER failed_login_attempts
    `);
  }
}

module.exports = { createPool, initializeDatabaseSchema };
