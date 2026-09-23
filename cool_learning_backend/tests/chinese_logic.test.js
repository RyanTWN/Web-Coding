const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. 載入成語 200 題庫
const idiomsDataPath = path.resolve(__dirname, '../../cool_learning/assets/js/data/idioms200.js');
const idiomsData = require(idiomsDataPath);
assert.strictEqual(idiomsData.length, 200, '成語 200 題庫應完整收錄 200 則成語');

// 2. 測試國語邏輯模組
const sourcePath = path.resolve(__dirname, '../../cool_learning/assets/js/chinese.js');
const source = `${fs.readFileSync(sourcePath, 'utf8')}\nglobalThis.__chineseTest = { CURRICULUM, FACTS, INTEGRATION_FACTS, COMPETENCY_FACTS, buildDailyQuestions, buildIdiomQuizQuestions, getCalendarTotals };`;
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
  window: { location: { href: '' } },
  IDIOMS_200: idiomsData
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const {
  CURRICULUM,
  FACTS,
  INTEGRATION_FACTS,
  COMPETENCY_FACTS,
  buildDailyQuestions,
  buildIdiomQuizQuestions,
  getCalendarTotals
} = sandbox.__chineseTest;

// 驗證出版社三大版本完整性
assert.deepStrictEqual(Object.keys(CURRICULUM), ['康軒', '南一', '翰林']);
assert.ok(Object.values(FACTS).every(facts => facts.length >= 10), '每個核心主題至少需要 10 個核心概念題目');

// 驗證南一版 115 學年度六上課綱校正（第十一冊目次四大單元與代表課文）
assert.strictEqual(CURRICULUM['南一'][0][0], '[六上] 1. 美好時刻');
assert.strictEqual(CURRICULUM['南一'][1][0], '[六上] 2. 工作圖像');
assert.strictEqual(CURRICULUM['南一'][2][0], '[六上] 3. 問題解決');
assert.strictEqual(CURRICULUM['南一'][3][0], '[六上] 4. 文學之窗');
assert.ok(CURRICULUM['南一'][0][2].includes('在天晴了的時候') && CURRICULUM['南一'][0][2].includes('客至'), '南一六上單元一應包含在天晴了的時候與客至');
assert.ok(CURRICULUM['南一'][1][2].includes('登月先鋒') && CURRICULUM['南一'][1][2].includes('人稱'), '南一六上單元二應包含登月先鋒與人稱');
assert.ok(CURRICULUM['南一'][2][2].includes('火燒連環船') && CURRICULUM['南一'][2][2].includes('圖像做筆記'), '南一六上單元三應包含火燒連環船與圖像做筆記');
assert.ok(CURRICULUM['南一'][3][2].includes('戲術') && CURRICULUM['南一'][3][2].includes('少年筆耕'), '南一六上單元四應包含戲術與少年筆耕');

// 驗證康軒版 115 學年度六上課綱校正（三大單元與 8 課代表課文）
assert.strictEqual(CURRICULUM['康軒'][0][0], '[六上] 1. 成長的軌跡');
assert.strictEqual(CURRICULUM['康軒'][1][0], '[六上] 2. 臺灣風情畫');
assert.strictEqual(CURRICULUM['康軒'][2][0], '[六上] 3. 人性的光輝');
assert.ok(CURRICULUM['康軒'][0][2].includes('跑道') && CURRICULUM['康軒'][0][2].includes('朱子治家格言選'), '康軒六上單元一應包含跑道與朱子治家格言選');
assert.ok(CURRICULUM['康軒'][1][2].includes('臺灣美食詩選') && CURRICULUM['康軒'][1][2].includes('珍珠奶茶'), '康軒六上單元二應包含臺灣美食詩選與珍珠奶茶');
assert.ok(CURRICULUM['康軒'][2][2].includes('大小剛好的鞋子') && CURRICULUM['康軒'][2][2].includes('狐假虎威'), '康軒六上單元三應包含大小剛好的鞋子與狐假虎威');

