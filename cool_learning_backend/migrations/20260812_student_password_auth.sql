-- 學生登入改為需要密碼（第二道驗證），取代原本只靠姓名+座號即可登入的機制。
-- password_hash 為 NULL 代表尚未設定密碼，學生下次登入時會被導引到「設定密碼」畫面。
-- 套用前請先完成包含 schema 與 data 的 MariaDB 備份。

ALTER TABLE students
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER name,
  ADD COLUMN failed_login_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER password_hash,
  ADD COLUMN locked_until TIMESTAMP NULL AFTER failed_login_attempts;
