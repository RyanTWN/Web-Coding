// 英文科：每日單字抽取、學生學習進度讀寫。
const express = require('express');

module.exports = function createEnglishRouter({
  pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey,
}) {
  const router = express.Router();

// 依目前啟用數量（L1=761、L2=660、L3=70）配置：
// L3 固定 5 字；剩餘 25 字按 L1/L2 數量比例分配為 13/12。
const DAILY_DIFFICULTY_QUOTAS = Object.freeze({ 3: 5, 2: 12, 1: 13 });

async function getEnglishCompletionStatus(connection, seatNo) {
  const [[counts]] = await connection.query(
    `SELECT (SELECT COUNT(*) FROM words_pool
             WHERE learning_enabled = 1 AND level IN (1, 2, 3)) AS total,
            (SELECT COUNT(DISTINCT a.word_id)
             FROM english_daily_assignments a
             JOIN words_pool w ON w.id = a.word_id
             WHERE a.seat_no = ? AND a.completed = 1
               AND w.learning_enabled = 1 AND w.level IN (1, 2, 3)) AS learned`,
    [seatNo]
  );
  const total = Number(counts.total || 0);
  const learned = Number(counts.learned || 0);
  return { totalWords: total, learnedWords: learned, allWordsCompleted: total > 0 && learned >= total };
}

// 取得指定日期固定的 30 字；過去日期可建立補課，未來日期禁止預先抽字。
  router.get('/get-daily-words', requireAuth, requireOwnSeat, async (req, res) => {
  const studentId = String(req.query.studentId || '').trim();
  const learningDate = String(req.query.date || getTaipeiDateKey());
  if (!studentId || !isDateKey(learningDate)) {
    return res.status(400).json({ success: false, error: '缺少學生 ID 或日期格式錯誤' });
  }
  if (learningDate > getTaipeiDateKey()) {
    return res.status(400).json({ success: false, error: '不可預先開啟未來日期的單字' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [students] = await connection.query('SELECT seat_no FROM students WHERE seat_no = ? FOR UPDATE', [studentId]);
    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '找不到學生資料' });
    }

    let [assignments] = await connection.query(
      `SELECT a.position_no, w.* FROM english_daily_assignments a
       JOIN words_pool w ON w.id = a.word_id
       WHERE a.seat_no = ? AND a.learning_date = ? ORDER BY a.position_no`,
      [studentId, learningDate]
    );

    if (assignments.length === 0) {
      const [legacyRows] = await connection.query(
        `SELECT learned_word_ids FROM learning_progress
         WHERE seat_no = ? AND completed_date = ? FOR UPDATE`,
        [studentId, learningDate]
      );
      let legacyIds = [];
      try { legacyIds = JSON.parse(legacyRows[0]?.learned_word_ids || '[]'); } catch (_) { legacyIds = []; }
      // 舊版 learning_progress 儲存的是累積集合；最後加入的 30 個即為該日批次。
      legacyIds = [...new Set(legacyIds.map(Number).filter(Number.isFinite))].slice(-30);
      if (legacyIds.length === 30) {
        const placeholders = legacyIds.map(() => '?').join(',');
        const [legacyWords] = await connection.query(
          `SELECT id, level AS difficulty FROM words_pool WHERE id IN (${placeholders})`,
          legacyIds
        );
        const difficultyById = new Map(legacyWords.map(word => [Number(word.id), Number(word.difficulty)]));
        if (difficultyById.size === 30) {
          for (let index = 0; index < legacyIds.length; index++) {
            await connection.query(
              `INSERT INTO english_daily_assignments
               (seat_no, learning_date, position_no, word_id, difficulty, cycle_no, completed, completed_at)
               VALUES (?, ?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)`,
              [studentId, learningDate, index + 1, legacyIds[index], difficultyById.get(legacyIds[index])]
            );
          }
          await connection.query(
            `INSERT INTO english_daily_progress
             (seat_no, learning_date, current_word_index, completed, completed_at)
             VALUES (?, ?, 29, 1, CURRENT_TIMESTAMP)
             ON DUPLICATE KEY UPDATE current_word_index = 29, completed = 1,
               completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)`,
            [studentId, learningDate]
          );
          [assignments] = await connection.query(
            `SELECT a.position_no, w.* FROM english_daily_assignments a
             JOIN words_pool w ON w.id = a.word_id
             WHERE a.seat_no = ? AND a.learning_date = ? ORDER BY a.position_no`,
            [studentId, learningDate]
          );
        }
      }
    }

    if (assignments.length === 0) {
      const [difficultyCounts] = await connection.query(
        `SELECT level AS difficulty, COUNT(*) AS total FROM words_pool
         WHERE learning_enabled = 1 AND level IN (1, 2, 3) GROUP BY level`
      );
      const countMap = new Map(difficultyCounts.map(row => [Number(row.difficulty), Number(row.total)]));
      const [[allWordCount]] = await connection.query('SELECT COUNT(*) AS total FROM words_pool WHERE learning_enabled = 1');
      const supportedWordCount = [...countMap.values()].reduce((sum, count) => sum + count, 0);
      if (supportedWordCount !== Number(allWordCount.total)) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: 'words_pool.level 只能使用 1、2、3' });
      }
      for (const [difficultyText, quota] of Object.entries(DAILY_DIFFICULTY_QUOTAS)) {
        const difficulty = Number(difficultyText);
        if ((countMap.get(difficulty) || 0) < quota) {
          await connection.rollback();
          return res.status(409).json({
            success: false,
            error: `難度 ${difficulty} 的單字至少需要 ${quota} 個，目前只有 ${countMap.get(difficulty) || 0} 個`
          });
        }
      }

      let position = 1;
      for (const [difficultyText, quota] of Object.entries(DAILY_DIFFICULTY_QUOTAS)) {
        const difficulty = Number(difficultyText);
        await connection.query(
          `INSERT INTO english_word_cycle_state (seat_no, difficulty, cycle_no)
           VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE seat_no = VALUES(seat_no)`,
          [studentId, difficulty]
        );
        const [[cycleRow]] = await connection.query(
          `SELECT cycle_no FROM english_word_cycle_state
           WHERE seat_no = ? AND difficulty = ? FOR UPDATE`,
          [studentId, difficulty]
        );
        let cycleNo = Number(cycleRow.cycle_no);
        let remaining = quota;
        const selectedToday = [];

        while (remaining > 0) {
          const exclusionSql = selectedToday.length ? ` AND w.id NOT IN (${selectedToday.map(() => '?').join(',')})` : '';
          const [available] = await connection.query(
            `SELECT w.id FROM words_pool w
             WHERE w.level = ? AND w.learning_enabled = 1${exclusionSql}
               AND NOT EXISTS (
                 SELECT 1 FROM english_daily_assignments a
                 WHERE a.seat_no = ? AND a.difficulty = ? AND a.cycle_no = ? AND a.word_id = w.id
               )
             ORDER BY RAND() LIMIT ?`,
            [difficulty, ...selectedToday, studentId, difficulty, cycleNo, remaining]
          );

          if (available.length === 0) {
            cycleNo += 1;
            await connection.query(
              'UPDATE english_word_cycle_state SET cycle_no = ? WHERE seat_no = ? AND difficulty = ?',
              [cycleNo, studentId, difficulty]
            );
            continue;
          }

          for (const row of available) {
            selectedToday.push(row.id);
            await connection.query(
              `INSERT INTO english_daily_assignments
               (seat_no, learning_date, position_no, word_id, difficulty, cycle_no)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [studentId, learningDate, position++, row.id, difficulty, cycleNo]
            );
          }
          remaining -= available.length;
        }
      }
      await connection.query(
        `INSERT INTO english_daily_progress (seat_no, learning_date)
         VALUES (?, ?) ON DUPLICATE KEY UPDATE seat_no = VALUES(seat_no)`,
        [studentId, learningDate]
      );
      [assignments] = await connection.query(
        `SELECT a.position_no, w.* FROM english_daily_assignments a
         JOIN words_pool w ON w.id = a.word_id
         WHERE a.seat_no = ? AND a.learning_date = ? ORDER BY a.position_no`,
        [studentId, learningDate]
      );
    }

    const [[progress = {}]] = await connection.query(
      `SELECT current_word_index, completed FROM english_daily_progress
       WHERE seat_no = ? AND learning_date = ?`,
      [studentId, learningDate]
    );
    const completion = await getEnglishCompletionStatus(connection, studentId);
    await connection.commit();
    res.json({
      success: true,
      learningDate,
      dailyWords: assignments,
      currentWordIndex: Number(progress.current_word_index || 0),
      completed: Boolean(progress.completed),
      ...completion
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('抓取單字失敗:', error);
    res.status(500).json({ success: false, error: '資料庫錯誤: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// [API] 讀取學生完整學習狀態，供跨裝置與重新載入時同步。
  router.get('/student-progress', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo } = req.query;
  if (!seatNo) return res.status(400).json({ success: false, error: '缺少座號' });

  try {
    const [rows] = await pool.query(
      `SELECT seat_no, DATE_FORMAT(learning_date, '%Y-%m-%d') AS learning_date,
              current_word_index, completed,
              completed_dates, learned_word_ids, starred_ids, starred_words,
              starred_spelling_counts, updated_at
       FROM student_learning_state WHERE seat_no = ?`,
      [seatNo]
    );

    const [quizRows] = await pool.query(
      `SELECT id, mode, score, created_at AS timestamp
       FROM quiz_logs WHERE seat_no = ? ORDER BY id DESC LIMIT 100`,
      [seatNo]
    );
    const [dailyRows] = await pool.query(
      `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS learning_date,
              current_word_index, completed, updated_at
       FROM english_daily_progress WHERE seat_no = ? ORDER BY learning_date`,
      [seatNo]
    );
    const completion = await getEnglishCompletionStatus(pool, seatNo);
    if (rows.length === 0) return res.json({
      success: true,
      data: {
        quizHistory: quizRows,
        dailyProgress: dailyRows.map(row => ({
          learningDate: row.learning_date,
          currentWordIndex: Number(row.current_word_index),
          completed: Boolean(row.completed),
          updatedAt: row.updated_at
        })),
        completedDates: dailyRows.filter(row => row.completed).map(row => row.learning_date),
        ...completion
      }
    });
    const row = rows[0];
    const parseJson = (value, fallback) => {
      try { return JSON.parse(value); } catch (_) { return fallback; }
    };

    res.json({
      success: true,
      data: {
        seatNo: row.seat_no,
        learningDate: row.learning_date || null,
        currentWordIndex: row.current_word_index,
        completed: Boolean(row.completed),
        completedDates: parseJson(row.completed_dates, []),
        learnedWordIds: parseJson(row.learned_word_ids, []),
        starredIds: parseJson(row.starred_ids, []),
        starredWords: parseJson(row.starred_words, []),
        starredSpellingCounts: parseJson(row.starred_spelling_counts, {}),
        updatedAt: row.updated_at,
        quizHistory: quizRows,
        dailyProgress: dailyRows.map(item => ({
          learningDate: item.learning_date,
          currentWordIndex: Number(item.current_word_index),
          completed: Boolean(item.completed),
          updatedAt: item.updated_at
        })),
        ...completion
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 儲存學生完整學習狀態；完成當日學習時同步寫入 learning_progress。
  router.post('/student-progress', requireAuth, requireOwnSeat, async (req, res) => {
  const {
    seatNo, learningDate, currentWordIndex = 0, completed = false,
    completedDates = [], learnedWordIds = [], starredIds = [],
    starredWords = [], starredSpellingCounts = {}
  } = req.body;

  if (!seatNo || !isDateKey(learningDate)) {
    return res.status(400).json({ success: false, error: '缺少座號或學習日期' });
  }

  if (![completedDates, learnedWordIds, starredIds, starredWords].every(Array.isArray)) {
    return res.status(400).json({ success: false, error: '進度資料格式錯誤' });
  }
  if (learnedWordIds.length > 5000 || starredWords.length > 2000) {
    return res.status(413).json({ success: false, error: '進度資料超過允許大小' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO student_learning_state
        (seat_no, learning_date, current_word_index, completed, completed_dates,
         learned_word_ids, starred_ids, starred_words, starred_spelling_counts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         learning_date = VALUES(learning_date),
         current_word_index = VALUES(current_word_index),
         completed = VALUES(completed),
         completed_dates = VALUES(completed_dates),
         learned_word_ids = VALUES(learned_word_ids),
         starred_ids = VALUES(starred_ids),
         starred_words = VALUES(starred_words),
         starred_spelling_counts = VALUES(starred_spelling_counts)`,
      [
        seatNo, learningDate, Math.max(0, Math.min(29, Number(currentWordIndex) || 0)), completed ? 1 : 0,
        JSON.stringify(completedDates), JSON.stringify(learnedWordIds),
        JSON.stringify(starredIds), JSON.stringify(starredWords),
        JSON.stringify(starredSpellingCounts)
      ]
    );

    const [assignedRows] = await connection.query(
      `SELECT word_id FROM english_daily_assignments
       WHERE seat_no = ? AND learning_date = ? ORDER BY position_no FOR UPDATE`,
      [seatNo, learningDate]
    );
    if (assignedRows.length !== 30) {
      await connection.rollback();
      return res.status(409).json({ success: false, error: '此日期尚未建立完整的 30 字學習內容' });
    }
    await connection.query(
      `INSERT INTO english_daily_progress
       (seat_no, learning_date, current_word_index, completed, completed_at)
       VALUES (?, ?, ?, ?, IF(?, CURRENT_TIMESTAMP, NULL))
       ON DUPLICATE KEY UPDATE
         current_word_index = GREATEST(current_word_index, VALUES(current_word_index)),
         completed = GREATEST(completed, VALUES(completed)),
         completed_at = IF(completed_at IS NULL AND VALUES(completed) = 1, CURRENT_TIMESTAMP, completed_at)`,
      [seatNo, learningDate, Math.max(0, Math.min(29, Number(currentWordIndex) || 0)), completed ? 1 : 0, completed ? 1 : 0]
    );

    if (completed) {
      await connection.query(
        `UPDATE english_daily_assignments SET completed = 1, completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
         WHERE seat_no = ? AND learning_date = ?`,
        [seatNo, learningDate]
      );
      const dailyWordIds = assignedRows.map(row => row.word_id);
      await connection.query(
        `INSERT INTO learning_progress (seat_no, completed_date, learned_word_ids)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE learned_word_ids = VALUES(learned_word_ids)`,
        [seatNo, learningDate, JSON.stringify(dailyWordIds)]
      );
    }

    await connection.commit();
    const completion = await getEnglishCompletionStatus(pool, seatNo);
    res.json({ success: true, ...completion });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

  return router;
};
