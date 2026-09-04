// B2C 家長帳號、子女檔案、訂閱查詢相關路由。
const crypto = require('crypto');
const express = require('express');

module.exports = function createGuardianRouter({
  pool, requireAuth, requireGuardianRole, issueToken, hashPassword, verifyPassword,
  isValidGuardianPassword, isValidEmail, LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS,
  verifyAppleIdentityToken, verifyGoogleIdToken, fetchAndAcknowledgeSubscription,
}) {
  const router = express.Router();

// ============================================================
// B2C 家長帳號（Email+密碼 / Sign in with Apple / Google 登入）
// ============================================================
// 設計原則：
// - 家長帳號才是真正對外的安全邊界與付款身份；子女檔案（child_profiles）
//   隸屬於家長帳號底下，本身不需要密碼——選擇子女檔案前必須先通過家長登入。
// - 子女檔案會綁定一組自動產生的 linked_seat_no，藉此直接沿用既有的
//   students / 學習進度 / 測驗紀錄整套系統，不必重寫每一個科目的 API。


async function generateUniqueChildSeatNo(connection) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = String(crypto.randomInt(10000, 100000)); // 5 碼，與既有座號格式一致
    const [existing] = await connection.query('SELECT 1 FROM students WHERE seat_no = ?', [candidate]);
    if (existing.length === 0) return candidate;
  }
  throw new Error('無法產生唯一座號，請稍後再試');
}

