const assert = require('assert');
const path = require('path');

const {
  MATH_CURRICULUM,
  gcd,
  lcm,
  simplifyFraction,
  parseMathValue,
  isAnswerCorrect,
  buildDailyMathQuestions,
  getMathCalendarTotals
} = require('../../cool_learning/assets/js/math.js');

// 1. 課綱三大版本完整性測試
assert.deepStrictEqual(Object.keys(MATH_CURRICULUM).sort(), ['南一', '康軒', '翰林']);
for (const [publisher, units] of Object.entries(MATH_CURRICULUM)) {
  assert.ok(units.length >= 12, `${publisher} 應涵蓋六上與六下完整單元（至少 12 單元）`);
}

// 2. 基礎數學輔助運算測試
assert.strictEqual(gcd(12, 18), 6, 'gcd(12, 18) 應為 6');
assert.strictEqual(gcd(7, 13), 1, '互質兩數 gcd 應為 1');
assert.strictEqual(lcm(4, 6), 12, 'lcm(4, 6) 應為 12');
assert.deepStrictEqual(simplifyFraction(4, 8), { top: 1, bottom: 2, str: '1/2' }, '4/8 應化簡為 1/2');
assert.deepStrictEqual(simplifyFraction(9, 3), { top: 3, bottom: 1, str: '3' }, '9/3 應化簡為整數 3');

// 3. 數值解析與等價判定測試 (Answer Tolerance)
assert.ok(isAnswerCorrect('1/2', '1/2'), '相同分數應判定正確');
assert.ok(isAnswerCorrect('2/4', '1/2'), '未約分等價分數 2/4 應判定正確');
assert.ok(isAnswerCorrect('0.5', '1/2'), '小數 0.5 等於 1/2 應判定正確');
assert.ok(isAnswerCorrect(' 12 ', '12'), '前後空白應自動容錯');
assert.ok(isAnswerCorrect('20 公尺', '20 公尺'), '字串選項應正確比對');
assert.strictEqual(isAnswerCorrect('1/3', '1/2'), false, '相異數值應判定錯誤');
assert.strictEqual(isAnswerCorrect('abc', '12'), false, '非數值錯誤字串應判定錯誤');

// 4. 題庫動態產生測試（驗證 10 題嚴格分層：5 簡單基礎 + 3 挑戰進階 + 2 情境素養，且保證同一輪題目絕不重複）
for (const [publisher, units] of Object.entries(MATH_CURRICULUM)) {
  for (const unit of units) {
    // 每個單元連續測試 3 輪，確保隨機生成時每一輪均無重複題目且配比精確
    for (let round = 1; round <= 3; round++) {
      const questions = buildDailyMathQuestions(unit, 10);
      assert.strictEqual(questions.length, 10, `${unit} 第 ${round} 輪應產生 10 道練習題`);
      assert.strictEqual(new Set(questions.map(q => q.id)).size, 10, `${unit} 第 ${round} 輪題目的 ID 不可重複`);
      assert.strictEqual(
        new Set(questions.map(q => q.q)).size,
        10,
        `${unit} 第 ${round} 輪產生的 10 道題目內容 (q) 絕對不可重複！`
      );

      // 驗證分層配比：5 簡單基礎 + 3 挑戰進階 + 2 情境素養
      const easyCount = questions.filter(q => q.level === 'easy').length;
      const challengeCount = questions.filter(q => q.level === 'challenge').length;
      const competencyCount = questions.filter(q => q.level === 'competency').length;

      assert.strictEqual(easyCount, 5, `${unit} 第 ${round} 輪簡單基礎題應為 5 題，目前為 ${easyCount}`);
      assert.strictEqual(challengeCount, 3, `${unit} 第 ${round} 輪挑戰進階題應為 3 題，目前為 ${challengeCount}`);
      assert.strictEqual(competencyCount, 2, `${unit} 第 ${round} 輪情境素養題應為 2 題，目前為 ${competencyCount}`);
      
      questions.forEach((q, idx) => {
        assert.ok(q.q && q.q.length > 3, `第 ${idx + 1} 題題幹不可為空`);
        assert.ok(q.a && q.a.length > 0, `第 ${idx + 1} 題必須有正確答案`);
        assert.ok(['easy', 'challenge', 'competency'].includes(q.level), `第 ${idx + 1} 題必須具備有效 level`);
        assert.ok(['簡單基礎', '挑戰進階', '情境素養'].includes(q.kind), `第 ${idx + 1} 題必須具備有效 kind`);
        assert.ok(q.hint && q.hint.includes('提示'), `第 ${idx + 1} 題必須有解題提示`);
        assert.ok(q.explanation && q.explanation.includes('詳解'), `第 ${idx + 1} 題必須有步驟詳解`);
        if (q.type === 'choice') {
          assert.strictEqual(q.options.length, 4, '選擇題必須有 4 個選項');
          assert.ok(q.options.includes(q.a), '選擇題選項中必須包含正確答案');
        }
      });
    }
  }
}

// 5. 獨立模式切換測試 (mode = 'easy' | 'challenge' | 'competency')
const testModes = [
  { mode: 'easy', expectedLevel: 'easy', expectedKind: '簡單基礎' },
  { mode: 'challenge', expectedLevel: 'challenge', expectedKind: '挑戰進階' },
  { mode: 'competency', expectedLevel: 'competency', expectedKind: '情境素養' }
];

for (const { mode, expectedLevel, expectedKind } of testModes) {
  for (const [publisher, units] of Object.entries(MATH_CURRICULUM)) {
    for (const unit of units) {
      for (let round = 1; round <= 3; round++) {
        const questions = buildDailyMathQuestions(unit, 10, [], mode);
        assert.strictEqual(questions.length, 10, `${unit} 在 ${mode} 模式下應產生 10 道題`);
        assert.strictEqual(
          new Set(questions.map(q => q.q)).size,
          10,
          `${unit} 第 ${round} 輪在 ${mode} 模式下產生的 10 道題幹絕對不可重複！`
        );
        
        questions.forEach((q, idx) => {
          assert.strictEqual(
            q.level,
            expectedLevel,
            `${unit} 第 ${round} 輪第 ${idx + 1} 題之 level 應為 ${expectedLevel}，實為 ${q.level}`
          );
          assert.strictEqual(
            q.kind,
            expectedKind,
            `${unit} 第 ${round} 輪第 ${idx + 1} 題之 kind 應為 ${expectedKind}，實為 ${q.kind}`
          );
          assert.ok(q.q && q.q.length > 0, '題目題幹不可為空');
          assert.ok(q.a && q.a.length > 0, '題目答案不可為空');
          assert.ok(q.hint && q.hint.length > 0, '題目提示不可為空');
          assert.ok(q.explanation && q.explanation.length > 0, '題目詳解不可為空');
        });
      }
    }
  }
}

// 6. 學習日曆彙總測試
const mockHistory = [
  { date: '2026-09-01', score: 90 },
  { date: '2026-09-02', score: 100 },
  { date: '2026-09-02', score: 80 },
  { date: '2026-08-30', score: 100 }
];
const septTotals = getMathCalendarTotals(mockHistory, 2026, 8); // month index 8 is September
assert.strictEqual(septTotals.completedAttempts, 3, '九月份完成次數應為 3 次');
assert.strictEqual(septTotals.totalQuestions, 30, '九月份總完成題數應為 30 題');
assert.strictEqual(septTotals.totalScore, 270, '九月份總得分應為 270');
assert.strictEqual(septTotals.activeDays, 2, '九月份活躍天數應為 2 天');

console.log('✅ math_logic.test.js 全部通過 (100% PASS)');
