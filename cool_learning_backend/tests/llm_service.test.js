const assert = require('assert');
const {
  callGemini,
  callGroq,
  callLLMWithFallback
} = require('../lib/llmService');

(async () => {
  console.log('--- 測試 LLM 容錯調度服務 (llmService.js) ---');

  // 1. 未配置金鑰時的行為檢驗
  await assert.rejects(
    () => callGemini({ apiKey: '', userPrompt: 'Hello' }),
    /未設定 GEMINI_API_KEY/,
    '未提供 GEMINI_API_KEY 時應丟出明確異常'
  );

  await assert.rejects(
    () => callGroq({ apiKey: '', userPrompt: 'Hello' }),
    /未設定 GROQ_API_KEY/,
    '未提供 GROQ_API_KEY 時應丟出明確異常'
  );

  // 2. 模擬 Gemini 成功回應
  const mockGeminiFetch = async (url, options) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '這是 Gemini 的啟發式引導' }]
            }
          }
        ]
      })
    };
  };

  const geminiRes = await callGemini({
    apiKey: 'mock-gemini-key',
    userPrompt: '這題怎麼算？',
    fetchFn: mockGeminiFetch
  });
  assert.strictEqual(geminiRes.success, true);
  assert.strictEqual(geminiRes.provider, 'gemini');
  assert.strictEqual(geminiRes.text, '這是 Gemini 的啟發式引導');

  // 3. 模擬 Groq 成功回應
  const mockGroqFetch = async (url, options) => {
    const body = JSON.parse(options.body);
    assert.strictEqual(options.headers.Authorization, 'Bearer mock-groq-key');
    assert.ok(body.messages.some(m => m.role === 'system'));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: '這是 Groq (Llama) 的極速回應'
            }
          }
        ]
      })
    };
  };

  const groqRes = await callGroq({
    apiKey: 'mock-groq-key',
    systemPrompt: '你是貓頭鷹小助教',
    userPrompt: '請給我一個提示',
    fetchFn: mockGroqFetch
  });
  assert.strictEqual(groqRes.success, true);
  assert.strictEqual(groqRes.provider, 'groq');
  assert.strictEqual(groqRes.text, '這是 Groq (Llama) 的極速回應');

  // 4. 測試雙軌備援：Gemini 遭遇 429 額度不足時，自動切換至 Groq
  const mockFailingGeminiThenGroqFetch = async (url, options) => {
    if (url.includes('generativelanguage.googleapis.com')) {
      return {
        ok: false,
        status: 429,
        text: async () => 'Resource has been exhausted (rate limit)'
      };
    }
    if (url.includes('api.groq.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Groq 成功接手 Gemini 429 備援任務'
              }
            }
          ]
        })
      };
    }
    throw new Error('未知 URL');
  };

  const fallbackRes = await callLLMWithFallback({
    geminiKey: 'mock-gemini-key',
    groqKey: 'mock-groq-key',
    userPrompt: '測試 429 自動切換',
    fetchFn: mockFailingGeminiThenGroqFetch
  });

  assert.strictEqual(fallbackRes.success, true);
  assert.strictEqual(fallbackRes.provider, 'groq', 'Gemini 429 時應無縫切換至 Groq');
  assert.strictEqual(fallbackRes.text, 'Groq 成功接手 Gemini 429 備援任務');

  // 5. 測試雙通道皆無金鑰或皆失敗時，優雅回傳失敗旗標 (讓上層觸發本機啟發式保底)
  const noKeyRes = await callLLMWithFallback({
    geminiKey: '',
    groqKey: '',
    userPrompt: '無金鑰測試'
  });
  assert.strictEqual(noKeyRes.success, false);
  assert.strictEqual(noKeyRes.provider, 'none');

  console.log('✅ llm_service.test.js 全部通過 (100% PASS)');
})();
