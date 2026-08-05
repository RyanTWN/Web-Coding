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

app.listen(4060, () => console.log('酷學習 API 服務已在 Port 4060 啟動'));