// 驗證翰林版 115 學年度六上課綱校正（四大單元與 12 課代表課文）
assert.strictEqual(CURRICULUM['翰林'][0][0], '[六上] 1. 自我探討');
assert.strictEqual(CURRICULUM['翰林'][1][0], '[六上] 2. 向大自然學習');
assert.strictEqual(CURRICULUM['翰林'][2][0], '[六上] 3. 美學延伸');
assert.strictEqual(CURRICULUM['翰林'][3][0], '[六上] 4. 經典文學導讀');
assert.ok(CURRICULUM['翰林'][0][2].includes('遇見自己') && CURRICULUM['翰林'][0][2].includes('孔子說的話'), '翰林六上單元一應包含遇見自己與孔子說的話');
assert.ok(CURRICULUM['翰林'][1][2].includes('向大自然學習') && CURRICULUM['翰林'][1][2].includes('善用自嘲'), '翰林六上單元二應包含向大自然學習與善用自嘲');
assert.ok(CURRICULUM['翰林'][2][2].includes('跟著公共藝術去旅行') && CURRICULUM['翰林'][2][2].includes('戲台上的她與他'), '翰林六上單元三應包含跟著公共藝術去旅行與戲台上的她與他');
assert.ok(CURRICULUM['翰林'][3][2].includes('過故人莊') && CURRICULUM['翰林'][3][2].includes('存存（存根）'), '翰林六上單元四應包含過故人莊與存存（存根）');

// 驗證統整加深與素養挑戰題庫容量充足，支援多回合隨機題型
assert.ok(INTEGRATION_FACTS.rhetoric_advanced.length >= 18, '統整加深題庫應包含至少 18 題加深題型');
assert.ok(COMPETENCY_FACTS.competency_reading.length >= 12, '素養挑戰題庫應包含至少 12 題長文與生活情境思辨題');

// 驗證南一版、康軒版、翰林版各課代表性題型在題庫中皆有對應題目涵蓋
const allCorePrompts = Object.values(FACTS).flat().map(f => f[0]).join(' ');
const allIntegPrompts = INTEGRATION_FACTS.rhetoric_advanced.map(f => f[0]).join(' ');
const allCompPrompts = COMPETENCY_FACTS.competency_reading.map(f => f[0]).join(' ');
const allPromptsText = `${allCorePrompts} ${allIntegPrompts} ${allCompPrompts}`;

const requiredNanYiKeywords = [
  '在天晴了的時候', '珍珠鳥', '客至',
  '贏得喝采的輸家', '哇！原來如此', '登月先鋒',
  '明智的抉擇', '飢渴好「火」伴', '火燒連環船',
  '戲術', '紀念照', '少年筆耕'
];
requiredNanYiKeywords.forEach(kw => {
  assert.ok(allPromptsText.includes(kw), `南一 115 學年度課文關鍵詞【${kw}】應在題庫題目中被完整涵蓋`);
});

const requiredKangHsuanKeywords = [
  '跑道', '朱子治家格言', '談遇見更好的自己',
  '臺灣美食詩選', '最好的味覺禮物', '珍珠奶茶',
  '大小剛好的鞋子', '狐假虎威'
];
requiredKangHsuanKeywords.forEach(kw => {
  assert.ok(allPromptsText.includes(kw), `康軒 115 學年度課文關鍵詞【${kw}】應在題庫題目中被完整涵蓋`);
});

const requiredHanLinKeywords = [
  '遇見自己', '為什麼大家不理我', '孔子說的話',
  '向大自然學習', '樹的聯想', '善用自嘲',
  '跟著公共藝術去旅行', '街頭藝術家', '戲台上的她與他',
  '過故人莊', '來一碗溫暖的羹湯', '存根'
];
requiredHanLinKeywords.forEach(kw => {
  assert.ok(allPromptsText.includes(kw), `翰林 115 學年度課文關鍵詞【${kw}】應在題庫題目中被完整涵蓋`);
});

