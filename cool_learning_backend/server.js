console.log("🔥 【重大宣告】：新版的 server.js 已經成功載入！目前時間是：" + new Date().toISOString());

const express = require('express');
const cors = require('cors');

const { verifyAppleIdentityToken, verifyGoogleIdToken } = require('./lib/oauthVerify');
const { verifyPubSubPushRequest, fetchAndAcknowledgeSubscription } = require('./lib/googlePlayVerify');
const { createPool, initializeDatabaseSchema } = require('./lib/db');
const { createAuthHelpers } = require('./middleware/auth');
const { getTaipeiDateKey, isDateKey } = require('./utils/dates');

const APP_VERSION = process.env.APP_VERSION || 'development';
const AUTH_SECRET = process.env.AUTH_SECRET || '';
const WORD_FIELDS = Object.freeze(['vocabulary', 'phonetic', 'chinese', 'sentence', 'translate']);

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

const pool = createPool();
const auth = createAuthHelpers(AUTH_SECRET);

const {
  issueToken, requireAuth, requireAdmin, requireOwnSeat, requireGuardianRole,
  safeEqual, hashPassword, verifyPassword,
  isValidStudentPassword, isValidGuardianPassword, isValidEmail,
  LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS,
} = auth;

// 每個路由模組都是「接受依賴、回傳 express.Router()」的 factory function，
// 掛載時一律加上 /api 前綴（模組內部路徑不含 /api，維持跟 /api 無關的可攜性）。
app.use('/api', require('./routes/health')({ pool, APP_VERSION }));

app.use('/api', require('./routes/studentAuth')({
  pool, issueToken, hashPassword, verifyPassword, isValidStudentPassword,
  LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS,
}));

app.use('/api', require('./routes/admin')({
  pool, requireAuth, requireAdmin, issueToken, safeEqual, hashPassword, WORD_FIELDS,
}));

app.use('/api', require('./routes/guardian')({
  pool, requireAuth, requireGuardianRole, issueToken, hashPassword, verifyPassword,
  isValidGuardianPassword, isValidEmail, LOGIN_MAX_ATTEMPTS, LOGIN_LOCK_MS,
  verifyAppleIdentityToken, verifyGoogleIdToken, fetchAndAcknowledgeSubscription,
}));

app.use('/api', require('./routes/webhooks')({
  pool, verifyPubSubPushRequest, fetchAndAcknowledgeSubscription,
}));

app.use('/api', require('./routes/english')({
  pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey,
}));

app.use('/api', require('./routes/math')({
  pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey,
}));

app.use('/api', require('./routes/nature')({
  pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey,
}));

app.use('/api', require('./routes/social')({
  pool, requireAuth, requireOwnSeat, getTaipeiDateKey, isDateKey,
}));

app.use('/api', require('./routes/misc')({ pool, requireAuth, requireOwnSeat }));

initializeDatabaseSchema(pool, AUTH_SECRET)
  .then(() => app.listen(4060, () => console.log('酷學習 API 服務已在 Port 4060 啟動')))
  .catch(err => {
    console.error('資料庫結構初始化失敗:', err);
    process.exit(1);
  });
