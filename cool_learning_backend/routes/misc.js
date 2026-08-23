// 舊版相容路由：學習打卡、測驗歷程（新版科目已各自有更完整的進度 API，這兩支保留供舊客戶端相容）。
const express = require('express');

module.exports = function createMiscRouter({ pool, requireAuth, requireOwnSeat }) {
  const router = express.Router();

// [API] 學習打卡
  router.post('/complete-learning', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo, completedDate, learnedWordIds } = req.body;
  try {
    await pool.query(
      `INSERT INTO learning_progress (seat_no, completed_date, learned_word_ids) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE learned_word_ids = ?`,
      [seatNo, completedDate, JSON.stringify(learnedWordIds), JSON.stringify(learnedWordIds)]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// [API] 測驗歷程
  router.post('/quiz-log', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo, mode, score } = req.body;
  try {
    await pool.query(`INSERT INTO quiz_logs (seat_no, mode, score) VALUES (?, ?, ?)`, [seatNo, mode, score]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

  return router;
};
