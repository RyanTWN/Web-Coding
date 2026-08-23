// 認證/授權共用邏輯：token 簽發與驗證、各種 requireXxx middleware、密碼雜湊與格式驗證。
// 用 factory function 包起來，讓 AUTH_SECRET 從外部注入，而不是散落各處的模組層級變數。
const crypto = require('crypto');

function createAuthHelpers(AUTH_SECRET) {
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

// 家長帳號密碼：至少 8 碼、需同時包含英文字母與數字（比學生 PIN 稍嚴格，因為綁定金流身份）。
function isValidGuardianPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 錯誤 5 次鎖定 15 分鐘

// 密碼雜湊採用 Node 內建 crypto.scrypt（不需額外依賴），儲存格式為 "salt:hash"（皆為 hex 字串）。
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash.includes(':')) return false;
  const [salt, hashHex] = storedHash.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(String(password || ''), salt, 64);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// 至少 6 碼、需同時包含英文字母與數字；小學生仍可記憶，但比純數字座號難以亂猜。
function isValidStudentPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function requireGuardianRole(req, res, next) {
  if (req.auth?.role !== 'guardian') return res.status(403).json({ success: false, error: '需要家長帳號登入' });
  next();
}

  return {
    issueToken,
    readToken,
    requireAuth,
    requireAdmin,
    requireOwnSeat,
    requireGuardianRole,
    safeEqual,
    isValidGuardianPassword,
    isValidEmail,
    hashPassword,
    verifyPassword,
    isValidStudentPassword,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_LOCK_MS,
  };
}

module.exports = { createAuthHelpers };
