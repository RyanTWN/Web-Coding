const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.resolve(__dirname, '../../cool_learning/assets/js/social.js');
const source = `${fs.readFileSync(sourcePath, 'utf8')}\nglobalThis.__socialTest = { CURRICULUM, FACTS, INTEGRATION_FACTS, COMPETENCY_FACTS, TF_FACTS, buildDailyQuestions, getCalendarTotals };`;
const sandbox = {
  console,
  Headers,
  fetch: () => Promise.reject(new Error('network access is not expected')),
  Intl,
  Date,
  setTimeout: () => 0,
  setInterval: () => 0,
  clearInterval: () => 0,
  sessionStorage: {
    getItem: () => JSON.stringify({ name: '測試學生', seatNo: '60101', token: 'test-token' }),
    removeItem: () => {}
  },
  localStorage: {
    getItem: () => '0',
    setItem: () => {}
  },
  document: { addEventListener: () => {} },
  window: { location: { href: '' } }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const { CURRICULUM, FACTS, INTEGRATION_FACTS, COMPETENCY_FACTS, TF_FACTS, buildDailyQuestions, getCalendarTotals } = sandbox.__socialTest;
assert.deepStrictEqual(Object.keys(CURRICULUM), ['康軒', '南一', '翰林']);
assert.ok(Object.values(FACTS).every(facts => facts.length >= 10), '每個主題至少需要 10 個核心觀念');

// 驗證一分鐘快問快答題庫
assert.ok(TF_FACTS && TF_FACTS.length >= 30, '是非題庫至少需要 30 題以支援 60 秒快問快答');
TF_FACTS.forEach(item => {
  assert.ok(item.prompt && item.prompt.length > 5, '是非題必須有完整題幹');
  assert.strictEqual(typeof item.isTrue, 'boolean', '是非題答案必須為 boolean');
  assert.ok(item.explanation, '是非題必須提供迷思破除解析');
});

// 驗證三大版本與各章節 20 題架構 (12核心 + 6加深 + 2素養) 與同輪去重
for (const [publisher, chapters] of Object.entries(CURRICULUM)) {
  assert.ok(chapters.length >= 6, `${publisher}應包含六上與六下章節`);
  for (const [chapter] of chapters) {
    const questions = buildDailyQuestions(publisher, chapter, 1);
    const secondAttempt = buildDailyQuestions(publisher, chapter, 2);

    assert.strictEqual(questions.length, 20, `${publisher} ${chapter} 應產生 20 題`);
    assert.strictEqual(secondAttempt.length, 20, `${publisher} ${chapter} 再測一次仍應產生 20 題`);

    // 驗證題型架構配比：12 核心基礎 + 6 統整加深 + 2 素養挑戰
    const coreCount = questions.filter(q => q.kind === '核心基礎').length;
    const integCount = questions.filter(q => q.kind === '統整加深').length;
    const compCount = questions.filter(q => q.kind === '素養挑戰').length;
    assert.strictEqual(coreCount, 12, `${publisher} ${chapter} 應有 12 題核心基礎題，目前為 ${coreCount}`);
    assert.strictEqual(integCount, 6, `${publisher} ${chapter} 應有 6 題統整加深題，目前為 ${integCount}`);
    assert.strictEqual(compCount, 2, `${publisher} ${chapter} 應有 2 題素養挑戰題，目前為 ${compCount}`);

    // 驗證同輪測驗題目 100% 絕對去重 (ID 唯一且題幹文字唯一)
    assert.strictEqual(new Set(questions.map(item => item.id)).size, 20, `${publisher} ${chapter} 題目 ID 不可重複`);
    assert.strictEqual(new Set(questions.map(item => item.question)).size, 20, `${publisher} ${chapter} 同輪題目題幹不可重複`);

    // 驗證不同測驗次數
    assert.notDeepStrictEqual(secondAttempt.map(item => item.id), questions.map(item => item.id), '不同測驗次數應重新排列題組');

    questions.forEach(question => {
      assert.strictEqual(question.options.length, 4, '每題應有四個選項');
      assert.ok(question.options.includes(question.answer), '正確答案必須存在於選項中');
      assert.ok(question.explanation, '每題必須提供解析');
    });
  }
}

const augustTotals = getCalendarTotals([
  { date: '2026-08-11', completedAttempts: 2, totalQuestions: 40, totalScore: 170 },
  { date: '2026-08-12', completedAttempts: 1, totalQuestions: 20, totalScore: 90 },
  { date: '2026-09-01', completedAttempts: 3, totalQuestions: 60, totalScore: 240 }
], 2026, 7);
assert.strictEqual(augustTotals.completedAttempts, 3, '學習日曆應加總當月完成次數');
assert.strictEqual(augustTotals.totalQuestions, 60, '學習日曆應加總當月完成題數');
assert.strictEqual(augustTotals.totalScore, 260, '學習日曆應加總當月分數');

console.log('social logic tests passed');
