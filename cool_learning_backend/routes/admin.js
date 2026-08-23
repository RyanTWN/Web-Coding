// 管理員相關路由：登入、學生帳號管理、單字管理、後台數據。
const express = require('express');

module.exports = function createAdminRouter({
  pool, requireAuth, requireAdmin, issueToken, safeEqual, hashPassword, WORD_FIELDS,
}) {
  const router = express.Router();

  router.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ success: false, error: '管理員登入尚未設定' });
  }
  if (!safeEqual(username, process.env.ADMIN_USERNAME) || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ success: false, error: '管理員帳號或密碼錯誤' });
  }
  res.json({ success: true, token: issueToken('admin', 'admin') });
});

  router.post('/admin/students', requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const seatNo = String(req.body?.seatNo || '').trim();
  if (!name || !/^[A-Za-z0-9_-]{1,32}$/.test(seatNo)) {
    return res.status(400).json({ success: false, error: '姓名或座號格式錯誤' });
  }
  try {
    await pool.query(
      `INSERT INTO students (seat_no, name) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [seatNo, name]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 管理員重設學生密碼：清空 password_hash，學生下次登入時會被要求重新設定密碼。
// 適用情境：學生忘記密碼、懷疑座號/姓名被冒用搶先設定密碼、或帳號遭鎖定需提前解除。
  router.post('/admin/students/:seatNo/reset-password', requireAuth, requireAdmin, async (req, res) => {
  const seatNo = String(req.params.seatNo || '').trim();
  if (!/^\d{5}$/.test(seatNo)) {
    return res.status(400).json({ success: false, error: '座號必須是 5 碼數字' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE students SET password_hash = NULL, failed_login_attempts = 0, locked_until = NULL WHERE seat_no = ?`,
      [seatNo]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: '找不到學生資料' });
    }
    res.json({ success: true, message: '已重設，該學生下次登入時需重新設定密碼' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

  router.delete('/admin/students/:seatNo', requireAuth, requireAdmin, async (req, res) => {
  const seatNo = String(req.params.seatNo || '').trim();
  if (!/^\d{5}$/.test(seatNo)) {
    return res.status(400).json({ success: false, error: '座號必須是 5 碼數字' });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    for (const table of ['english_daily_assignments', 'english_daily_progress', 'english_word_cycle_state', 'student_learning_state', 'student_math_state', 'math_quiz_logs', 'nature_daily_progress', 'nature_wrong_questions', 'learning_progress', 'quiz_logs', 'login_logs']) {
      await connection.query(`DELETE FROM ${table} WHERE seat_no = ?`, [seatNo]);
    }
    await connection.query('DELETE FROM students WHERE seat_no = ?', [seatNo]);
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// [API] 管理員瀏覽、搜尋、新增與啟停單字。
  router.get('/admin/words', requireAuth, requireAdmin, async (req, res) => {
  const search = String(req.query.search || '').trim();
  const level = req.query.level === undefined || req.query.level === '' ? null : Number(req.query.level);
  const enabled = req.query.enabled === undefined || req.query.enabled === '' ? null : Number(req.query.enabled);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit, 10) || 25));
  if (level !== null && ![1, 2, 3].includes(level)) {
    return res.status(400).json({ success: false, error: 'level 只能是 1、2、3' });
  }
  if (enabled !== null && ![0, 1].includes(enabled)) {
    return res.status(400).json({ success: false, error: '啟用狀態格式錯誤' });
  }

  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(vocabulary LIKE ? OR phonetic LIKE ? OR chinese LIKE ? OR sentence LIKE ? OR translate LIKE ?)');
    const keyword = `%${search}%`;
    params.push(keyword, keyword, keyword, keyword, keyword);
  }
  if (level !== null) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (enabled !== null) {
    conditions.push('learning_enabled = ?');
    params.push(enabled);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM words_pool ${where}`, params);
    const [rows] = await pool.query(
      `SELECT id, vocabulary, phonetic, chinese, sentence, translate, level, learning_enabled
       FROM words_pool ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ success: true, data: rows, pagination: { page, limit, total: Number(countRow.total) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

  router.post('/admin/words', requireAuth, requireAdmin, async (req, res) => {
  const word = Object.fromEntries(WORD_FIELDS.map(field => [field, String(req.body?.[field] || '').trim()]));
  const level = Number(req.body?.level);
  const learningEnabled = req.body?.learningEnabled === false || Number(req.body?.learningEnabled) === 0 ? 0 : 1;
  if (WORD_FIELDS.some(field => !word[field])) {
    return res.status(400).json({ success: false, error: '單字、音標、中文、例句與例句翻譯皆為必填' });
  }
  if (![1, 2, 3].includes(level)) {
    return res.status(400).json({ success: false, error: 'level 只能是 1、2、3' });
  }
  if (word.vocabulary.length > 255 || word.phonetic.length > 255 || word.chinese.length > 255 || word.sentence.length > 2000 || word.translate.length > 2000) {
    return res.status(400).json({ success: false, error: '輸入內容過長' });
  }
  try {
    const [duplicates] = await pool.query(
      'SELECT id FROM words_pool WHERE BINARY LOWER(TRIM(vocabulary)) = BINARY LOWER(?) LIMIT 1',
      [word.vocabulary]
    );
    if (duplicates.length) {
      return res.status(409).json({ success: false, error: '這個英文單字已存在' });
    }
    const [result] = await pool.query(
      `INSERT INTO words_pool (vocabulary, phonetic, chinese, sentence, translate, level, learning_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [word.vocabulary, word.phonetic, word.chinese, word.sentence, word.translate, level, learningEnabled]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/admin/words/:id/learning-enabled', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const learningEnabled = req.body?.learningEnabled === true || Number(req.body?.learningEnabled) === 1 ? 1 :
    req.body?.learningEnabled === false || Number(req.body?.learningEnabled) === 0 ? 0 : null;
  if (!Number.isSafeInteger(id) || id < 1 || learningEnabled === null) {
    return res.status(400).json({ success: false, error: '單字 ID 或啟用狀態格式錯誤' });
  }
  try {
    const [result] = await pool.query('UPDATE words_pool SET learning_enabled = ? WHERE id = ?', [learningEnabled, id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, error: '找不到單字' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 讀取學生完整學習狀態，供跨裝置與重新載入時同步。

// [API] 管理員後台數據
  router.get('/admin/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.seat_no, s.name,
        (SELECT COUNT(*) FROM learning_progress lp
         WHERE lp.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS total_days,
        (SELECT COUNT(*) FROM quiz_logs ql
         WHERE ql.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS total_quizzes,
        (SELECT AVG(ql.score) FROM quiz_logs ql
         WHERE ql.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS avg_score,
        (SELECT MAX(ll.login_time) FROM login_logs ll
         WHERE ll.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS last_login,
        COALESCE(JSON_LENGTH(sls.starred_ids), 0) AS starred_count,
        COALESCE(JSON_LENGTH(sls.learned_word_ids), 0) AS learned_count,
        (SELECT COUNT(*) FROM math_quiz_logs mql
         WHERE mql.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS math_quizzes,
        (SELECT AVG(mql.score) FROM math_quiz_logs mql
         WHERE mql.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS math_avg_score,
        (s.password_hash IS NOT NULL) AS has_password,
        (s.locked_until IS NOT NULL AND s.locked_until > CURRENT_TIMESTAMP) AS is_locked
      FROM students s
      LEFT JOIN student_learning_state sls
        ON s.seat_no COLLATE utf8mb4_unicode_ci = sls.seat_no COLLATE utf8mb4_unicode_ci
      WHERE TRIM(COALESCE(s.seat_no, '')) <> ''
      ORDER BY s.seat_no
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

  return router;
};
