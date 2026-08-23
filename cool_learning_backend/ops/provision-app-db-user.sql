-- 建立最小權限的資料庫帳號，取代目前後端直接用 root 連線 MariaDB 的做法。
--
-- 使用方式：用 root（或其他有 GRANT 權限的帳號）手動執行這份腳本一次即可，
-- 例如：mysql -uroot -p < ops/provision-app-db-user.sql
-- 或透過 Synology 套件中心的 phpMyAdmin 貼上執行。
--
-- 執行前請先把下面的 'CHANGE_ME_STRONG_PASSWORD' 換成一組夠強的密碼，
-- 並同步更新 .env 的 DB_USER=cool_learning_app、DB_PASSWORD=<同一組密碼>。

CREATE USER IF NOT EXISTS 'cool_learning_app'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';

-- 只授權存取 cool_learning 這一個資料庫，不給任何全域權限（沒有 GRANT ALL、沒有 ON *.*）。
--
-- 為什麼需要 CREATE / ALTER / INDEX / REFERENCES：
--   server.js 啟動時的 initializeDatabaseSchema() 會用 CREATE TABLE IF NOT EXISTS /
--   ALTER TABLE ... ADD COLUMN 自動補齊缺少的表格與欄位（見該函式內容），
--   而且有幾張表（child_profiles、subscriptions、subscription_events）
--   帶有 FOREIGN KEY 約束，需要 REFERENCES 權限才能建立。
--
-- 為什麼「沒有」給 DROP：
--   目前整個後端程式碼完全沒有任何 DROP TABLE / DROP DATABASE / TRUNCATE 的邏輯
--   （已用 grep 逐一確認），應用程式帳號不需要這個權限。如果之後真的需要手動
--   清空或砍掉某張表，請用 root 帳號另外執行，不要開放給這個帳號長期持有。
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON cool_learning.*
  TO 'cool_learning_app'@'%';

FLUSH PRIVILEGES;

-- 選用（建議）：如果後端固定從特定 IP／網段連進來（例如 Docker 內網、NAS 內網），
-- 把上面兩個 'cool_learning_app'@'%' 都改成 'cool_learning_app'@'192.168.x.x' 或
-- 'cool_learning_app'@'172.16.0.0/255.240.0.0' 這類更精確的來源限制，
-- 比對外開放給任何主機（'%'）更安全。