// [API] 家長註冊：Email + 密碼
  router.post('/guardian/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  const displayName = String(req.body?.displayName || '').trim().slice(0, 100) || null;
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'Email 格式不正確' });
  if (!isValidGuardianPassword(password)) {
    return res.status(400).json({ success: false, error: '密碼至少需要 8 碼，且需同時包含英文字母與數字' });
  }
  try {
    const [existing] = await pool.query('SELECT id FROM guardians WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ success: false, error: '這個 Email 已經註冊過了，請直接登入' });
    const passwordHash = hashPassword(password);
    const [result] = await pool.query(
      'INSERT INTO guardians (email, email_verified, password_hash, display_name) VALUES (?, 0, ?, ?)',
      [email, passwordHash, displayName]
    );
    const token = issueToken(result.insertId, 'guardian');
    res.json({ success: true, token, guardian: { id: result.insertId, email, displayName } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 家長登入：Email + 密碼（沿用學生登入相同的鎖定機制：錯 5 次鎖 15 分鐘）
  router.post('/guardian/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password;
  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ success: false, error: '請輸入 Email 與密碼' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM guardians WHERE email = ?', [email]);
    const guardian = rows[0];
    if (!guardian || !guardian.password_hash) {
      return res.status(401).json({ success: false, error: 'Email 或密碼不正確' });
    }
    if (guardian.locked_until && new Date(guardian.locked_until).getTime() > Date.now()) {
      const minutesLeft = Math.max(1, Math.ceil((new Date(guardian.locked_until).getTime() - Date.now()) / 60000));
      return res.status(423).json({ success: false, status: 'locked', message: `輸入錯誤次數過多，請 ${minutesLeft} 分鐘後再試` });
    }
    if (!verifyPassword(password, guardian.password_hash)) {
      const attempts = Number(guardian.failed_login_attempts || 0) + 1;
      const shouldLock = attempts >= LOGIN_MAX_ATTEMPTS;
      await pool.query(
        'UPDATE guardians SET failed_login_attempts = ?, locked_until = ? WHERE id = ?',
        [shouldLock ? 0 : attempts, shouldLock ? new Date(Date.now() + LOGIN_LOCK_MS) : null, guardian.id]
      );
      if (shouldLock) return res.status(423).json({ success: false, status: 'locked', message: '密碼輸入錯誤次數過多，帳號已鎖定 15 分鐘' });
      return res.status(401).json({ success: false, error: `密碼錯誤，還可再試 ${LOGIN_MAX_ATTEMPTS - attempts} 次` });
    }
    if (Number(guardian.failed_login_attempts) > 0) {
      await pool.query('UPDATE guardians SET failed_login_attempts = 0 WHERE id = ?', [guardian.id]);
    }
    const token = issueToken(guardian.id, 'guardian');
    res.json({ success: true, token, guardian: { id: guardian.id, email: guardian.email, displayName: guardian.display_name } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 共用的 OAuth find-or-create 邏輯：用 apple_sub/google_sub 找帳號，找不到才用 email 做帳號合併，
// 都沒有的話才建立新帳號。
async function findOrCreateGuardianByOAuth({ provider, sub, email, displayName }) {
  const subColumn = provider === 'apple' ? 'apple_sub' : 'google_sub';
  const [bySub] = await pool.query(`SELECT * FROM guardians WHERE ${subColumn} = ?`, [sub]);
  if (bySub.length > 0) return bySub[0];

  if (email) {
    const [byEmail] = await pool.query('SELECT * FROM guardians WHERE email = ?', [email]);
    if (byEmail.length > 0) {
      await pool.query(`UPDATE guardians SET ${subColumn} = ? WHERE id = ?`, [sub, byEmail[0].id]);
      return { ...byEmail[0], [subColumn]: sub };
    }
  }

  const fallbackEmail = email || `${provider}_${sub}@no-email.placeholder`;
  const [result] = await pool.query(
    `INSERT INTO guardians (email, email_verified, display_name, ${subColumn}) VALUES (?, ?, ?, ?)`,
    [fallbackEmail, email ? 1 : 0, displayName || null, sub]
  );
  const [created] = await pool.query('SELECT * FROM guardians WHERE id = ?', [result.insertId]);
  return created[0];
}

// [API] Sign in with Apple：App 端用 AuthenticationServices 取得 identityToken 後送到這裡驗證
  router.post('/guardian/oauth/apple', async (req, res) => {
  const { identityToken, displayName } = req.body || {};
  if (!identityToken) return res.status(400).json({ success: false, error: '缺少 identityToken' });
  try {
    const claims = await verifyAppleIdentityToken(identityToken);
    const guardian = await findOrCreateGuardianByOAuth({
      provider: 'apple', sub: claims.sub, email: claims.email, displayName
    });
    const token = issueToken(guardian.id, 'guardian');
    res.json({ success: true, token, guardian: { id: guardian.id, email: guardian.email, displayName: guardian.display_name } });
  } catch (err) {
    res.status(401).json({ success: false, error: `Apple 登入驗證失敗：${err.message}` });
  }
});

// [API] Google 登入：App 端用 Google Sign-In SDK 取得 idToken 後送到這裡驗證
  router.post('/guardian/oauth/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ success: false, error: '缺少 idToken' });
  try {
    const claims = await verifyGoogleIdToken(idToken);
    const guardian = await findOrCreateGuardianByOAuth({
      provider: 'google', sub: claims.sub, email: claims.email, displayName: null
    });
    const token = issueToken(guardian.id, 'guardian');
    res.json({ success: true, token, guardian: { id: guardian.id, email: guardian.email, displayName: guardian.display_name } });
  } catch (err) {
    res.status(401).json({ success: false, error: `Google 登入驗證失敗：${err.message}` });
  }
});

// [API] 列出這個家長帳號底下的所有子女檔案
  router.get('/guardian/children', requireAuth, requireGuardianRole, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, nickname, avatar_key, grade_level, linked_seat_no, created_at FROM child_profiles WHERE guardian_id = ? ORDER BY created_at ASC',
      [req.auth.sub]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 新增子女檔案：只存暱稱，不強制真實姓名（降低兒童 PII 蒐集）
  router.post('/guardian/children', requireAuth, requireGuardianRole, async (req, res) => {
  const nickname = String(req.body?.nickname || '').trim().slice(0, 50);
  const gradeLevel = req.body?.gradeLevel ? String(req.body.gradeLevel).trim().slice(0, 20) : null;
  const avatarKey = req.body?.avatarKey ? String(req.body.avatarKey).trim().slice(0, 50) : null;
  const childPassword = req.body?.childPassword ? String(req.body.childPassword).trim() : null;
  if (!nickname) return res.status(400).json({ success: false, error: '請輸入子女的暱稱' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const seatNo = await generateUniqueChildSeatNo(connection);
    
    // 若家長有設定子女密碼，存入 password_hash；否則為 NULL，允許家長在儀表板一鍵免密代登
    const passwordHash = childPassword ? hashPassword(childPassword) : null;
    await connection.query('INSERT INTO students (seat_no, name, password_hash) VALUES (?, ?, ?)', [seatNo, nickname, passwordHash]);
    const [result] = await connection.query(
      'INSERT INTO child_profiles (guardian_id, nickname, avatar_key, grade_level, linked_seat_no) VALUES (?, ?, ?, ?, ?)',
      [req.auth.sub, nickname, avatarKey, gradeLevel, seatNo]
    );
    await connection.commit();
    res.json({ success: true, data: { id: result.insertId, nickname, avatarKey, gradeLevel, linkedSeatNo: seatNo, hasPassword: !!passwordHash } });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// [API] 修改子女檔案 (暱稱、年級、密碼)
  router.put('/guardian/children/:childId', requireAuth, requireGuardianRole, async (req, res) => {
  const childId = Number(req.params.childId);
  const nickname = String(req.body?.nickname || '').trim().slice(0, 50);
  const gradeLevel = req.body?.gradeLevel ? String(req.body.gradeLevel).trim().slice(0, 20) : null;
  const childPassword = req.body?.childPassword ? String(req.body.childPassword).trim() : null;
  if (!Number.isInteger(childId)) return res.status(400).json({ success: false, error: '無效的子女檔案 ID' });
  if (!nickname) return res.status(400).json({ success: false, error: '暱稱不能為空' });

  try {
    const [rows] = await pool.query(
      'SELECT linked_seat_no FROM child_profiles WHERE id = ? AND guardian_id = ?',
      [childId, req.auth.sub]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: '找不到該子女檔案' });
    const seatNo = rows[0].linked_seat_no;

    await pool.query(
      'UPDATE child_profiles SET nickname = ?, grade_level = ? WHERE id = ?',
      [nickname, gradeLevel, childId]
    );

    if (seatNo) {
      if (childPassword) {
        const passwordHash = hashPassword(childPassword);
        await pool.query('UPDATE students SET name = ?, password_hash = ? WHERE seat_no = ?', [nickname, passwordHash, seatNo]);
      } else {
        await pool.query('UPDATE students SET name = ? WHERE seat_no = ?', [nickname, seatNo]);
      }
    }
    res.json({ success: true, message: '子女資訊已更新' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 刪除子女檔案（連同其學習資料一併清除）
  router.delete('/guardian/children/:childId', requireAuth, requireGuardianRole, async (req, res) => {
  const childId = Number(req.params.childId);
  if (!Number.isInteger(childId)) return res.status(400).json({ success: false, error: '無效的子女檔案 ID' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT linked_seat_no FROM child_profiles WHERE id = ? AND guardian_id = ? FOR UPDATE',
      [childId, req.auth.sub]
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: '找不到這個子女檔案，或不屬於目前登入的帳號' });
    }
    const seatNo = rows[0].linked_seat_no;
    if (seatNo) {
      for (const table of ['english_daily_assignments', 'english_daily_progress', 'english_word_cycle_state', 'student_learning_state', 'student_math_state', 'math_quiz_logs', 'math_wrong_questions', 'nature_daily_progress', 'nature_wrong_questions', 'social_daily_progress', 'social_wrong_questions', 'learning_progress', 'quiz_logs', 'login_logs']) {
        await connection.query(`DELETE FROM ${table} WHERE seat_no = ?`, [seatNo]);
      }
      await connection.query('DELETE FROM students WHERE seat_no = ?', [seatNo]);
    }
    await connection.query('DELETE FROM child_profiles WHERE id = ?', [childId]);
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) connection.release();
  }
});

// [API] 選擇子女檔案開始使用：家長已通過身份驗證，這裡直接核發學生角色的 token
// （沿用既有 requireOwnSeat 保護的所有科目/進度 API，不需要子女額外輸入密碼）。
  router.post('/guardian/children/:childId/select', requireAuth, requireGuardianRole, async (req, res) => {
  const childId = Number(req.params.childId);
  if (!Number.isInteger(childId)) return res.status(400).json({ success: false, error: '無效的子女檔案 ID' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM child_profiles WHERE id = ? AND guardian_id = ?',
      [childId, req.auth.sub]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: '找不到這個子女檔案，或不屬於目前登入的帳號' });
    const child = rows[0];
    if (!child.linked_seat_no) return res.status(500).json({ success: false, error: '子女檔案缺少對應的學習帳號，請聯絡客服' });
    const token = issueToken(child.linked_seat_no, 'student');
    res.json({ success: true, token, data: { seatNo: child.linked_seat_no, nickname: child.nickname } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 獲取子女學習總覽與成長記錄
  router.get('/guardian/children/:childId/summary', requireAuth, requireGuardianRole, async (req, res) => {
  const childId = Number(req.params.childId);
  if (!Number.isInteger(childId)) return res.status(400).json({ success: false, error: '無效的子女檔案 ID' });
  try {
    const [children] = await pool.query(
      'SELECT id, nickname, grade_level, linked_seat_no FROM child_profiles WHERE id = ? AND guardian_id = ?',
      [childId, req.auth.sub]
    );
    if (children.length === 0) return res.status(404).json({ success: false, error: '找不到該子女檔案' });
    const child = children[0];
    const seatNo = child.linked_seat_no;

    // 1. 英文學習統計
    const [engProgress] = await pool.query('SELECT COUNT(*) AS days_count FROM english_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
    const [engQuizzes] = await pool.query('SELECT COUNT(*) AS total_quizzes, AVG(score) AS avg_score FROM quiz_logs WHERE seat_no = ?', [seatNo]);
    
    // 2. 數學學習統計
    const [mathLogs] = await pool.query('SELECT COUNT(*) AS total_quizzes, AVG(score) AS avg_score FROM math_quiz_logs WHERE seat_no = ?', [seatNo]);
    const [mathWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM math_wrong_questions WHERE seat_no = ?', [seatNo]);

    // 3. 自然學習統計
    const [natureProgress] = await pool.query('SELECT COUNT(*) AS days_count, AVG(score) AS avg_score FROM nature_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
    const [natureWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM nature_wrong_questions WHERE seat_no = ?', [seatNo]);

    // 4. 社會學習統計
    const [socialProgress] = await pool.query('SELECT COUNT(*) AS days_count, AVG(score) AS avg_score FROM social_daily_progress WHERE seat_no = ? AND completed = 1', [seatNo]);
    const [socialWrong] = await pool.query('SELECT COUNT(*) AS wrong_count, SUM(CASE WHEN mastered = 1 THEN 1 ELSE 0 END) AS mastered_count FROM social_wrong_questions WHERE seat_no = ?', [seatNo]);

    res.json({
      success: true,
      data: {
        childId: child.id,
        nickname: child.nickname,
        gradeLevel: child.grade_level,
        seatNo: child.linked_seat_no,
        stats: {
          english: {
            daysCompleted: Number(engProgress[0]?.days_count || 0),
            totalQuizzes: Number(engQuizzes[0]?.total_quizzes || 0),
            avgScore: Math.round(Number(engQuizzes[0]?.avg_score || 0))
          },
          math: {
            totalQuizzes: Number(mathLogs[0]?.total_quizzes || 0),
            avgScore: Math.round(Number(mathLogs[0]?.avg_score || 0)),
            wrongCount: Number(mathWrong[0]?.wrong_count || 0),
            masteredCount: Number(mathWrong[0]?.mastered_count || 0)
          },
          nature: {
            daysCompleted: Number(natureProgress[0]?.days_count || 0),
            avgScore: Math.round(Number(natureProgress[0]?.avg_score || 0)),
            wrongCount: Number(natureWrong[0]?.wrong_count || 0),
            masteredCount: Number(natureWrong[0]?.mastered_count || 0)
          },
          social: {
            daysCompleted: Number(socialProgress[0]?.days_count || 0),
            avgScore: Math.round(Number(socialProgress[0]?.avg_score || 0)),
            wrongCount: Number(socialWrong[0]?.wrong_count || 0),
            masteredCount: Number(socialWrong[0]?.mastered_count || 0)
          }
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] 查詢目前家長帳號的訂閱/試用狀態。
// 尚未接上真實 Apple/Google 憑證前，找不到任何 subscriptions 紀錄時一律視為「尚未開始訂閱」，
// 前端應導向訂閱畫面，而不是預設放行——避免還沒接上金流驗證前被誤判為已付費。
  router.get('/guardian/subscription', requireAuth, requireGuardianRole, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT platform, product_id, status, environment, expires_at, updated_at FROM subscriptions WHERE guardian_id = ? ORDER BY updated_at DESC LIMIT 1',
      [req.auth.sub]
    );
    if (rows.length === 0) return res.json({ success: true, status: 'none', data: null });
    const sub = rows[0];
    const isEntitled = ['trial', 'active', 'grace_period', 'billing_retry'].includes(sub.status)
      && (!sub.expires_at || new Date(sub.expires_at).getTime() > Date.now());
    res.json({ success: true, status: sub.status, isEntitled, data: sub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [API] App 內購完成後，前端呼叫這支，讓後端向 Google Play Developer API 驗證這筆 purchaseToken
// 是不是真的、狀態是什麼，並把它跟目前登入的家長帳號建立關聯（之後 RTDN webhook 才找得到人）。
// 前端不應該只憑 IAP SDK 回呼就放行付費內容——一律以這支 API 查回來的狀態為準。
  router.post('/guardian/subscription/verify-purchase', requireAuth, requireGuardianRole, async (req, res) => {
  const purchaseToken = String(req.body?.purchaseToken || '').trim();
  const productId = String(req.body?.productId || '').trim();
  if (!purchaseToken || !productId) {
    return res.status(400).json({ success: false, error: '缺少 purchaseToken 或 productId' });
  }
  try {
    const { status, expiresAt, environment, raw } = await fetchAndAcknowledgeSubscription({ purchaseToken, productId });
    await pool.query(
      `INSERT INTO subscriptions (guardian_id, platform, product_id, purchase_token, status, environment, expires_at, raw_payload)
       VALUES (?, 'google', ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status), expires_at = VALUES(expires_at),
         raw_payload = VALUES(raw_payload), updated_at = CURRENT_TIMESTAMP`,
      [req.auth.sub, productId, purchaseToken, status, environment, expiresAt, JSON.stringify(raw)]
    );
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// [DEV ONLY] 在還沒有真實 Apple/Google 開發者帳號、無法測試真實 IAP 前，
// 讓開發端可以手動賦予/調整某個家長帳號的訂閱狀態，方便先開發、測試 App 其餘流程。
// 正式上線前必須移除，或至少加上更嚴格的存取限制。
  if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/subscriptions/grant', requireAuth, requireGuardianRole, async (req, res) => {
    const status = String(req.body?.status || 'trial');
    const validStatuses = ['trial', 'active', 'grace_period', 'billing_retry', 'expired', 'canceled', 'revoked'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: '無效的訂閱狀態' });
    const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await pool.query(
        `INSERT INTO subscriptions (guardian_id, platform, product_id, status, environment, expires_at)
         VALUES (?, 'apple', 'dev.manual.grant', ?, 'sandbox', ?)`,
        [req.auth.sub, status, expiresAt]
      );
      res.json({ success: true, message: '已手動核發（僅限開發環境）' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

  return router;
};
