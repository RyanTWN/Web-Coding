// 驗證 B2C 家長帳號的輸入格式檢查，以及 OAuth 驗證模組在尚未設定 APPLE_CLIENT_ID /
// GOOGLE_CLIENT_ID 時，是否會明確報錯而不是靜默通過（避免上線後才發現忘記設定環境變數）。
const assert = require('assert');

function isValidGuardianPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 72
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

assert.strictEqual(isValidGuardianPassword('abcd1234'), true, '8 碼英數混合應通過');
assert.strictEqual(isValidGuardianPassword('abc123'), false, '未滿 8 碼應不通過（比學生密碼嚴格）');
assert.strictEqual(isValidGuardianPassword('abcdefgh'), false, '純英文應不通過');
assert.strictEqual(isValidGuardianPassword('12345678'), false, '純數字應不通過');

assert.strictEqual(isValidEmail('parent@example.com'), true, '正常 email 應通過');
assert.strictEqual(isValidEmail('not-an-email'), false, '缺少 @ 應不通過');
assert.strictEqual(isValidEmail('a@b'), false, '缺少網域後綴應不通過');

(async () => {
  delete process.env.APPLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  const { verifyAppleIdentityToken, verifyGoogleIdToken } = require('../lib/oauthVerify');

  await assert.rejects(
    () => verifyAppleIdentityToken('fake-token'),
    /APPLE_CLIENT_ID/,
    '未設定 APPLE_CLIENT_ID 時應丟出明確錯誤，而不是嘗試驗證或靜默通過'
  );
  await assert.rejects(
    () => verifyGoogleIdToken('fake-token'),
    /GOOGLE_CLIENT_ID/,
    '未設定 GOOGLE_CLIENT_ID 時應丟出明確錯誤，而不是嘗試驗證或靜默通過'
  );

  console.log('guardian auth logic tests passed');
})();
