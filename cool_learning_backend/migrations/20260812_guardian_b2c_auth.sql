-- B2C 家長付費模式：家長帳號（Email+密碼 / Sign in with Apple / Google 登入）、
-- 子女檔案（隸屬於家長帳號底下，不需要自己的密碼）、以及訂閱狀態/事件紀錄。
-- 這一組表與既有的 students/seat_no 系統並存，不會刪除或影響現有的班級／座號模式；
-- 若之後確定完全轉為 B2C，可再評估是否要把 students 資料遷移進 child_profiles。
-- 套用前請先完成包含 schema 與 data 的 MariaDB 備份。

CREATE TABLE IF NOT EXISTS guardians (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NULL,           -- 純 OAuth 註冊的帳號可為 NULL
  display_name VARCHAR(100) NULL,
  apple_sub VARCHAR(255) NULL,               -- Sign in with Apple 的穩定使用者 ID
  google_sub VARCHAR(255) NULL,              -- Google 登入的穩定使用者 ID
  failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guardians_email (email),
  UNIQUE KEY uq_guardians_apple_sub (apple_sub),
  UNIQUE KEY uq_guardians_google_sub (google_sub)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 子女檔案：刻意只存暱稱、不強制真實姓名，降低兒童 PII 蒐集（COPPA / Google Play Families）。
-- 存取控制交由「必須先通過家長帳號登入」把關，子女檔案本身不需要密碼。
-- linked_seat_no 會在建立子女檔案時自動產生一組唯一座號，並同步在 students 表新增對應紀錄，
-- 藉此直接沿用既有整套學習進度／測驗系統，不必重寫每一個科目的 API。
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 訂閱狀態：由 App Store Server Notifications V2 / Google Play RTDN 回寫。
-- 試用期與付費狀態改由 Apple/Google 的訂閱商品本身管理，本系統只讀 status/expires_at，
-- 不再手動計算「第幾天試用」。
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  guardian_id INT UNSIGNED NOT NULL,
  platform ENUM('apple','google') NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  original_transaction_id VARCHAR(255) NULL,   -- Apple: originalTransactionId
  purchase_token VARCHAR(500) NULL,            -- Google: purchaseToken
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 每一次收到的 webhook 事件都留存原始 payload，方便除錯與處理訂單爭議。
CREATE TABLE IF NOT EXISTS subscription_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT UNSIGNED NULL,
  platform ENUM('apple','google') NOT NULL,
  notification_type VARCHAR(50) NULL,
  payload JSON NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
