-- 自然科學同日可進行多次 20 題測驗；既有紀錄保留為第 1 次。
-- 套用前請先完成包含 schema 與 data 的 MariaDB 備份。

ALTER TABLE nature_daily_progress
  ADD COLUMN attempt_no SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER learning_date,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (seat_no, learning_date, attempt_no),
  ADD KEY ix_nature_daily_attempt (seat_no, learning_date, completed, attempt_no);
