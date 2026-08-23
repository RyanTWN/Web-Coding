// 數學科：每日進度讀寫。
const express = require('express');

module.exports = function createMathRouter({ pool, requireAuth, requireOwnSeat }) {
  const router = express.Router();

  router.get('/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo, date } = req.query;
  if (!seatNo || !isDateKey(date)) return res.status(400).json({ success: false, error: '缺少座號或日期' });
  try {
    const [states] = await pool.query(
      `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS learning_date,
              publisher, unit_name, questions_json, current_question_index, completed, updated_at
       FROM student_math_state WHERE seat_no = ? AND learning_date = ?`,
      [seatNo, date]
    );
    const [history] = await pool.query(
      `SELECT DATE_FORMAT(learning_date, '%Y-%m-%d') AS date, publisher,
              unit_name AS unit, score, completed_at
       FROM math_quiz_logs WHERE seat_no = ? ORDER BY learning_date DESC LIMIT 100`,
      [seatNo]
    );
    const state = states[0];
    res.json({
      success: true,
      data: state ? {
        date: state.learning_date,
        publisher: state.publisher,
        unit: state.unit_name,
        questions: JSON.parse(state.questions_json),
        currentIndex: state.current_question_index,
        completed: Boolean(state.completed),
        updatedAt: state.updated_at
      } : null,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

  router.post('/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo, date, publisher, unit, questions, currentIndex = 0, completed = false, score = 0 } = req.body || {};
  if (!seatNo || !isDateKey(date) || !publisher || !unit || !Array.isArray(questions) || questions.length > 50) {
    return res.status(400).json({ success: false, error: '數學進度資料格式錯誤' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO student_math_state
        (seat_no, learning_date, publisher, unit_name, questions_json, current_question_index, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE publisher = VALUES(publisher), unit_name = VALUES(unit_name),
         questions_json = VALUES(questions_json), current_question_index = VALUES(current_question_index),
         completed = VALUES(completed)`,
      [seatNo, date, publisher, unit, JSON.stringify(questions), Math.max(0, Math.min(10, Number(currentIndex) || 0)), completed ? 1 : 0]
    );
    if (completed) {
      await connection.query(
        `INSERT INTO math_quiz_logs (seat_no, learning_date, publisher, unit_name, score)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE publisher = VALUES(publisher), unit_name = VALUES(unit_name),
           score = VALUES(score), completed_at = CURRENT_TIMESTAMP`,
        [seatNo, date, publisher, unit, Math.max(0, Math.min(100, Number(score) || 0))]
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

  return router;
};