// 驗證三大版本與各章節 20 題架構 (12核心 + 6加深 + 2素養) 與同輪去重
for (const [publisher, chapters] of Object.entries(CURRICULUM)) {
  assert.ok(chapters.length >= 6, `${publisher} 應包含六上與六下完整章節`);
  for (const [chapter] of chapters) {
    const questions = buildDailyQuestions(publisher, chapter, 1);
    const secondAttempt = buildDailyQuestions(publisher, chapter, 2);

    assert.strictEqual(questions.length, 20, `${publisher} ${chapter} 應產生 20 題`);
    assert.strictEqual(secondAttempt.length, 20, `${publisher} ${chapter} 第二回合仍應產生 20 題`);

    // 驗證題型配比：12 核心基礎 + 6 統整加深 + 2 素養挑戰
    const coreCount = questions.filter(q => q.kind === '核心基礎').length;
    const integCount = questions.filter(q => q.kind === '統整加深').length;
    const compCount = questions.filter(q => q.kind === '素養挑戰').length;
    assert.strictEqual(coreCount, 12, `${publisher} ${chapter} 應有 12 題核心基礎題，目前為 ${coreCount}`);
    assert.strictEqual(integCount, 6, `${publisher} ${chapter} 應有 6 題統整加深題，目前為 ${integCount}`);
    assert.strictEqual(compCount, 2, `${publisher} ${chapter} 應有 2 題素養挑戰題，目前為 ${compCount}`);

    // 驗證同輪 20 題題幹絕對不重複
    const prompts = questions.map(q => q.prompt || q.question);
    const uniquePrompts = new Set(prompts);
    assert.strictEqual(uniquePrompts.size, 20, `${publisher} ${chapter} 同輪 20 題題幹出現重複`);

    // 驗證每題皆包含 4 個選項且包含正確答案
    questions.forEach((q, idx) => {
      assert.strictEqual(q.options.length, 4, `第 ${idx + 1} 題選項數量應為 4 個`);
      assert.ok(q.options.includes(q.correct || q.answer), `第 ${idx + 1} 題選項必須包含正確解答`);
      assert.ok(q.explanation && q.explanation.length > 0, `第 ${idx + 1} 題必須具備解析`);
    });
  }
}

// 驗證成語 200 隨堂測驗產生器
const idiomQuiz10 = buildIdiomQuizQuestions(10);
assert.strictEqual(idiomQuiz10.length, 10, '成語測驗應正確產出 10 題');
idiomQuiz10.forEach((q, idx) => {
  assert.strictEqual(q.options.length, 4, `成語測驗第 ${idx + 1} 題應有 4 個選項`);
  assert.ok(q.options.includes(q.correct), `成語測驗第 ${idx + 1} 題選項應包含正確答案`);
  assert.ok(q.explanation && q.explanation.length > 0, `成語測驗第 ${idx + 1} 題應有解析`);
});

const idiomQuiz20 = buildIdiomQuizQuestions(20);
assert.strictEqual(idiomQuiz20.length, 20, '成語測驗應正確產出 20 題');

// 驗證學習日曆彙總計算
const totals = getCalendarTotals([
  { completedAttempts: 1, totalQuestions: 20, totalScore: 85 },
  { completedAttempts: 2, totalQuestions: 40, totalScore: 190 }
]);
assert.strictEqual(totals.completedAttempts, 3);
assert.strictEqual(totals.totalQuestions, 60);
assert.strictEqual(totals.totalScore, 275);

// 測試 8: 成語 200 分組區間 (每 10 則一組，共 20 組)
const rangeGroups = [];
for (let i = 1; i <= 200; i += 10) {
  rangeGroups.push({ start: i, end: i + 9, label: `${i}-${i + 9}` });
}
assert.strictEqual(rangeGroups.length, 20);
assert.strictEqual(rangeGroups[0].label, '1-10');
assert.strictEqual(rangeGroups[1].label, '11-20');
assert.strictEqual(rangeGroups[19].label, '191-200');

// 測試 9: 成語每日研讀進度累加與去重
function recordIdiomView(dailyHistory, date, idiomId) {
  let entry = dailyHistory.find(d => d.date === date);
  if (!entry) {
    entry = { date, viewedCount: 1, viewedIds: [idiomId] };
    dailyHistory.push(entry);
  } else {
    entry.viewedIds = entry.viewedIds || [];
    if (!entry.viewedIds.includes(idiomId)) {
      entry.viewedIds.push(idiomId);
    }
    entry.viewedCount = entry.viewedIds.length;
  }
  return dailyHistory;
}

let idiomHistory = [];
recordIdiomView(idiomHistory, '2026-09-23', 5);
recordIdiomView(idiomHistory, '2026-09-23', 6);
recordIdiomView(idiomHistory, '2026-09-23', 5); // 重複研讀不累加次數
assert.strictEqual(idiomHistory.length, 1);
assert.strictEqual(idiomHistory[0].viewedCount, 2);
assert.deepStrictEqual(idiomHistory[0].viewedIds, [5, 6]);

console.log('國語科目與成語 200 單元測試全部通過！');
