console.log("🔥 【重大宣告】：新版的 server.js 已經成功載入！目前時間是：" + new Date().toISOString());


const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const API_BASE_URL = "https://learning.ifit.myds.me:4061/api/login";
const APP_VERSION = process.env.APP_VERSION || 'development';
const AUTH_SECRET = process.env.AUTH_SECRET || '';

function getTaipeiDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

const app = express();
const allowedOrigins = new Set([
  'https://learning.ifit.myds.me',
  ...(process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
]);
app.use(cors({
  origin(origin, callback) {
    const isProductionHost = /^https:\/\/learning\.ifit\.myds\.me(?::\d+)?$/.test(origin || '');
    if (!origin || isProductionHost || allowedOrigins.has('*') || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error('不允許的網站來源'));
  }
}));
app.use(express.json({ limit: '2mb' }));

// 設定 MariaDB 連線池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.173.200', // ⚠️ 請改成您的 Synology NAS 局域網 IP
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD, // 改由環境變數讀取密碼
  database: process.env.DB_NAME || 'cool_learning',
  waitForConnections: true,
  connectionLimit: 10
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', version: APP_VERSION, database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', version: APP_VERSION, database: 'unavailable' });
  }
});

async function initializeDatabaseSchema() {
  if (AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET 必須設定為至少 32 個字元');
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_learning_state (
      seat_no VARCHAR(32) PRIMARY KEY,
      learning_date DATE NULL,
      current_word_index INT NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      completed_dates LONGTEXT NOT NULL,
      learned_word_ids LONGTEXT NOT NULL,
      starred_ids LONGTEXT NOT NULL,
      starred_words LONGTEXT NOT NULL,
      starred_spelling_counts LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_math_state (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      publisher VARCHAR(32) NOT NULL,
      unit_name VARCHAR(255) NOT NULL,
      questions_json LONGTEXT NOT NULL,
      current_question_index INT NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS math_quiz_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      publisher VARCHAR(32) NOT NULL,
      unit_name VARCHAR(255) NOT NULL,
      score INT NOT NULL,
      completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_math_daily_result (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [quizCreatedAtColumns] = await pool.query("SHOW COLUMNS FROM quiz_logs LIKE 'created_at'");
  if (quizCreatedAtColumns.length === 0) {
    await pool.query('ALTER TABLE quiz_logs ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
  }
}

function encodeTokenPart(value) {
  return Buffer.from(value).toString('base64url');
}

function issueToken(subject, role) {
  const payload = encodeTokenPart(JSON.stringify({ sub: String(subject), role, exp: Date.now() + 12 * 60 * 60 * 1000 }));
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch (_) { return null; }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.exp > Date.now() ? parsed : null;
  } catch (_) { return null; }
}

function requireAuth(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const auth = readToken(token);
  if (!auth) return res.status(401).json({ success: false, error: '請重新登入' });
  req.auth = auth;
  next();
}

function requireAdmin(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ success: false, error: '需要管理員權限' });
  next();
}

function requireOwnSeat(req, res, next) {
  const seatNo = req.body?.seatNo || req.query?.seatNo || req.query?.studentId;
  if (req.auth.role !== 'admin' && String(seatNo) !== req.auth.sub) {
    return res.status(403).json({ success: false, error: '不可操作其他學生資料' });
  }
  next();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

// [API] 學生登入
app.post('/api/login', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const seatNo = String(req.body?.seatNo || '').trim();
  const ip = req.ip || req.connection.remoteAddress;
  if (!name || !/^[A-Za-z0-9_-]{1,32}$/.test(seatNo)) {
    return res.status(400).json({ success: false, error: '姓名或座號格式錯誤' });
  }
  try {
    // 學生帳號必須先由管理員建立，姓名與座號都相符才簽發工作階段。
    const [rows] = await pool.query(`SELECT * FROM students WHERE seat_no = ?`, [seatNo]);
    const student = rows[0];
    if (!student || String(student.name).trim() !== name) {
      return res.status(401).json({ success: false, error: '姓名或座號不正確' });
    }
    await pool.query(`INSERT INTO login_logs (seat_no, ip_address) VALUES (?, ?)`, [seatNo, ip]);
    
    // 3. 計算試用天數 (若舊生尚無 registration_date，則以當下時間計算，給予全新 7 天試用)
    const regDateStr = student.registration_date || new Date();
    const regDate = new Date(regDateStr);
    const now = new Date();
    const diffInDays = Math.floor((now - regDate) / (1000 * 60 * 60 * 24));
    
    // 判斷是否為付費會員 (相容資料庫 TINYINT 回傳的格式)
    const isPremium = Number(student.is_premium) === 1;
    
    // 4. 判斷是否過期：如果還沒付費，且相差天數超過 7 天
    if (!isPremium && diffInDays > 7) {
        return res.status(403).json({ 
            success: false, 
            status: 'expired',
            message: '您的 7 天免費試用期已滿！',
            daysUsed: diffInDays 
        });
    }

    // 5. 仍在試用期內或已付費：正常放行，並回傳剩餘天數與狀態給前端
    const token = issueToken(seatNo, 'student');
    res.json({ 
        success: true, 
        status: 'active',
        is_premium: isPremium ? 1 : 0,
        days_remaining: isPremium ? '無限' : Math.max(0, 7 - diffInDays),
        message: "登入成功",
        data: student,
        token
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ success: false, error: '管理員登入尚未設定' });
  }
  if (!safeEqual(username, process.env.ADMIN_USERNAME) || !safeEqual(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ success: false, error: '管理員帳號或密碼錯誤' });
  }
  res.json({ success: true, token: issueToken('admin', 'admin') });
});

app.post('/api/admin/students', requireAuth, requireAdmin, async (req, res) => {
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

app.delete('/api/admin/students/:seatNo', requireAuth, requireAdmin, async (req, res) => {
  const seatNo = String(req.params.seatNo || '').trim();
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    for (const table of ['student_learning_state', 'student_math_state', 'math_quiz_logs', 'learning_progress', 'quiz_logs', 'login_logs']) {
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

// 取得每日 30 個單字的 API (具備完整空值防呆保護)
app.get('/api/get-daily-words', requireAuth, requireOwnSeat, async (req, res) => {
    const studentId = req.query.studentId;
    
    if (!studentId) {
        return res.status(400).json({ error: '缺少學生 ID' });
    }

    try {
        // 1. 查詢學生的學習進度
        let [studentRows] = await pool.query(
          `SELECT current_day_index,
                  DATE_FORMAT(last_learn_date, '%Y-%m-%d') AS last_learn_date
           FROM students WHERE seat_no = ?`,
          [studentId]
        );
        
        // 如果找不到學生，自動幫他建立一筆
        if (studentRows.length === 0) {
            await pool.query('INSERT INTO students (seat_no, name, current_day_index) VALUES (?, ?, 0)', [studentId, '未知學生']);
            [studentRows] = await pool.query(
              `SELECT current_day_index,
                      DATE_FORMAT(last_learn_date, '%Y-%m-%d') AS last_learn_date
               FROM students WHERE seat_no = ?`,
              [studentId]
            );
        }

        let { current_day_index, last_learn_date } = studentRows[0];
        
        // 【防呆關鍵】：如果欄位是 NULL，強制給予安全預設值！
        current_day_index = Number.isFinite(Number(current_day_index)) ? Number(current_day_index) : 0;
        const storedDayIndex = current_day_index;

        const [[wordCountRow]] = await pool.query('SELECT COUNT(*) AS total FROM words_pool');
        const totalWords = Number(wordCountRow.total || 0);
        if (totalWords === 0) {
            return res.status(503).json({ success: false, error: '單字資料庫目前沒有資料' });
        }
        const totalBatches = Math.max(1, Math.ceil(totalWords / 30));
        current_day_index = ((current_day_index % totalBatches) + totalBatches) % totalBatches;
        if (current_day_index !== storedDayIndex) {
            await pool.query('UPDATE students SET current_day_index = ? WHERE seat_no = ?', [current_day_index, studentId]);
        }
        
        // 取得今天的日期字串 (YYYY-MM-DD)
        const todayStr = getTaipeiDateKey();
        
        // 2. 判斷是否為新的一天 (如果 last_learn_date 是 NULL，代表從未學習過)
        if (!last_learn_date || last_learn_date !== todayStr) {
            // 如果不是今天，且之前已經有學過（不是第一次），進度才往後推一天
            if (last_learn_date !== null && last_learn_date !== undefined) {
                current_day_index++;
            }
            
            // 依資料庫實際單字數循環，不再寫死 40 天。
            current_day_index %= totalBatches;
            
            // 更新資料庫中的進度與今天日期
            await pool.query('UPDATE students SET current_day_index = ?, last_learn_date = ? WHERE seat_no = ?', [current_day_index, todayStr, studentId]);
        }

        // 3. 從 words_pool 抽出 30 個單字
        const offset = current_day_index * 30;
        let [words] = await pool.query('SELECT * FROM words_pool ORDER BY id LIMIT 30 OFFSET ?', [offset]);

        // 防止舊資料留下超界索引；自動回到第一批並修正學生狀態。
        if (words.length === 0) {
            current_day_index = 0;
            [words] = await pool.query('SELECT * FROM words_pool ORDER BY id LIMIT 30');
            await pool.query(
              'UPDATE students SET current_day_index = ?, last_learn_date = ? WHERE seat_no = ?',
              [0, todayStr, studentId]
            );
        }

        // 4. 回傳成功結果
        res.json({ success: true, dailyWords: words, currentDay: current_day_index + 1 });

    } catch (error) {
        console.error("抓取單字失敗:", error);
        res.status(500).json({ error: '資料庫錯誤: ' + error.message });
    }
});

// [API] 讀取學生完整學習狀態，供跨裝置與重新載入時同步。
app.get('/api/student-progress', requireAuth, requireOwnSeat, async (req, res) => {
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
    if (rows.length === 0) return res.json({ success: true, data: { quizHistory: quizRows } });
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
        quizHistory: quizRows
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 儲存學生完整學習狀態；完成當日學習時同步寫入 learning_progress。
app.post('/api/student-progress', requireAuth, requireOwnSeat, async (req, res) => {
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

    if (completed) {
      await connection.query(
        `INSERT INTO learning_progress (seat_no, completed_date, learned_word_ids)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE learned_word_ids = VALUES(learned_word_ids)`,
        [seatNo, learningDate, JSON.stringify(learnedWordIds)]
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

app.get('/api/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
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

app.post('/api/math-progress', requireAuth, requireOwnSeat, async (req, res) => {
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

// [API] 學習打卡
app.post('/api/complete-learning', requireAuth, requireOwnSeat, async (req, res) => {
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
app.post('/api/quiz-log', requireAuth, requireOwnSeat, async (req, res) => {
  const { seatNo, mode, score } = req.body;
  try {
    await pool.query(`INSERT INTO quiz_logs (seat_no, mode, score) VALUES (?, ?, ?)`, [seatNo, mode, score]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// [API] 管理員後台數據
app.get('/api/admin/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.seat_no, s.name,
        (SELECT COUNT(*) FROM learning_progress lp WHERE lp.seat_no = s.seat_no) AS total_days,
        (SELECT COUNT(*) FROM quiz_logs ql WHERE ql.seat_no = s.seat_no) AS total_quizzes,
        (SELECT AVG(ql.score) FROM quiz_logs ql WHERE ql.seat_no = s.seat_no) AS avg_score,
        (SELECT MAX(ll.login_time) FROM login_logs ll WHERE ll.seat_no = s.seat_no) AS last_login,
        COALESCE(JSON_LENGTH(sls.starred_ids), 0) AS starred_count,
        COALESCE(JSON_LENGTH(sls.learned_word_ids), 0) AS learned_count,
        (SELECT COUNT(*) FROM math_quiz_logs mql WHERE mql.seat_no = s.seat_no) AS math_quizzes,
        (SELECT AVG(mql.score) FROM math_quiz_logs mql WHERE mql.seat_no = s.seat_no) AS math_avg_score
      FROM students s
      LEFT JOIN student_learning_state sls ON s.seat_no = sls.seat_no
      ORDER BY s.seat_no
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

initializeDatabaseSchema()
  .then(() => app.listen(4060, () => console.log('酷學習 API 服務已在 Port 4060 啟動')))
  .catch(err => {
    console.error('資料庫結構初始化失敗:', err);
    process.exit(1);
  });
