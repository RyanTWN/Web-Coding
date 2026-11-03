const assert = require('assert');
const express = require('express');
const crypto = require('crypto');
const createLineBotRouter = require('../routes/lineBot');
const {
  verifyLineSignature,
  getOrCreateSession,
  processLineTextMessage,
  createTextMessage,
  getDefaultQuickReplies
} = require('../lib/lineBotService');

(async () => {
  console.log('--- 測試 LINE AI Bot「小酷」核心邏輯 (line_bot_logic.test.js) ---');
  process.env.LINE_CHANNEL_ACCESS_TOKEN = 'mock-access-token';

  // 1. 測試 LINE Webhook 簽章計算與驗證
  const secret = 'test-channel-secret';
  const testPayload = JSON.stringify({ events: [{ type: 'message' }] });
  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(Buffer.from(testPayload, 'utf8'))
    .digest('base64');

  assert.strictEqual(
    verifyLineSignature(testPayload, validSignature, secret),
    true,
    '合法簽章應驗證通過'
  );
  assert.strictEqual(
    verifyLineSignature(testPayload, 'invalid-signature', secret),
    false,
    '偽造簽章應被拒絕'
  );

  // 2. 測試 Session 狀態管理與切換
  const testUserId = 'user-test-' + Date.now();
  const session = getOrCreateSession(testUserId);
  assert.strictEqual(session.mode, 'student', '新進使用者預設應為學生模式');

  // 3. 測試模擬 LINE Reply 發送記錄
  let sentReplies = [];
  const mockFetch = async (url, options) => {
    if (url.includes('api.line.me/v2/bot/message/reply')) {
      const body = JSON.parse(options.body);
      sentReplies.push(body);
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  // 4. 測試模式切換：「切換家長模式」
  sentReplies = [];
  await processLineTextMessage({
    event: {
      source: { userId: testUserId },
      replyToken: 'token-1',
      message: { text: '切換家長模式' }
    },
    fetchFn: mockFetch
  });
  assert.strictEqual(session.mode, 'guardian', '模式應成功切換為家長模式');
  assert.strictEqual(sentReplies.length, 1);
  assert.ok(sentReplies[0].messages[0].text.includes('【家長模式】'));

  // 5. 測試家長模式下的客服問題回覆
  sentReplies = [];
  await processLineTextMessage({
    event: {
      source: { userId: testUserId },
      replyToken: 'token-2',
      message: { text: '請問訂閱方案與費用？' }
    },
    fetchFn: mockFetch
  });
  assert.strictEqual(sentReplies.length, 1);
  assert.ok(sentReplies[0].messages[0].text.includes('家長會員方案'));
  assert.ok(sentReplies[0].messages[0].text.includes('110 組國小六年級核心題型'));

  // 6. 測試切回學生模式
  await processLineTextMessage({
    event: {
      source: { userId: testUserId },
      replyToken: 'token-3',
      message: { text: '切換學生模式' }
    },
    fetchFn: mockFetch
  });
  assert.strictEqual(session.mode, 'student', '應切回學生模式');

  // 7. 測試學生出卷功能（數學卷）
  sentReplies = [];
  await processLineTextMessage({
    event: {
      source: { userId: testUserId },
      replyToken: 'token-4',
      message: { text: '出數學卷' }
    },
    fetchFn: mockFetch
  });
  assert.strictEqual(sentReplies.length, 1);
  assert.ok(session.currentQuiz !== null, 'Session 應記錄當前測驗卷');
  assert.strictEqual(session.currentQuiz.questions.length, 3, '應包含 3 道考題');
  assert.ok(sentReplies[0].messages[0].text.includes('出卷完畢'));

  // 8. 測試學生回答試卷 -> 觸發即時閱卷
  sentReplies = [];
  await processLineTextMessage({
    event: {
      source: { userId: testUserId },
      replyToken: 'token-5',
      message: { text: '1. 314, 2. 12, 3. 0.6' }
    },
    fetchFn: mockFetch
  });
  assert.strictEqual(sentReplies.length, 1);
  assert.strictEqual(session.currentQuiz, null, '閱卷後應清空當前試卷');
  assert.ok(sentReplies[0].messages[0].text.includes('閱卷'), '應回傳閱卷報告');

  // 9. 測試 Express Webhook 整合測試
  const app = express();
  app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf; }
  }));
  app.use('/api', createLineBotRouter({ pool: {} }));

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // 9.1 測試 GET /api/line-bot/status
    const statusRes = await fetch(`http://127.0.0.1:${port}/api/line-bot/status`);
    assert.strictEqual(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.strictEqual(statusData.success, true);
    assert.ok(statusData.botName.includes('小酷'));

    // 9.2 測試 LINE Webhook Verify 事件（空 events 應回傳 HTTP 200）
    const verifyRes = await fetch(`http://127.0.0.1:${port}/api/line-bot/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] })
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifyData = await verifyRes.json();
    assert.strictEqual(verifyData.success, true);

    console.log('✅ line_bot_logic.test.js 全部通過 (100% PASS)');
  } finally {
    server.close();
  }
})();
