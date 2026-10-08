/**
 * 酷學習 (Cool Learning) - AI 蘇格拉底智能學科助教前端元件 (ai-tutor.js)
 * 在學生做錯或遇到難題時，提供啟發式思考引導（絕不直接給出答案）。
 * 支援多輪追問對話、題幹教材線索動態整合、全學科即時診斷與本機智慧保底引擎。
 */

(function() {
  'use strict';

  let activeContext = {
    subject: 'math',
    question: '',
    options: [],
    studentAnswer: '',
    correctAnswer: '',
    hint: '',
    explanation: '',
    unit: '',
    attemptCount: 1
  };

  let chatHistory = []; // 對話歷程 [{ role: 'tutor'|'user', text: string, step?: string }]

  // 清除詳解中洩漏的答案字眼
  function sanitizeExplanation(rawExp, correctAnswer = '') {
    if (!rawExp || typeof rawExp !== 'string') return '';
    let exp = rawExp.replace(/^📝\s*詳解[：:]\s*/i, '').trim();
    if (correctAnswer) {
      const escaped = String(correctAnswer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      exp = exp.replace(new RegExp(`(?:因此|故|所以|答案為|即為)[^，。！？\n]*${escaped}[^，。！？\n]*[。！？\n]?`, 'gi'), '');
    }
    return exp.trim();
  }

  // 本機動態啟發式規則庫（網路離線或逾時之動態保底引擎）
  // 深度利用本題的 hint、explanation、數字與學生作答，絕不給出千篇一律的罐頭文字！
  function getClientFallbackGuidance(userQuery = '') {
    const cleanHint = String(activeContext.hint || '').replace(/^[💡📝]\s*提示[：:]\s*/, '').trim();
    const cleanExp = sanitizeExplanation(activeContext.explanation, activeContext.correctAnswer);
    const studentAns = String(activeContext.studentAnswer || '').trim();

    if (userQuery && userQuery.trim()) {
      const qLower = userQuery.toLowerCase();
      if (qLower.includes('答案') || qLower.includes('是多少') || qLower.includes('直接講')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: `哈哈，貓頭鷹小助教是有教育原則的！蘇格拉底啟發法絕對不能直接洩漏答案喔！\n\n💡 再給你一個關鍵線索：${cleanHint || cleanExp || '先把已知數字在草稿紙畫出步驟圖。'}\n試著依這個方向動筆，你一定能自己算出來！`,
          hintStep: '自己推導出來的答案最踏實！'
        };
      }
      return {
        title: '🦉 貓頭鷹小助教提點',
        guide: `針對你剛才問的「${userQuery}」：\n\n💡 關鍵解題步驟建議：${cleanHint || cleanExp || '重新檢視題目的已知條件與單位是否一致。'}\n試著把數字代入這個步驟檢查看看！`,
        hintStep: '靜下心重新檢驗草稿紙，答案就在下一步！'
      };
    }

    let guideParts = [];
    if (cleanHint) {
      guideParts.push(`💡 本題核心思考關鍵：\n${cleanHint}`);
    } else if (cleanExp) {
      guideParts.push(`💡 解題思考方向：\n${cleanExp}`);
    }

    if (studentAns && studentAns !== '（初次卡關）') {
      guideParts.push(`🧐 檢驗你的嘗試「${studentAns}」：\n想一想，這個數字符合題目要求的單位與關係嗎？檢查草稿紙是否有運算或移項的小粗心！`);
    }

    let step = '步驟：先在草稿紙列出題目給予的已知條件，再逐步求值。';
    const qLower = String(activeContext.question || '').toLowerCase();
    if (activeContext.subject === 'math') {
      if (qLower.includes('公因數') || qLower.includes('公倍數') || qLower.includes('短除法')) {
        step = '步驟：在草稿紙畫出短除法，從質因數 2、3 或 5 開始整除。';
      } else if (qLower.includes('速率') || qLower.includes('時間') || qLower.includes('距離')) {
        step = '步驟：檢查「時間單位」（分/時）與「長度單位」（公尺/公里）是否統一。';
      } else if (qLower.includes('圓') || qLower.includes('扇形')) {
        step = '步驟：確認題目給的是「半徑」還是「直徑」，再套用 3.14 公式。';
      }
    } else if (activeContext.subject === 'nature') {
      step = '線索：回想實驗情境，找出題目要探討的操縱變因與不變量。';
    } else if (activeContext.subject === 'english') {
      step = '線索：結合例句情境推敲字義，並跟著大聲朗讀體會自然發音。';
    }

    if (guideParts.length === 0) {
      guideParts.push(`這道題目很有深度喔！\n\n💡 先在草稿紙圈出題目的已知數字與單位。\n剛剛作答的「${studentAns || '這個選項'}」可能在思考時漏掉了哪個關鍵線索呢？`);
    }

    return {
      title: '🦉 貓頭鷹小助教提點',
      guide: guideParts.join('\n\n'),
      hintStep: step
    };
  }

  // 動態建立或取得 AI 助教對話彈窗 DOM
  function ensureAiTutorModal() {
    let modal = document.getElementById('ai-tutor-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ai-tutor-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center p-3 sm:p-4 transition-opacity duration-200';
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 999999; display: none; align-items: center; justify-content: center; padding: 1rem;';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl border border-teal-200 relative overflow-hidden text-left flex flex-col" style="max-height: 90vh;">
        <!-- 頂部裝飾光暈 -->
        <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal-200/40 pointer-events-none" style="filter: blur(24px);"></div>

        <!-- 標題列 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center text-xl shadow-md shrink-0">
              🦉
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 id="ai-tutor-title" class="text-base font-black text-slate-800 leading-tight">AI 貓頭鷹小助教</h3>
                <span id="ai-tutor-source-badge" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">思考中</span>
              </div>
              <p class="text-[11px] text-teal-700 font-bold">蘇格拉底啟發式解題思維引導</p>
            </div>
          </div>
          <button type="button" id="ai-tutor-close-btn" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="關閉">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- 題目摘要預覽 -->
        <div id="ai-tutor-question-preview" class="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed shrink-0 mb-3 max-h-24 overflow-y-auto">
          題目載入中...
        </div>

        <!-- 對話訊息串流滾動區 -->
        <div id="ai-tutor-chat-stream" class="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[140px] max-h-[48vh]">
          <!-- 思考中動畫 -->
          <div id="ai-tutor-loading" class="py-6 flex flex-col items-center justify-center gap-2 text-teal-700">
            <div class="flex items-center gap-2 text-2xl animate-bounce">
              <span>🦉</span>
              <span class="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
            </div>
            <span class="text-xs font-bold tracking-wide">小助教正在針對這道題的關鍵步驟為你思考線索...</span>
          </div>
        </div>

        <!-- 追問輸入區 -->
        <div id="ai-tutor-interactive-box" class="pt-3 border-t border-slate-100 mt-2 space-y-2 shrink-0">
          <div class="flex gap-2">
            <input type="text" id="ai-tutor-input-query" placeholder="還有哪一步想不通？直接問小助教（例如：第一步怎麼算）..." class="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-300 focus:border-teal-500 focus:outline-none">
            <button type="button" id="ai-tutor-btn-send" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0">
              發問
            </button>
          </div>
        </div>

        <!-- 底部關閉按鈕 -->
        <div class="pt-2.5 mt-2 border-t border-slate-100 flex justify-end shrink-0">
          <button type="button" id="ai-tutor-btn-finish" class="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
            我知道該怎麼想了，再做一次！
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.style.display = 'none';
      modal.classList.add('hidden');
    };

    modal.querySelector('#ai-tutor-close-btn')?.addEventListener('click', closeModal);
    modal.querySelector('#ai-tutor-btn-finish')?.addEventListener('click', closeModal);

    // 點擊背景遮罩關閉
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // 按下 ESC 鍵關閉
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
      }
    });

    // 追問發送事件
    const handleSendQuery = () => {
      const input = document.getElementById('ai-tutor-input-query');
      if (input && input.value.trim()) {
        const query = input.value.trim();
        input.value = '';
        appendUserMessage(query);
        fetchAiTutorAdvice(query);
      }
    };

    modal.querySelector('#ai-tutor-btn-send')?.addEventListener('click', handleSendQuery);
    modal.querySelector('#ai-tutor-input-query')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendQuery();
      }
    });

    return modal;
  }

  // 渲染學生訊息氣泡
  function appendUserMessage(text) {
    const stream = document.getElementById('ai-tutor-chat-stream');
    if (!stream) return;
    const msgEl = document.createElement('div');
    msgEl.className = 'flex justify-end';
    msgEl.innerHTML = `
      <div class="bg-slate-800 text-white text-xs font-medium px-3.5 py-2.5 rounded-2xl rounded-tr-xs max-w-[85%] shadow-sm leading-relaxed">
        ${escapeHtml(text)}
      </div>
    `;
    stream.appendChild(msgEl);
    stream.scrollTop = stream.scrollHeight;
    chatHistory.push({ role: 'user', text });
  }

  // 渲染貓頭鷹助教訊息氣泡
  function appendTutorMessage({ guide, hintStep, source }) {
    const stream = document.getElementById('ai-tutor-chat-stream');
    if (!stream) return;

    const sourceBadge = document.getElementById('ai-tutor-source-badge');
    if (sourceBadge) {
      if (source && source.startsWith('gemini')) {
        sourceBadge.textContent = 'Gemini 智能推理';
        sourceBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800';
      } else {
        sourceBadge.textContent = '啟發規則引擎';
        sourceBadge.className = 'px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800';
      }
    }

    const msgEl = document.createElement('div');
    msgEl.className = 'flex gap-2.5 items-start';
    msgEl.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center text-sm shrink-0 shadow-xs">
        🦉
      </div>
      <div class="flex-1 space-y-2">
        <div class="p-3.5 bg-teal-50/90 border border-teal-200/80 rounded-2xl rounded-tl-xs text-slate-800 text-xs sm:text-sm leading-relaxed space-y-2 shadow-xs">
          <div class="whitespace-pre-line font-medium text-slate-700">${escapeHtml(guide)}</div>
        </div>
        ${hintStep ? `
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
            <i class="fa-solid fa-lightbulb text-amber-500 shrink-0"></i>
            <span>${escapeHtml(hintStep)}</span>
          </div>
        ` : ''}
      </div>
    `;
    stream.appendChild(msgEl);
    stream.scrollTop = stream.scrollHeight;
    chatHistory.push({ role: 'tutor', text: guide });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 向後端請求啟發式引導，並支援多模型與動態保底引擎
  async function fetchAiTutorAdvice(userQuery = '') {
    ensureAiTutorModal();
    const stream = document.getElementById('ai-tutor-chat-stream');
    let loading = document.getElementById('ai-tutor-loading');

    if (!loading && stream) {
      loading = document.createElement('div');
      loading.id = 'ai-tutor-loading';
      loading.className = 'py-3 flex items-center justify-center gap-2 text-teal-700 text-xs font-bold';
      loading.innerHTML = '<span>🦉</span><span class="animate-pulse">貓頭鷹正在為你想下一步...</span>';
      stream.appendChild(loading);
      stream.scrollTop = stream.scrollHeight;
    } else if (loading) {
      loading.style.display = 'flex';
      stream.appendChild(loading);
    }

    let rendered = false;

    try {
      const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://learning.ifit.myds.me:4061/api';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const res = await fetch(`${baseUrl}/ai-tutor/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          subject: activeContext.subject,
          question: activeContext.question,
          options: activeContext.options,
          studentAnswer: activeContext.studentAnswer,
          correctAnswer: activeContext.correctAnswer,
          hint: activeContext.hint,
          explanation: activeContext.explanation,
          unit: activeContext.unit,
          attemptCount: activeContext.attemptCount,
          chatHistory,
          userQuery
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.guide) {
          if (loading) loading.remove();
          appendTutorMessage({
            guide: data.guide,
            hintStep: data.hintStep,
            source: data.source
          });
          rendered = true;
        }
      }
    } catch (err) {
      console.warn('AI 助教連線異常或超時，自動切換至本機動態題幹保底引擎:', err.message);
    } finally {
      if (!rendered) {
        if (loading) loading.remove();
        const fallback = getClientFallbackGuidance(userQuery);
        appendTutorMessage({
          guide: fallback.guide,
          hintStep: fallback.hintStep,
          source: 'client-pedagogical-engine'
        });
      }
    }
  }

  // 全域公開呼叫介面
  window.openAiTutorModal = function({
    subject = 'math',
    question = '',
    options = [],
    studentAnswer = '',
    correctAnswer = '',
    hint = '',
    explanation = '',
    unit = '',
    attemptCount = 1
  } = {}) {
    const rawQuestion = String(question || '').trim();
    activeContext = {
      subject: subject || 'math',
      question: rawQuestion,
      options: Array.isArray(options) ? options : [],
      studentAnswer: String(studentAnswer || '').trim(),
      correctAnswer: String(correctAnswer || '').trim(),
      hint: String(hint || '').trim(),
      explanation: String(explanation || '').trim(),
      unit: String(unit || '').trim(),
      attemptCount: Number(attemptCount) || 1
    };

    chatHistory = []; // 每次開啟新題目，重設對話歷程

    const modal = ensureAiTutorModal();
    const preview = document.getElementById('ai-tutor-question-preview');
    if (preview) {
      preview.textContent = rawQuestion ? `📝 當前題目：${rawQuestion}` : '📝 正在檢視目前題目...';
    }

    const stream = document.getElementById('ai-tutor-chat-stream');
    if (stream) stream.innerHTML = ''; // 清空上一題的聊天記錄

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    fetchAiTutorAdvice();
  };
})();
