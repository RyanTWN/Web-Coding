console.log("🔥 【重大宣告】：新版的 server.js 已經成功載入！目前時間是：" + new Date().toISOString());


const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const API_BASE_URL = "https://learning.ifit.myds.me:4061/api/login";
const APP_VERSION = process.env.APP_VERSION || 'development';
const AUTH_SECRET = process.env.AUTH_SECRET || '';
const WORD_FIELDS = Object.freeze(['vocabulary', 'phonetic', 'chinese', 'sentence', 'translate']);

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
    CREATE TABLE IF NOT EXISTS english_word_cycle_state (
      seat_no VARCHAR(32) NOT NULL,
      difficulty TINYINT NOT NULL,
      cycle_no INT NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (seat_no, difficulty)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS english_daily_assignments (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      position_no TINYINT UNSIGNED NOT NULL,
      word_id BIGINT NOT NULL,
      difficulty TINYINT NOT NULL,
      cycle_no INT NOT NULL,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      PRIMARY KEY (seat_no, learning_date, position_no),
      UNIQUE KEY uq_english_daily_word (seat_no, learning_date, word_id),
      KEY ix_english_cycle_words (seat_no, difficulty, cycle_no, word_id),
      KEY ix_english_completed_words (seat_no, completed, word_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS english_daily_progress (
      seat_no VARCHAR(32) NOT NULL,
      learning_date DATE NOT NULL,
      current_word_index TINYINT UNSIGNED NOT NULL DEFAULT 0,
      completed TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      PRIMARY KEY (seat_no, learning_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    INSERT IGNORE INTO english_daily_progress (seat_no, learning_date, current_word_index, completed, completed_at)
    SELECT seat_no, completed_date, 29, 1, CURRENT_TIMESTAMP FROM learning_progress
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
    for (const table of ['english_daily_assignments', 'english_daily_progress', 'english_word_cycle_state', 'student_learning_state', 'student_math_state', 'math_quiz_logs', 'learning_progress', 'quiz_logs', 'login_logs']) {
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
app.get('/api/get-daily-words', requireAuth, requireOwnSeat, async (req, res) => {
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

// [API] 管理員瀏覽、搜尋、新增與啟停單字。
app.get('/api/admin/words', requireAuth, requireAdmin, async (req, res) => {
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

app.post('/api/admin/words', requireAuth, requireAdmin, async (req, res) => {
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

app.patch('/api/admin/words/:id/learning-enabled', requireAuth, requireAdmin, async (req, res) => {
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
         WHERE mql.seat_no COLLATE utf8mb4_unicode_ci = s.seat_no COLLATE utf8mb4_unicode_ci) AS math_avg_score
      FROM students s
      LEFT JOIN student_learning_state sls
        ON s.seat_no COLLATE utf8mb4_unicode_ci = sls.seat_no COLLATE utf8mb4_unicode_ci
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
