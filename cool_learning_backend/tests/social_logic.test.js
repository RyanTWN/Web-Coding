const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.resolve(__dirname, '../../cool_learning/assets/js/social.js');
const source = `${fs.readFileSync(sourcePath, 'utf8')}\nglobalThis.__socialTest = { CURRICULUM, FACTS, buildDailyQuestions, getCalendarTotals };`;
const sandbox = {
  console,
  Headers,
  fetch: () => Promise.reject(new Error('network access is not expected')),
  Intl,
  Date,
  setTimeout: () => 0,
  sessionStorage: {
    getItem: () => JSON.stringify({ name: '測試學生', seatNo: '60101', token: 'test-token' }),
    removeItem: () => {}
  },
  document: { addEventListener: () => {} },
  window: { location: { href: '' } }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const { CURRICULUM, FACTS, buildDailyQuestions, getCalendarTotals } = sandbox.__socialTest;
assert.deepStrictEqual(Object.keys(CURRICULUM), ['康軒', '南一', '翰林'], '應支援康軒、南一、翰林三大版本');
assert.ok(Object.values(FACTS).every(facts => facts.length >= 10), '每個核心主題至少需要 10 個核心觀念');

for (const [publisher, chapters] of Object.entries(CURRICULUM)) {
  assert.ok(chapters.length >= 7, `${publisher}應包含六上與六下完整章節（至少 7 個單元）`);
  for (const [chapter] of chapters) {
    const questions = buildDailyQuestions(publisher, chapter, 1);
    const secondAttempt = buildDailyQuestions(publisher, chapter, 2);
    assert.strictEqual(questions.length, 20, `${publisher} ${chapter} 應產生 20 題`);
    assert.strictEqual(secondAttempt.length, 20, `${publisher} ${chapter} 再測一次仍應產生 20 題`);
    assert.strictEqual(new Set(questions.map(item => item.id)).size, 20, '每日題目 ID 不可重複');
    assert.notDeepStrictEqual(secondAttempt.map(item => item.id), questions.map(item => item.id), '不同測驗次數應重新排列題組');
    questions.forEach(question => {
      assert.strictEqual(question.options.length, 4, '每題應有四個選項');
      assert.ok(question.options.includes(question.answer), '正確答案必須存在於選項中');
      assert.ok(question.explanation, '每題必須提供解析');
    });
  }
}

const augustTotals = getCalendarTotals([
  { date: '2026-09-01', completedAttempts: 2, totalQuestions: 40, totalScore: 180 },
  { date: '2026-09-02', completedAttempts: 1, totalQuestions: 20, totalScore: 95 },
  { date: '2026-08-15', completedAttempts: 3, totalQuestions: 60, totalScore: 270 }
], 2026, 8); // month index 8 is September
assert.strictEqual(augustTotals.completedAttempts, 3, '學習日曆應加總當月完成次數');
assert.strictEqual(augustTotals.totalQuestions, 60, '學習日曆應加總當月完成題數');
assert.strictEqual(augustTotals.totalScore, 275, '學習日曆應加總當月分數');

const migrationPath = path.resolve(__dirname, '../migrations/20260904_social_learning.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
assert.match(migration, /CREATE TABLE IF NOT EXISTS social_daily_progress/i);
assert.match(migration, /CREATE TABLE IF NOT EXISTS social_wrong_questions/i);
assert.match(migration, /PRIMARY KEY \(seat_no, learning_date, attempt_no\)/i);
assert.doesNotMatch(migration, /DROP\s+(DATABASE|TABLE)|TRUNCATE|DELETE\s+FROM/i, 'migration 不可刪除資料或資料表');

console.log('✅ social logic tests passed (100% PASS)');
