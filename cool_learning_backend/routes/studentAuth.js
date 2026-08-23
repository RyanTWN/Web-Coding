// 學生登入。
const express = require('express');

module.exports = function createStudentAuthRouter({
  pool, issueToken, hashPassword, verifyPassword, isValidStudentPassword,
  LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS,
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

  return router;
};
