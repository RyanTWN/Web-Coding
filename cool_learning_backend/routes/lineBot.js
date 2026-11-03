/**
 * 酷學習 (Cool Learning) - LINE AI Bot「小酷」Webhook 路由模組 (lineBot.js)
 *
 * 端點規範：
 * POST /api/line-bot/webhook  接收 LINE Messaging API 之 Webhook 事件
 * GET  /api/line-bot/status   檢查 LINE Bot 與雙軌 LLM 設定狀態
 */

const express = require('express');
const {
  verifyLineSignature,
  processLineTextMessage,
  processLineImageMessage
} = require('../lib/lineBotService');

module.exports = function createLineBotRouter({ pool }) {
  const router = express.Router();

  // [GET /api/line-bot/status] 健康狀態檢測
  router.get('/line-bot/status', (req, res) => {
    res.json({
      success: true,
      botName: '小酷 (Cool Learning AI Bot)',
      channelSecretConfigured: !!process.env.LINE_CHANNEL_SECRET,
      channelAccessTokenConfigured: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
      groqKeyConfigured: !!process.env.GROQ_API_KEY,
      visionSupported: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString()
    });
  });

  // [GET /api/line-bot/diagnose] 即時診斷雙軌 LLM 連線細節
  router.get('/line-bot/diagnose', async (req, res) => {
    const { callGemini, callGroq, callLLMWithFallback } = require('../lib/llmService');
    const diag = {
      gemini: {
        configured: !!process.env.GEMINI_API_KEY,
        length: (process.env.GEMINI_API_KEY || '').length,
        prefix: (process.env.GEMINI_API_KEY || '').slice(0, 6) + '...',
        testResult: null
      },
      groq: {
        configured: !!process.env.GROQ_API_KEY,
        length: (process.env.GROQ_API_KEY || '').length,
        prefix: (process.env.GROQ_API_KEY || '').slice(0, 6) + '...',
        testResult: null
      },
      fallbackTest: null
    };

    try {
      diag.gemini.testResult = await callGemini({
        userPrompt: '請回覆「測試成功」四個字',
        maxTokens: 30,
        timeoutMs: 6000
      });
    } catch (err) {
      diag.gemini.testResult = { error: err.message };
    }

    try {
      diag.groq.testResult = await callGroq({
        userPrompt: '請回覆「測試成功」四個字',
        maxTokens: 30,
        timeoutMs: 6000
      });
    } catch (err) {
      diag.groq.testResult = { error: err.message };
    }

    try {
      diag.fallbackTest = await callLLMWithFallback({
        userPrompt: '請回覆「測試成功」四個字',
        maxTokens: 30,
        timeoutMs: 6000
      });
    } catch (err) {
      diag.fallbackTest = { error: err.message };
    }

    res.json(diag);
  });

  // [POST /api/line-bot/webhook] 核心 Webhook 接收點
  router.post('/line-bot/webhook', async (req, res) => {
    const signature = req.headers['x-line-signature'];
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    // 若正式機有配置 LINE_CHANNEL_SECRET，必須進行嚴格的 HMAC-SHA256 簽章驗證
    if (channelSecret) {
      const rawBody = req.rawBody || JSON.stringify(req.body || {});
      const isValid = verifyLineSignature(rawBody, signature, channelSecret);
      if (!isValid) {
        console.warn('[LINE/Webhook] 簽章驗證不通過，拒絕未授權請求');
        return res.status(401).json({ success: false, error: 'Invalid LINE signature' });
      }
    }

    const events = req.body?.events || [];

    // LINE Webhook 驗證測試（Console 點選「Verify」時 events 通常為空陣列）
    if (events.length === 0) {
      return res.status(200).json({ success: true, message: 'Verification event received' });
    }

    // 立即回應 HTTP 200 避免 LINE 重試或逾時，並在背景處理對話
    res.status(200).json({ success: true, processedCount: events.length });

    // 依序處理文字與圖片訊息事件
    for (const event of events) {
      if (event.type === 'message') {
        if (event.message?.type === 'text') {
          try {
            await processLineTextMessage({ event, pool });
          } catch (eventErr) {
            console.error('[LINE/Webhook] 文字事件處理異常:', eventErr);
          }
        } else if (event.message?.type === 'image') {
          try {
            await processLineImageMessage({ event, pool });
          } catch (imageErr) {
            console.error('[LINE/Webhook] 圖片考卷處理異常:', imageErr);
          }
        }
      }
    }
  });

  return router;
};
