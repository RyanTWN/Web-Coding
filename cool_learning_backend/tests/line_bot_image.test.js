/**
 * 酷學習 (Cool Learning) - LINE AI Bot 圖片閱卷與多模態視覺測試 (line_bot_image.test.js)
 */

const assert = require('assert');
const {
  callGeminiVision
} = require('../lib/llmService');
const {
  fetchLineMessageContent,
  gradeExamImage,
  processLineImageMessage
} = require('../lib/lineBotService');

(async () => {
  console.log('--- 測試 LINE AI Bot 考卷圖片識別與閱卷服務 (line_bot_image.test.js) ---');

  const dummyBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // 1. callGeminiVision 基礎檢驗
  await assert.rejects(
    () => callGeminiVision({ apiKey: '', imageBase64: dummyBase64 }),
    /未設定 GEMINI_API_KEY/,
    '未設定金鑰時應拋出明確錯誤'
  );

  await assert.rejects(
    () => callGeminiVision({ apiKey: 'fake_key', imageBase64: '' }),
    /缺少 imageBase64/,
    '未傳入圖片 Base64 時應拋出明確錯誤'
  );

  // 2. 測試 callGeminiVision 正常傳送 inline_data 與成功解析
  let capturedGeminiPayload = null;
  const mockGeminiFetch = async (url, options) => {
    capturedGeminiPayload = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: '【小酷閱卷】\n第1題: ✅ 正確\n第2題: ❌ 圓面積應為 314 平方公分。'
            }]
          }
        }]
      })
    };
  };

  const visionRes = await callGeminiVision({
    apiKey: 'test_gemini_key',
    userPrompt: '請批改這張考卷',
    imageBase64: dummyBase64,
    mimeType: 'image/png',
    fetchFn: mockGeminiFetch
  });

  assert.strictEqual(visionRes.success, true);
  assert.strictEqual(visionRes.provider, 'gemini');
  assert.ok(visionRes.text.includes('小酷閱卷'));
  assert.strictEqual(capturedGeminiPayload.contents[0].parts[0].inline_data.data, dummyBase64);
  assert.strictEqual(capturedGeminiPayload.contents[0].parts[0].inline_data.mime_type, 'image/png');
  console.log('  ✓ callGeminiVision 多模態 payload 與解析驗證通過');

  // 3. 測試 fetchLineMessageContent 下載二進位資料
  const mockLineContentFetch = async (url, options) => {
    assert.strictEqual(url, 'https://api-data.line.me/v2/bot/message/msg_123456/content');
    assert.strictEqual(options.headers.Authorization, 'Bearer mock_line_token');
    return {
      ok: true,
      status: 200,
      headers: {
        get: (h) => (h.toLowerCase() === 'content-type' ? 'image/jpeg' : null)
      },
      arrayBuffer: async () => Buffer.from('fake_image_bytes')
    };
  };

  const contentRes = await fetchLineMessageContent({
    messageId: 'msg_123456',
    accessToken: 'mock_line_token',
    fetchFn: mockLineContentFetch
  });

  assert.strictEqual(contentRes.mimeType, 'image/jpeg');
  assert.strictEqual(contentRes.base64, Buffer.from('fake_image_bytes').toString('base64'));
  console.log('  ✓ fetchLineMessageContent 成功自 LINE 串流下載圖片');

  // 4. 測試 processLineImageMessage 於私聊情境下自動閱卷並回覆
  let sentLineMessages = [];
  const mockLineReplyFetch = async (url, options) => {
    if (url.includes('/content')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => Buffer.from('sample_exam_image')
      };
    }
    if (url.includes('/reply')) {
      const body = JSON.parse(options.body);
      sentLineMessages.push(body);
      return { ok: true, status: 200 };
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: '【國小數學比與比值考卷】\n第 1 題：✅ 5:8 比值為 5/8\n第 2 題：❌ 需化為最簡整數比！\n💡 提示：前後項同除以最大公因數。'
              }]
            }
          }]
        })
      };
    }
    return { ok: false, status: 404 };
  };

  await processLineImageMessage({
    event: {
      type: 'message',
      replyToken: 'mock_reply_token_1',
      source: { type: 'user', userId: 'user_student_1' },
      message: { id: 'img_msg_999', type: 'image' }
    },
    fetchFn: mockLineReplyFetch,
    accessToken: 'test_access_token',
    geminiKey: 'mock_gemini_key'
  });

  assert.strictEqual(sentLineMessages.length, 1);
  assert.strictEqual(sentLineMessages[0].replyToken, 'mock_reply_token_1');
  assert.ok(sentLineMessages[0].messages[0].text.includes('小酷考卷/作業閱卷報告'));
  assert.ok(sentLineMessages[0].messages[0].text.includes('比與比值'));
  console.log('  ✓ 私聊情境下，學生上傳考卷照片立即批改回傳通過');

  // 5. 測試 processLineImageMessage 於群組情境：非學習照片自動靜音 ([IGNORE])
  sentLineMessages = [];
  const mockGroupIgnoreFetch = async (url) => {
    if (url.includes('/content')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => Buffer.from('sample_meme_image')
      };
    }
    if (url.includes('/reply')) {
      sentLineMessages.push(true);
      return { ok: true, status: 200 };
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: '[IGNORE]'
              }]
            }
          }]
        })
      };
    }
    return { ok: false, status: 404 };
  };

  await processLineImageMessage({
    event: {
      type: 'message',
      replyToken: 'mock_reply_token_group',
      source: { type: 'group', groupId: 'group_family_123' },
      message: { id: 'img_msg_meme', type: 'image' }
    },
    fetchFn: mockGroupIgnoreFetch,
    accessToken: 'test_access_token',
    geminiKey: 'mock_gemini_key'
  });

  assert.strictEqual(sentLineMessages.length, 0, '群組內傳送非試卷生活照片應保持靜音，不打擾群友');
  console.log('  ✓ 群組防洗版：非考卷生活照片自動識別並靜音驗證通過');

  console.log('✅ line_bot_image.test.js 全部通過 (100% PASS)');
})();
