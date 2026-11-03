/**
 * 酷學習 (Cool Learning) - 智慧 LLM 多核心容錯調度服務 (llmService.js)
 *
 * 架構定位：
 * 專為 Synology NAS (DS423+) 資源受限環境設計的高效能、輕量級 LLM 調度中心。
 * 使用 Node 原生 fetch，無外部依賴。
 *
 * 容錯策略：
 * 1. 【主通道 Primary】Google Gemini API (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)
 *    - 擅長繁體中文教育語境、蘇格拉底啟發式教學與結構化解析。
 * 2. 【備援通道 Fallback】Groq Cloud API (llama-3.3-70b-versatile / llama-3.1-8b-instant)
 *    - 推論速度極快 (250~300 tokens/s)，在 Gemini 面臨 429 限流或 503 忙碌時秒級接手。
 * 3. 【嚴格逾時防護】每一層呼叫均具備 AbortController 逾時截斷 (預設 6.5 秒)，防止阻塞 Node.js 事件循環與 LINE Webhook。
 */

const DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
const DEFAULT_GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

/**
 * 呼叫 Google Gemini API
 */
async function callGemini({
  apiKey = process.env.GEMINI_API_KEY,
  systemPrompt = '',
  userPrompt = '',
  messages = [],
  temperature = 0.7,
  maxTokens = 500,
  timeoutMs = 6500,
  models = DEFAULT_GEMINI_MODELS,
  fetchFn = fetch
} = {}) {
  if (!apiKey) {
    throw new Error('未設定 GEMINI_API_KEY');
  }

  // 轉換成 Gemini 的 contents 格式
  let combinedPrompt = '';
  if (messages && messages.length > 0) {
    combinedPrompt = messages
      .map(m => `${m.role === 'user' ? '使用者' : m.role === 'system' ? '系統設定' : '助手'}: ${m.content || m.text}`)
      .join('\n');
    if (userPrompt) combinedPrompt += `\n使用者: ${userPrompt}`;
  } else {
    combinedPrompt = userPrompt;
  }

  const promptText = systemPrompt
    ? `${systemPrompt}\n\n${combinedPrompt}`
    : combinedPrompt;

  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens
          }
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[LLM/Gemini] 模型 ${model} 回應 HTTP ${res.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`Gemini ${model} HTTP ${res.status}`);
        continue; // 嘗試下一個 Gemini 模型或後續切換 Groq
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim()) {
        return {
          success: true,
          provider: 'gemini',
          model,
          text: text.trim()
        };
      }
      lastError = new Error(`Gemini ${model} 回傳空內容`);
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      console.warn(`[LLM/Gemini] 模型 ${model} 呼叫失敗 (${isAbort ? '逾時' : err.message})`);
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('所有 Gemini 模型呼叫皆失敗');
}

/**
 * 呼叫 Groq API (OpenAI 相容協議)
 */
async function callGroq({
  apiKey = process.env.GROQ_API_KEY,
  systemPrompt = '',
  userPrompt = '',
  messages = [],
  temperature = 0.7,
  maxTokens = 500,
  timeoutMs = 6500,
  models = DEFAULT_GROQ_MODELS,
  fetchFn = fetch
} = {}) {
  if (!apiKey) {
    throw new Error('未設定 GROQ_API_KEY');
  }

  // 組織 OpenAI 相容格式的 messages 陣列
  const formattedMessages = [];
  if (systemPrompt) {
    formattedMessages.push({
      role: 'system',
      content: `${systemPrompt}\n\n【重要規範】：請以流暢之「繁體中文（台灣習慣用語）」進行回覆。`
    });
  }

  if (messages && messages.length > 0) {
    for (const m of messages) {
      formattedMessages.push({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || m.text || ''
      });
    }
  }

  if (userPrompt) {
    formattedMessages.push({
      role: 'user',
      content: userPrompt
    });
  }

  let lastError = null;

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const res = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`[LLM/Groq] 模型 ${model} 回應 HTTP ${res.status}: ${errText.slice(0, 150)}`);
        lastError = new Error(`Groq ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.trim()) {
        return {
          success: true,
          provider: 'groq',
          model,
          text: text.trim()
        };
      }
      lastError = new Error(`Groq ${model} 回傳空內容`);
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      console.warn(`[LLM/Groq] 模型 ${model} 呼叫失敗 (${isAbort ? '逾時' : err.message})`);
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('所有 Groq 模型呼叫皆失敗');
}

/**
 * 核心排程調度：Gemini (主) -> Groq (備援) 自動雙軌切換
 */
async function callLLMWithFallback({
  geminiKey = process.env.GEMINI_API_KEY,
  groqKey = process.env.GROQ_API_KEY,
  systemPrompt = '',
  userPrompt = '',
  messages = [],
  temperature = 0.7,
  maxTokens = 500,
  timeoutMs = 6500,
  fetchFn = fetch
} = {}) {
  // 1. 優先嘗試 Google Gemini
  if (geminiKey) {
    try {
      const result = await callGemini({
        apiKey: geminiKey,
        systemPrompt,
        userPrompt,
        messages,
        temperature,
        maxTokens,
        timeoutMs,
        fetchFn
      });
      return result;
    } catch (geminiErr) {
      console.warn(`[LLM/Dispatcher] Gemini 主通道異常 (${geminiErr.message})，自動啟動 Groq 備援通道...`);
    }
  }

  // 2. 備援嘗試 Groq
  if (groqKey) {
    try {
      const result = await callGroq({
        apiKey: groqKey,
        systemPrompt,
        userPrompt,
        messages,
        temperature,
        maxTokens,
        timeoutMs,
        fetchFn
      });
      return result;
    } catch (groqErr) {
      console.warn(`[LLM/Dispatcher] Groq 備援通道異常 (${groqErr.message})`);
    }
  }

  // 3. 雙通道皆無法使用
  return {
    success: false,
    provider: 'none',
    model: 'none',
    text: null,
    error: 'Gemini 與 Groq 皆無法連線或未配置金鑰'
  };
}

module.exports = {
  callGemini,
  callGroq,
  callLLMWithFallback,
  DEFAULT_GEMINI_MODELS,
  DEFAULT_GROQ_MODELS
};
