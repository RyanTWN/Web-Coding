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

// 4. 題庫動態產生測試（抽驗所有單元產生 10 題且含提示與詳解）
for (const [publisher, units] of Object.entries(MATH_CURRICULUM)) {
  for (const unit of units) {
    const questions = buildDailyMathQuestions(unit, 10);
    assert.strictEqual(questions.length, 10, `${unit} 應產生 10 道練習題`);
    assert.strictEqual(new Set(questions.map(q => q.id)).size, 10, '題目的 ID 不可重複');
    
    questions.forEach((q, idx) => {
      assert.ok(q.q && q.q.length > 3, `第 ${idx + 1} 題題幹不可為空`);
      assert.ok(q.a && q.a.length > 0, `第 ${idx + 1} 題必須有正確答案`);
      assert.ok(q.hint && q.hint.includes('提示'), `第 ${idx + 1} 題必須有解題提示`);
      assert.ok(q.explanation && q.explanation.includes('詳解'), `第 ${idx + 1} 題必須有步驟詳解`);
      if (q.type === 'choice') {
        assert.strictEqual(q.options.length, 4, '選擇題必須有 4 個選項');
        assert.ok(q.options.includes(q.a), '選擇題選項中必須包含正確答案');
      }
    });
  }
}

// 5. 學習日曆彙總測試
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
