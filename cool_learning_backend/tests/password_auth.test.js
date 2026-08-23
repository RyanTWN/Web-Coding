// 驗證學生登入密碼機制的核心邏輯：雜湊/驗證/格式檢查。
// 註：server.js 頂層會直接連線 MariaDB 並呼叫 app.listen()，無法像 nature_logic.test.js
// 一樣用 vm 沙盒安全載入整份檔案，因此這裡複製一份純函式邏輯做單元測試。
// 若之後把 server.js 拆成模組（見架構分析建議），建議改為直接 require 真正的實作。
const assert = require('assert');
const crypto = require('crypto');

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

function isValidStudentPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

const hash = hashPassword('abc123');
assert.ok(verifyPassword('abc123', hash), '正確密碼應驗證成功');
assert.ok(!verifyPassword('wrong1', hash), '錯誤密碼應驗證失敗');
assert.ok(!verifyPassword('abc123', 'not-a-valid-hash'), '格式錯誤的 hash 應回傳 false');
assert.ok(!verifyPassword('abc123', null), '空的 hash 應回傳 false，不可噴例外');

assert.strictEqual(isValidStudentPassword('abc123'), true, '英文+數字且長度足夠應通過');
assert.strictEqual(isValidStudentPassword('abcdef'), false, '純英文應不通過');
assert.strictEqual(isValidStudentPassword('123456'), false, '純數字應不通過');
assert.strictEqual(isValidStudentPassword('a1'), false, '長度不足 6 碼應不通過');
assert.strictEqual(isValidStudentPassword(''), false, '空字串應不通過');
assert.strictEqual(isValidStudentPassword(undefined), false, 'undefined 應不通過');

console.log('password auth logic tests passed');
