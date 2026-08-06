console.log("🔥 【重大宣告】：新版的 server.js 已經成功載入！目前時間是：" + new Date().toISOString());


const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const API_BASE_URL = "https://learning.ifit.myds.me:4061/api/login";

const app = express();
app.use(cors());
app.use(express.json());

// 設定 MariaDB 連線池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '192.168.173.200', // ⚠️ 請改成您的 Synology NAS 局域網 IP
  port: 3306,
  user: 'root',
  password: process.env.DB_PASSWORD, // 改由環境變數讀取密碼
  database: 'cool_learning',
  waitForConnections: true,
  connectionLimit: 10
});

async function initializeDatabaseSchema() {
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
}

// [API] 學生登入
app.post('/api/login', async (req, res) => {
  const { name, seatNo } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  try {
    // 1. 確保學生存在 (若不存在則新增，觸發資料庫寫入預設的 registration_date)
    await pool.query(`INSERT INTO students (seat_no, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?`, [seatNo, name, name]);
    await pool.query(`INSERT INTO login_logs (seat_no, ip_address) VALUES (?, ?)`, [seatNo, ip]);
    
    // 2. 取得學生完整資料 (包含試用期與付費狀態欄位)
    const [rows] = await pool.query(`SELECT * FROM students WHERE seat_no = ?`, [seatNo]);
    const student = rows[0];
    
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
    res.json({ 
        success: true, 
        status: 'active',
        is_premium: isPremium ? 1 : 0,
        days_remaining: isPremium ? '無限' : Math.max(0, 7 - diffInDays),
        message: "登入成功",
        data: student
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 取得每日 30 個單字的 API (具備完整空值防呆保護)
app.get('/api/get-daily-words', async (req, res) => {
    const studentId = req.query.studentId;
    
    if (!studentId) {
        return res.status(400).json({ error: '缺少學生 ID' });
    }

    try {
        // 1. 查詢學生的學習進度
        let [studentRows] = await pool.query('SELECT current_day_index, last_learn_date FROM students WHERE seat_no = ?', [studentId]);
        
        // 如果找不到學生，自動幫他建立一筆
        if (studentRows.length === 0) {
            await pool.query('INSERT INTO students (seat_no, name, current_day_index) VALUES (?, ?, 0)', [studentId, '未知學生']);
            [studentRows] = await pool.query('SELECT current_day_index, last_learn_date FROM students WHERE seat_no = ?', [studentId]);
        }

        let { current_day_index, last_learn_date } = studentRows[0];
        
        // 【防呆關鍵】：如果欄位是 NULL，強制給予安全預設值！
        current_day_index = current_day_index !== null && current_day_index !== undefined ? current_day_index : 0;
        
        // 取得今天的日期字串 (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];
        
        // 2. 判斷是否為新的一天 (如果 last_learn_date 是 NULL，代表從未學習過)
        if (!last_learn_date || last_learn_date !== todayStr) {
            // 如果不是今天，且之前已經有學過（不是第一次），進度才往後推一天
            if (last_learn_date !== null && last_learn_date !== undefined) {
                current_day_index++;
            }
            
            // 如果超過 40 天 (1200 單字背完一輪)，循環重置
            if (current_day_index >= 40) {
                current_day_index = 0;
            }
            
            // 更新資料庫中的進度與今天日期
            await pool.query('UPDATE students SET current_day_index = ?, last_learn_date = ? WHERE seat_no = ?', [current_day_index, todayStr, studentId]);
        }

        // 3. 從 words_pool 抽出 30 個單字
        const offset = current_day_index * 30;
        const [words] = await pool.query('SELECT * FROM words_pool LIMIT 30 OFFSET ?', [offset]);

        // 4. 回傳成功結果
        res.json({ success: true, dailyWords: words, currentDay: current_day_index + 1 });

    } catch (error) {
        console.error("抓取單字失敗:", error);
        res.status(500).json({ error: '資料庫錯誤: ' + error.message });
    }
});

// [API] 讀取學生完整學習狀態，供跨裝置與重新載入時同步。
app.get('/api/student-progress', async (req, res) => {
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

    if (rows.length === 0) return res.json({ success: true, data: null });
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
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 儲存學生完整學習狀態；完成當日學習時同步寫入 learning_progress。
app.post('/api/student-progress', async (req, res) => {
  const {
    seatNo, learningDate, currentWordIndex = 0, completed = false,
    completedDates = [], learnedWordIds = [], starredIds = [],
    starredWords = [], starredSpellingCounts = {}
  } = req.body;

  if (!seatNo || !learningDate) {
    return res.status(400).json({ success: false, error: '缺少座號或學習日期' });
  }

  const connection = await pool.getConnection();
  try {
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
        seatNo, learningDate, Number(currentWordIndex) || 0, completed ? 1 : 0,
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
    await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
});

// [API] 學習打卡
app.post('/api/complete-learning', async (req, res) => {
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
app.post('/api/quiz-log', async (req, res) => {
  const { seatNo, mode, score } = req.body;
  try {
    await pool.query(`INSERT INTO quiz_logs (seat_no, mode, score) VALUES (?, ?, ?)`, [seatNo, mode, score]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// [API] 管理員後台數據
app.get('/api/admin/analytics', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.seat_no, s.name, 
        COUNT(DISTINCT lp.completed_date) AS total_days,
        lp.learned_word_ids,
        COUNT(DISTINCT ql.id) AS total_quizzes,
        AVG(ql.score) AS avg_score,
        MAX(ll.login_time) AS last_login
      FROM students s
      LEFT JOIN learning_progress lp ON s.seat_no = lp.seat_no
      LEFT JOIN quiz_logs ql ON s.seat_no = ql.seat_no
      LEFT JOIN login_logs ll ON s.seat_no = ll.seat_no
      GROUP BY s.seat_no, s.name
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
