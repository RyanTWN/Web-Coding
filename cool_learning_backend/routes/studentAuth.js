// 學生登入。
const express = require('express');

module.exports = function createStudentAuthRouter({
  pool, issueToken, hashPassword, verifyPassword, isValidStudentPassword,
  LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS, requireAuth,
}) {
  const router = express.Router();

// [API] 學生登入
  router.post('/login', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const seatNo = String(req.body?.seatNo || '').trim();
  const password = req.body?.password;
  const newPassword = req.body?.newPassword;
  const ip = req.ip || req.connection.remoteAddress;
  if (!name || !/^\d{5}$/.test(seatNo)) {
    return res.status(400).json({ success: false, error: '姓名不可空白，座號必須是 5 碼數字' });
  }
  try {
    // 學生帳號必須先由管理員建立，姓名與座號都相符才簽發工作階段。
    const [rows] = await pool.query(`SELECT * FROM students WHERE seat_no = ?`, [seatNo]);
    const student = rows[0];
    if (!student || String(student.name).trim() !== name) {
      return res.status(401).json({ success: false, error: '姓名或座號不正確' });
    }

    // 帳號因多次密碼錯誤被鎖定中。
    if (student.locked_until && new Date(student.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(student.locked_until).getTime() - Date.now()) / 60000));
      return res.status(423).json({ success: false, status: 'locked', message: `密碼輸入錯誤次數過多，請 ${minutesLeft} 分鐘後再試` });
    }

    if (!student.password_hash) {
      // 尚未設定密碼：第一次登入時由學生自行設定。
      if (!newPassword) {
        return res.json({ success: false, status: 'needs_password_setup', message: '第一次登入，請先設定密碼' });
      }
      if (!isValidStudentPassword(newPassword)) {
        return res.status(400).json({ success: false, status: 'needs_password_setup', error: '密碼至少需要 6 碼，且需同時包含英文字母與數字' });
      }
      student.password_hash = hashPassword(newPassword);
      await pool.query(
        `UPDATE students SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL WHERE seat_no = ?`,
        [student.password_hash, seatNo]
      );
    } else {
      // 已設定密碼：需要正確密碼才能登入。
      if (!password) {
        return res.json({ success: false, status: 'needs_password', message: '請輸入密碼' });
      }
      if (!verifyPassword(password, student.password_hash)) {
        const attempts = Number(student.failed_login_attempts || 0) + 1;
        const shouldLock = attempts >= LOGIN_MAX_ATTEMPTS;
        await pool.query(
          `UPDATE students SET failed_login_attempts = ?, locked_until = ? WHERE seat_no = ?`,
          [shouldLock ? 0 : attempts, shouldLock ? new Date(Date.now() + LOGIN_LOCK_MS) : null, seatNo]
        );
        if (shouldLock) {
          return res.status(423).json({ success: false, status: 'locked', message: '密碼輸入錯誤次數過多，帳號已鎖定 15 分鐘' });
        }
        return res.status(401).json({
          success: false,
          status: 'needs_password',
          message: `密碼錯誤，還可再試 ${LOGIN_MAX_ATTEMPTS - attempts} 次`
        });
      }
      if (Number(student.failed_login_attempts) > 0) {
        await pool.query(`UPDATE students SET failed_login_attempts = 0 WHERE seat_no = ?`, [seatNo]);
      }
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
    const { password_hash, failed_login_attempts, locked_until, ...publicStudent } = student;
    res.json({ 
        success: true, 
        status: 'active',
        is_premium: isPremium ? 1 : 0,
        days_remaining: isPremium ? '無限' : Math.max(0, 7 - diffInDays),
        message: "登入成功",
        data: publicStudent,
        token
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

  // [API] 學生自身學習追蹤、學習成長與生理成長記錄（孩子自我設定頁用）
  if (requireAuth) {
    router.get('/student/summary', requireAuth, async (req, res) => {
      const seatNo = req.auth.sub;
      try {
        const [students] = await pool.query('SELECT name, seat_no FROM students WHERE seat_no = ?', [seatNo]);
        const student = students[0] || { name: '同學', seat_no: seatNo };

        // 查詢是否有綁定的子女檔案（取得性別、生日）
        const [children] = await pool.query(
          'SELECT id, nickname, gender, birthday, grade_level FROM child_profiles WHERE linked_seat_no = ? LIMIT 1',
          [seatNo]
        );
        const child = children[0] || null;

        // 1. 英文學習統計
        const [engProgress] = await pool.query(
          `SELECT COUNT(DISTINCT d) AS days_count FROM (
             SELECT learning_date AS d FROM english_daily_progress WHERE seat_no = ? AND completed = 1
             UNION
             SELECT completed_date AS d FROM learning_progress WHERE seat_no = ?
           ) AS dates`,
          [seatNo, seatNo]
        );
        const [engQuizzes] = await pool.query('SELECT COUNT(*) AS total_quizzes, AVG(score) AS avg_score FROM quiz_logs WHERE seat_no = ?', [seatNo]);
        const [learningStateRows] = await pool.query(
          'SELECT learned_word_ids, starred_ids FROM student_learning_state WHERE seat_no = ?',
          [seatNo]
        );
        let learnedWordsCount = 0;
        let starredWordsCount = 0;
        if (learningStateRows.length > 0) {
          try {
            const lWords = typeof learningStateRows[0].learned_word_ids === 'string'
              ? JSON.parse(learningStateRows[0].learned_word_ids || '[]')
              : (learningStateRows[0].learned_word_ids || []);
            learnedWordsCount = Array.isArray(lWords) ? lWords.length : 0;
          } catch (_) { learnedWordsCount = 0; }

          try {
            const sWords = typeof learningStateRows[0].starred_ids === 'string'
              ? JSON.parse(learningStateRows[0].starred_ids || '[]')
              : (learningStateRows[0].starred_ids || []);
            starredWordsCount = Array.isArray(sWords) ? sWords.length : 0;
          } catch (_) { starredWordsCount = 0; }
        }

        // 2. 數學學習統計
        const [mathLogs] = await pool.query('SELECT COUNT(*) AS total_quizzes, AVG(score) AS avg_score FROM math_quiz_logs WHERE seat_no = ?', [seatNo]);
        const [mathWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM math_wrong_questions WHERE seat_no = ?', [seatNo]);

        // 3. 自然學習統計
        const [natureProgress] = await pool.query('SELECT COUNT(*) AS days_count, AVG(score) AS avg_score FROM nature_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
        const [natureWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM nature_wrong_questions WHERE seat_no = ?', [seatNo]);

        // 4. 社會學習統計
        const [socialProgress] = await pool.query('SELECT COUNT(*) AS days_count, AVG(score) AS avg_score FROM social_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
        const [socialWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM social_wrong_questions WHERE seat_no = ?', [seatNo]);

        // 5. 國語學習統計
        const [chineseProgress] = await pool.query('SELECT COUNT(*) AS days_count, AVG(score) AS avg_score FROM chinese_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
        const [chineseWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM chinese_wrong_questions WHERE seat_no = ?', [seatNo]);
        const [idiomStars] = await pool.query('SELECT COUNT(*) AS star_count FROM student_idiom_stars WHERE seat_no = ?', [seatNo]);

        // 6. 生理成長記錄
        let growthRecords = [];
        if (child && child.id) {
          const [gRows] = await pool.query(
            'SELECT id, record_date, height_cm, weight_kg, bmi, note FROM child_growth_records WHERE child_id = ? ORDER BY record_date ASC, id ASC',
            [child.id]
          );
          growthRecords = gRows;
        }

        res.json({
          success: true,
          data: {
            student: {
              name: student.name,
              seatNo: student.seat_no,
              gradeLevel: child?.grade_level || '國小六年級'
            },
            child: child ? {
              id: child.id,
              nickname: child.nickname,
              gender: child.gender || 'boy',
              birthday: child.birthday
            } : null,
            summary: {
              english: {
                completedDays: Number(engProgress[0]?.days_count || 0),
                quizCount: Number(engQuizzes[0]?.total_quizzes || 0),
                avgScore: Math.round(Number(engQuizzes[0]?.avg_score || 0)),
                learnedWords: learnedWordsCount,
                starredCount: starredWordsCount,
                totalWords: 2000
              },
              math: {
                quizCount: Number(mathLogs[0]?.total_quizzes || 0),
                avgScore: Math.round(Number(mathLogs[0]?.avg_score || 0)),
                totalWrong: Number(mathWrong[0]?.wrong_count || 0),
                masteredWrong: Number(mathWrong[0]?.mastered_count || 0)
              },
              nature: {
                completedDays: Number(natureProgress[0]?.days_count || 0),
                avgScore: Math.round(Number(natureProgress[0]?.avg_score || 0)),
                totalWrong: Number(natureWrong[0]?.wrong_count || 0),
                masteredWrong: Number(natureWrong[0]?.mastered_count || 0)
              },
              social: {
                completedDays: Number(socialProgress[0]?.days_count || 0),
                avgScore: Math.round(Number(socialProgress[0]?.avg_score || 0)),
                totalWrong: Number(socialWrong[0]?.wrong_count || 0),
                masteredWrong: Number(socialWrong[0]?.mastered_count || 0)
              },
              chinese: {
                completedDays: Number(chineseProgress[0]?.days_count || 0),
                avgScore: Math.round(Number(chineseProgress[0]?.avg_score || 0)),
                totalWrong: Number(chineseWrong[0]?.wrong_count || 0),
                masteredWrong: Number(chineseWrong[0]?.mastered_count || 0),
                idiomStars: Number(idiomStars[0]?.star_count || 0)
              }
            },
            growthRecords
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  }

  return router;
};
