-- 統一資料庫 collation 為 utf8mb4_unicode_ci。
--
-- 背景：server.js 裡 /api/admin/analytics 等查詢的 JOIN 條件必須手動加上
-- `COLLATE utf8mb4_unicode_ci` 才能跑（例如 `ql.seat_no COLLATE utf8mb4_unicode_ci =
-- s.seat_no COLLATE utf8mb4_unicode_ci`），這是因為 students、quiz_logs、
-- learning_progress、login_logs 這幾張早期建立的表，建表當下沒有明確指定 collation，
-- 吃到的是資料庫/伺服器當下的預設值，跟後來新建的表（guardian、subscriptions 等，
-- 明確指定 utf8mb4_unicode_ci）不一致，混用不同 collation 的欄位做比較時
-- MySQL/MariaDB 會直接報錯（Illegal mix of collations），才需要在查詢裡逐一加註。
--
-- 這份 migration 把既有的表統一轉成 utf8mb4_unicode_ci，跟這次新增的表對齊。
-- 套用前請先完成包含 schema 與 data 的 MariaDB 備份；ALTER ... CONVERT TO 對大表
-- 需要重寫整份資料，正式環境建議在離峰時段執行。
--
-- 套用後，程式碼裡查詢中殘留的 COLLATE 提示不會造成任何問題（兩邊 collation
-- 相同時，COLLATE 子句只是無害的顯式標註），但為了不讓部署順序出錯導致查詢炸掉
-- （例如程式碼先部署、migration 還沒套用），這次先保留查詢裡的 COLLATE 提示，
-- 之後確認正式環境已經套用這份 migration 一段時間後，可以再回頭移除。

ALTER TABLE students CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE quiz_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE learning_progress CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE login_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 如果你的資料庫裡還有其他早期建立、未明確指定 collation 的表（例如 words_pool），
-- 用這個查詢先列出來，再視情況加進上面的清單：
--
-- SELECT table_name, table_collation
-- FROM information_schema.tables
-- WHERE table_schema = DATABASE() AND table_collation <> 'utf8mb4_unicode_ci';
