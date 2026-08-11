const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.resolve(__dirname, '../../cool_learning/assets/js/nature.js');
const source = `${fs.readFileSync(sourcePath, 'utf8')}\nglobalThis.__natureTest = { CURRICULUM, FACTS, buildDailyQuestions };`;
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

const { CURRICULUM, FACTS, buildDailyQuestions } = sandbox.__natureTest;
assert.deepStrictEqual(Object.keys(CURRICULUM), ['康軒', '南一', '翰林']);
assert.ok(Object.values(FACTS).every(facts => facts.length >= 10), '每個主題至少需要 10 個核心觀念');

for (const [publisher, chapters] of Object.entries(CURRICULUM)) {
  assert.ok(chapters.length >= 7, `${publisher}應包含六上與六下章節`);
  for (const [chapter] of chapters) {
    const questions = buildDailyQuestions(publisher, chapter);
    assert.strictEqual(questions.length, 20, `${publisher} ${chapter} 應產生 20 題`);
    assert.strictEqual(new Set(questions.map(item => item.id)).size, 20, '每日題目 ID 不可重複');
    questions.forEach(question => {
      assert.strictEqual(question.options.length, 4, '每題應有四個選項');
      assert.ok(question.options.includes(question.answer), '正確答案必須存在於選項中');
      assert.ok(question.explanation, '每題必須提供解析');
    });
  }
}

console.log('nature logic tests passed');
