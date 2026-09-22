// 國語文學科：每日題組、每日彙總、錯題複習、成語星號收藏。
const express = require('express');

module.exports = function createChineseRouter({ pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey }) {
  const router = express.Router();

  const CHINESE_PUBLISHERS = new Set(['康軒', '南一', '翰林']);

  function mapChineseSummary(row = {}) {
    return {
      completedAttempts: Number(row.completed_attempts || 0),
      totalQuestions: Number(row.total_questions || 0),
      totalScore: Number(row.total_score || 0),
      nextAttemptNo: Number(row.next_attempt_no || 1)
    };
  }

  // 讀取今日未完成題組、每日彙總學習日曆與尚未精熟的錯題。
  router.get('/chinese-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.query.seatNo || '').trim();
    const learningDate = String(req.query.date || '');
    if (!seatNo || !isDateKey(learningDate) || learningDate > getTaipeiDateKey()) {
      return res.status(400).json({ success: false, error: '缺少座號或國語科練習日期錯誤' });
    }
    try {
      const [states] = await pool.query(
        `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS learning_date, attempt_no,
                publisher, chapter_name, curriculum_version, questions_json,
                answers_json, wrong_questions_json, current_question_index,
                completed, score, updated_at, completed_at
         FROM chinese_daily_progress
         WHERE seat_no = ? AND learning_date = ? AND completed = 0
         ORDER BY attempt_no DESC LIMIT 1`,
        [seatNo, learningDate]
      );
      const [summaryRows] = await pool.query(
        `SELECT COALESCE(SUM(completed = 1), 0) AS completed_attempts,
                COALESCE(SUM(IF(completed = 1, 20, 0)), 0) AS total_questions,
                COALESCE(SUM(IF(completed = 1, score, 0)), 0) AS total_score,
                COALESCE(MAX(attempt_no), 0) + 1 AS next_attempt_no
         FROM chinese_daily_progress WHERE seat_no = ? AND learning_date = ?`,
        [seatNo, learningDate]
      );
      const [history] = await pool.query(
        `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS date,
                COUNT(*) AS completed_attempts,
                COUNT(*) * 20 AS total_questions,
                SUM(score) AS total_score,
                MAX(completed_at) AS completed_at
         FROM chinese_daily_progress
         WHERE seat_no = ? AND completed = 1
         GROUP BY learning_date
         ORDER BY learning_date DESC LIMIT 366`,
        [seatNo]
      );
      const [wrongRows] = await pool.query(
        `SELECT question_json FROM chinese_wrong_questions
         WHERE seat_no = ? AND mastered = 0 ORDER BY last_wrong_at DESC LIMIT 200`,
        [seatNo]
      );
      const parseJson = (text, fallback) => {
        try { return JSON.parse(text); } catch (_) { return fallback; }
      };
      const state = states[0];
      res.json({
        success: true,
        data: state ? {
          date: state.learning_date,
          attemptNo: Number(state.attempt_no),
          publisher: state.publisher,
          chapter: state.chapter_name,
          curriculumVersion: state.curriculum_version,
          questions: parseJson(state.questions_json, []),
          answers: parseJson(state.answers_json, []),
          wrongQuestions: parseJson(state.wrong_questions_json, []),
          currentIndex: Number(state.current_question_index),
          completed: Boolean(state.completed),
          score: Number(state.score),
          updatedAt: state.updated_at
        } : null,
        todaySummary: mapChineseSummary(summaryRows[0]),
        history: history.map(item => ({
          date: item.date,
          completedAttempts: Number(item.completed_attempts),
          totalQuestions: Number(item.total_questions),
          totalScore: Number(item.total_score),
          completedAt: item.completed_at
        })),
        wrongQuestions: wrongRows.map(row => parseJson(row.question_json, null)).filter(Boolean)
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 儲存每次 20 題進度；同一天可完成多次，但未完成的同一次題組不可更換。
  router.post('/chinese-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const {
      seatNo, date, attemptNo, publisher, chapter, questions, answers = [], wrongQuestions = [],
      currentIndex = 0, completed = false, score = 0
    } = req.body || {};
    const normalizedSeatNo = String(seatNo || '').trim();
    const normalizedDate = String(date || '');
    const normalizedAttemptNo = Number(attemptNo);
    if (!normalizedSeatNo || !isDateKey(normalizedDate) || normalizedDate > getTaipeiDateKey()
        || !Number.isInteger(normalizedAttemptNo) || normalizedAttemptNo < 1 || normalizedAttemptNo > 65535
        || !CHINESE_PUBLISHERS.has(publisher) || !String(chapter || '').trim()
        || !Array.isArray(questions) || questions.length !== 20
        || !Array.isArray(answers) || answers.length > 20
        || !Array.isArray(wrongQuestions) || wrongQuestions.length > 20) {
      return res.status(400).json({ success: false, error: '國語科進度資料格式錯誤' });
    }
    const questionIds = questions.map(item => String(item?.id || ''));
    if (new Set(questionIds).size !== 20 || questionIds.some(id => !/^[a-z0-9_-]{3,100}$/.test(id))) {
      return res.status(400).json({ success: false, error: '國語科題組識別碼錯誤' });
    }
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const [existing] = await connection.query(
        `SELECT publisher, chapter_name, questions_json, completed
         FROM chinese_daily_progress
         WHERE seat_no = ? AND learning_date = ? AND attempt_no = ? FOR UPDATE`,
        [normalizedSeatNo, normalizedDate, normalizedAttemptNo]
      );
      if (existing.length && (existing[0].publisher !== publisher || existing[0].chapter_name !== chapter
          || existing[0].questions_json !== JSON.stringify(questions))) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: '本次題組已固定，不可更換出版社或章節' });
      }
      if (existing[0]?.completed && !completed) {
        await connection.rollback();
        return res.status(409).json({ success: false, error: '今日練習已完成，不可回復為未完成' });
      }
      const safeIndex = Math.max(0, Math.min(20, Number(currentIndex) || 0));
      const safeScore = completed ? Math.max(0, Math.min(100, Number(score) || 0)) : 0;
      await connection.query(
        `INSERT INTO chinese_daily_progress
          (seat_no, learning_date, attempt_no, publisher, chapter_name, questions_json, answers_json,
           wrong_questions_json, current_question_index, completed, score, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, IF(?, CURRENT_TIMESTAMP, NULL))
         ON DUPLICATE KEY UPDATE answers_json = VALUES(answers_json),
           wrong_questions_json = VALUES(wrong_questions_json),
           current_question_index = GREATEST(current_question_index, VALUES(current_question_index)),
           completed = GREATEST(completed, VALUES(completed)),
           score = IF(VALUES(completed) = 1, VALUES(score), score),
           completed_at = IF(VALUES(completed) = 1, COALESCE(completed_at, CURRENT_TIMESTAMP), completed_at)`,
        [normalizedSeatNo, normalizedDate, normalizedAttemptNo, publisher, String(chapter).trim(), JSON.stringify(questions),
          JSON.stringify(answers), JSON.stringify(wrongQuestions), safeIndex, completed ? 1 : 0,
          safeScore, completed ? 1 : 0]
      );
      for (const question of wrongQuestions) {
        if (!questionIds.includes(String(question?.id || ''))) continue;
        await connection.query(
          `INSERT INTO chinese_wrong_questions (seat_no, question_id, question_json)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE question_json = VALUES(question_json),
             wrong_count = wrong_count + IF(mastered_at IS NULL, 0, 1), mastered = 0,
             last_wrong_at = CURRENT_TIMESTAMP, mastered_at = NULL`,
          [normalizedSeatNo, question.id, JSON.stringify(question)]
        );
      }
      const [summaryRows] = await connection.query(
        `SELECT COALESCE(SUM(completed = 1), 0) AS completed_attempts,
                COALESCE(SUM(IF(completed = 1, 20, 0)), 0) AS total_questions,
                COALESCE(SUM(IF(completed = 1, score, 0)), 0) AS total_score,
                COALESCE(MAX(attempt_no), 0) + 1 AS next_attempt_no
         FROM chinese_daily_progress WHERE seat_no = ? AND learning_date = ?`,
        [normalizedSeatNo, normalizedDate]
      );
      await connection.commit();
      res.json({ success: true, attemptNo: normalizedAttemptNo, todaySummary: mapChineseSummary(summaryRows[0]) });
    } catch (err) {
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // 錯題複習掌握提交
  router.post('/chinese-review', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.body?.seatNo || '').trim();
    const rawList = Array.isArray(req.body?.questionIds)
      ? req.body.questionIds
      : req.body?.questionId
        ? [req.body.questionId]
        : [];
    const questionIds = [...new Set(rawList.map(value => String(value)).filter(value => /^[a-z0-9_-]{3,100}$/.test(value)))].slice(0, 50);
    if (!seatNo || questionIds.length === 0) {
      return res.status(400).json({ success: false, error: '缺少錯題複習資料' });
    }
    try {
      const placeholders = questionIds.map(() => '?').join(',');
      await pool.query(
        `UPDATE chinese_wrong_questions SET mastered = 1, mastered_at = CURRENT_TIMESTAMP
         WHERE seat_no = ? AND question_id IN (${placeholders})`,
        [seatNo, ...questionIds]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 獲取學生自選收藏的成語 ID 清單
  router.get('/chinese/idiom-stars', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.query.seatNo || '').trim();
    if (!seatNo) {
      return res.status(400).json({ success: false, error: '缺少學生座號' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT idiom_id FROM student_idiom_stars WHERE seat_no = ? ORDER BY idiom_id ASC',
        [seatNo]
      );
      const starredIds = rows.map(r => Number(r.idiom_id));
      res.json({ success: true, starredIds });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 切換成語星號收藏狀態（收藏 / 取消收藏）
  router.post('/chinese/idiom-stars/toggle', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.body?.seatNo || '').trim();
    const idiomId = Number(req.body?.idiomId);
    if (!seatNo || !Number.isInteger(idiomId) || idiomId < 1 || idiomId > 200) {
      return res.status(400).json({ success: false, error: '無效的座號或成語編號' });
    }
    try {
      const [existing] = await pool.query(
        'SELECT idiom_id FROM student_idiom_stars WHERE seat_no = ? AND idiom_id = ?',
        [seatNo, idiomId]
      );
      if (existing.length > 0) {
        await pool.query('DELETE FROM student_idiom_stars WHERE seat_no = ? AND idiom_id = ?', [seatNo, idiomId]);
        return res.json({ success: true, idiomId, isStarred: false });
      } else {
        await pool.query('INSERT INTO student_idiom_stars (seat_no, idiom_id) VALUES (?, ?)', [seatNo, idiomId]);
        return res.json({ success: true, idiomId, isStarred: true });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 獲取成語學習進度與每日歷史紀錄
  router.get('/chinese/idiom-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.query.seatNo || '').trim();
    if (!seatNo) {
      return res.status(400).json({ success: false, error: '缺少學生座號' });
    }
    try {
      const [rows] = await pool.query(
        'SELECT last_idiom_id, daily_history_json FROM student_idiom_progress WHERE seat_no = ?',
        [seatNo]
      );
      if (rows.length === 0) {
        return res.json({ success: true, lastIdiomId: 1, dailyHistory: [] });
      }
      let dailyHistory = [];
      try {
        dailyHistory = JSON.parse(rows[0].daily_history_json || '[]');
      } catch (e) {
        dailyHistory = [];
      }
      res.json({
        success: true,
        lastIdiomId: rows[0].last_idiom_id || 1,
        dailyHistory
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 更新成語學習進度與每日研讀成語圖卡數
  router.post('/chinese/idiom-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.body?.seatNo || '').trim();
    const lastIdiomId = Number(req.body?.lastIdiomId) || 1;
    const date = String(req.body?.date || '').trim();
    const idiomId = Number(req.body?.idiomId);

    if (!seatNo || lastIdiomId < 1 || lastIdiomId > 200) {
      return res.status(400).json({ success: false, error: '無效的學習進度資料' });
    }

    try {
      const [rows] = await pool.query(
        'SELECT last_idiom_id, daily_history_json FROM student_idiom_progress WHERE seat_no = ?',
        [seatNo]
      );

      let dailyHistory = [];
      if (rows.length > 0 && rows[0].daily_history_json) {
        try {
          dailyHistory = JSON.parse(rows[0].daily_history_json);
        } catch (e) {
          dailyHistory = [];
        }
      }

      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && idiomId >= 1 && idiomId <= 200) {
        let entry = dailyHistory.find(d => d.date === date);
        if (!entry) {
          entry = { date, viewedCount: 1, viewedIds: [idiomId] };
          dailyHistory.push(entry);
        } else {
          entry.viewedIds = entry.viewedIds || [];
          if (!entry.viewedIds.includes(idiomId)) {
            entry.viewedIds.push(idiomId);
          }
          entry.viewedCount = entry.viewedIds.length;
        }
      }

      const dailyJson = JSON.stringify(dailyHistory);
      await pool.query(
        `INSERT INTO student_idiom_progress (seat_no, last_idiom_id, daily_history_json)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE last_idiom_id = VALUES(last_idiom_id), daily_history_json = VALUES(daily_history_json), updated_at = CURRENT_TIMESTAMP`,
        [seatNo, lastIdiomId, dailyJson]
      );

      res.json({ success: true, lastIdiomId, dailyHistory });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
