const assert = require('assert');
const express = require('express');
const createAiTutorRouter = require('../routes/aiTutor');

(async () => {
  const router = createAiTutorRouter({ pool: {} });
  const app = express();
  app.use(express.json());
  app.use('/api', router);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 1. 測試缺少題目時回傳 400
    const resBad = await fetch(`http://127.0.0.1:${port}/api/ai-tutor/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: 'math' })
    });
    assert.strictEqual(resBad.status, 400, '缺少題目時應回傳 HTTP 400');

    // 2. 測試數學速率題目之啟發式引導
    const resMath = await fetch(`http://127.0.0.1:${port}/api/ai-tutor/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'math',
        question: '小明以時速 60 公里行駛 2.5 小時，共行駛多少公里？',
        studentAnswer: '24'
      })
    });
    assert.strictEqual(resMath.status, 200, '正常請求應回傳 HTTP 200');
    const mathData = await resMath.json();
    assert.strictEqual(mathData.success, true, '回傳 success 應為 true');
    assert.ok(mathData.guide.includes('速率') || mathData.guide.includes('距離'), '應包含速率關聯思考引導');
    assert.ok(!mathData.guide.includes('150公里'), '引導內容絕不可直接給出正確答案 150');

    // 3. 測試自然科學酸鹼題目之啟發式引導
    const resNature = await fetch(`http://127.0.0.1:${port}/api/ai-tutor/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: 'nature',
        question: '滴入藍色石蕊試紙變紅色的水溶液是下列哪一種？',
        studentAnswer: '食鹽水'
      })
    });
    assert.strictEqual(resNature.status, 200, '正常請求應回傳 HTTP 200');
    const natureData = await resNature.json();
    assert.strictEqual(natureData.success, true, '回傳 success 應為 true');
    assert.ok(natureData.guide.includes('石蕊') || natureData.guide.includes('酸') || natureData.guide.includes('鹼'), '應包含實驗原理啟發');

    console.log('✅ ai_tutor_logic.test.js 全部通過 (100% PASS)');
  } finally {
    server.close();
  }
})();
