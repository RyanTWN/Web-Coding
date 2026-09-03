// 數學科：每日進度讀寫、多回合紀錄與錯題複習。
const express = require('express');

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

module.exports = function createMathRouter({
  pool,
  requireAuth,
  requireOwnSeat,
  getTaipeiDateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date()),
  isDateKey = (val) => /^\d{4}-\d{2}-\d{2}$/.test(String(val || ''))
}) {
  const router = express.Router();

  // 讀取今日進度、歷史紀錄與待複習錯題
  router.get('/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.query.seatNo || '').trim();
    const date = String(req.query.date || '');
    if (!seatNo || !isDateKey(date)) {
      return res.status(400).json({ success: false, error: '缺少座號或日期格式錯誤' });
    }

    try {
      const [states] = await pool.query(
        `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS learning_date,
                COALESCE(attempt_no, 1) AS attempt_no,
                publisher, unit_name, questions_json, wrong_questions_json,
                current_question_index, completed, updated_at
         FROM student_math_state WHERE seat_no = ? AND learning_date = ?`,
        [seatNo, date]
      );

      const [summaryRows] = await pool.query(
        `SELECT COUNT(*) AS completed_attempts,
                COALESCE(MAX(attempt_no), 0) + 1 AS next_attempt_no
         FROM math_quiz_logs WHERE seat_no = ? AND learning_date = ?`,
        [seatNo, date]
      );

      const [history] = await pool.query(
        `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS date,
                COALESCE(attempt_no, 1) AS attempt_no,
                publisher, unit_name AS unit, score, completed_at
         FROM math_quiz_logs WHERE seat_no = ? ORDER BY learning_date DESC, attempt_no DESC LIMIT 100`,
        [seatNo]
      );

      const [wrongRows] = await pool.query(
        `SELECT question_json FROM math_wrong_questions
         WHERE seat_no = ? AND mastered = 0 ORDER BY last_wrong_at DESC LIMIT 200`,
        [seatNo]
      );

      const state = states[0];
      const summary = summaryRows[0] || { completed_attempts: 0, next_attempt_no: 1 };

      res.json({
        success: true,
        data: state ? {
          date: state.learning_date,
          attemptNo: Number(state.attempt_no || 1),
          publisher: state.publisher,
          unit: state.unit_name,
          questions: parseJson(state.questions_json, []),
          wrongQuestions: parseJson(state.wrong_questions_json, []),
          currentIndex: state.current_question_index,
          completed: Boolean(state.completed),
          updatedAt: state.updated_at
        } : null,
        summary: {
          completedAttempts: Number(summary.completed_attempts || 0),
          nextAttemptNo: Number(summary.next_attempt_no || 1)
        },
        history,
        wrongQuestions: wrongRows.map(row => parseJson(row.question_json, null)).filter(Boolean)
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 保存今日進度、錯題與結算分數
  router.post('/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
    const {
      seatNo,
      date,
      attemptNo = 1,
      publisher,
      unit,
      questions,
      wrongQuestions = [],
      currentIndex = 0,
      completed = false,
      score = 0
    } = req.body || {};

    if (!seatNo || !isDateKey(date) || !publisher || !unit || !Array.isArray(questions) || questions.length > 50) {
      return res.status(400).json({ success: false, error: '數學進度資料格式錯誤' });
    }

    const safeAttemptNo = Math.max(1, Math.min(999, Number(attemptNo) || 1));
    const safeIndex = Math.max(0, Math.min(questions.length, Number(currentIndex) || 0));
    const safeScore = completed ? Math.max(0, Math.min(100, Number(score) || 0)) : 0;

    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO student_math_state
          (seat_no, learning_date, attempt_no, publisher, unit_name, questions_json, wrong_questions_json, current_question_index, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           attempt_no = VALUES(attempt_no),
           publisher = VALUES(publisher),
           unit_name = VALUES(unit_name),
           questions_json = VALUES(questions_json),
           wrong_questions_json = VALUES(wrong_questions_json),
           current_question_index = VALUES(current_question_index),
           completed = VALUES(completed)`,
        [
          seatNo,
          date,
          safeAttemptNo,
          publisher,
          unit,
          JSON.stringify(questions),
          JSON.stringify(Array.isArray(wrongQuestions) ? wrongQuestions : []),
          safeIndex,
          completed ? 1 : 0
        ]
      );

      // 同步錯題到錯題庫
      if (Array.isArray(wrongQuestions) && wrongQuestions.length > 0) {
        for (const q of wrongQuestions) {
          if (!q) continue;
          const questionId = String(q.id || `${unit}_${q.q || ''}`).slice(0, 100);
          await connection.query(
            `INSERT INTO math_wrong_questions (seat_no, question_id, question_json)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
               wrong_count = wrong_count + IF(mastered_at IS NULL, 0, 1),
               mastered = 0,
               last_wrong_at = CURRENT_TIMESTAMP,
               mastered_at = NULL`,
            [seatNo, questionId, JSON.stringify(q)]
          );
        }
      }

      // 測驗完成時，寫入 math_quiz_logs
      if (completed) {
        await connection.query(
          `INSERT INTO math_quiz_logs (seat_no, learning_date, attempt_no, publisher, unit_name, score)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             publisher = VALUES(publisher),
             unit_name = VALUES(unit_name),
             score = VALUES(score),
             completed_at = CURRENT_TIMESTAMP`,
          [seatNo, date, safeAttemptNo, publisher, unit, safeScore]
        );
      }

      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, error: err.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // 錯題複習精熟掌握 (Mastered)
  router.post('/math-master-question', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.body?.seatNo || '').trim();
    const questionId = String(req.body?.questionId || '').trim();

    if (!seatNo || !questionId) {
      return res.status(400).json({ success: false, error: '缺少座號或題目 ID' });
    }

    try {
      await pool.query(
        `UPDATE math_wrong_questions
         SET mastered = 1, mastered_at = CURRENT_TIMESTAMP
         WHERE seat_no = ? AND question_id = ?`,
        [seatNo, questionId]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
