/**
 * 酷學習 (Cool Learning) - AI 蘇格拉底智能學科助教前端元件 (ai-tutor.js)
 * 在學生做錯或遇到難題時，提供啟發式思考引導（絕不直接給出答案）。
 */

(function() {
  let activeContext = {
    subject: 'math',
    question: '',
    options: [],
    studentAnswer: '',
    attemptCount: 1
  };

  // 動態建立 AI 助教對話彈窗 DOM
  function ensureAiTutorModal() {
    let modal = document.getElementById('ai-tutor-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ai-tutor-modal';
    modal.className = 'fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999999] hidden flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white/95 backdrop-blur-md rounded-2xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-teal-200 card-flip-enter relative overflow-hidden text-left">
        <!-- 頂部裝飾光暈 -->
        <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal-200/40 blur-2xl pointer-events-none"></div>

        <!-- 標題列 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-md">
              🦉
            </div>
            <div>
              <h3 id="ai-tutor-title" class="text-base sm:text-lg font-black text-slate-800 leading-tight">AI 貓頭鷹小助教</h3>
              <p class="text-[11px] text-teal-700 font-bold">蘇格拉底啟發式解題思維引導</p>
            </div>
          </div>
          <button type="button" id="ai-tutor-close-btn" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- 題目摘要預覽 -->
        <div id="ai-tutor-question-preview" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium mb-4 max-h-24 overflow-y-auto leading-relaxed">
          題目載入中...
        </div>

        <!-- AI 思考中動畫 -->
        <div id="ai-tutor-loading" class="py-6 flex flex-col items-center justify-center gap-3 text-teal-700">
          <div class="flex items-center gap-1.5 text-2xl animate-bounce">
            <span>🦉</span>
            <span class="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
          </div>
          <span class="text-xs font-bold tracking-wide">貓頭鷹小助教正在為你推敲思考線索...</span>
        </div>

        <!-- AI 引導內容卡 -->
        <div id="ai-tutor-content-box" class="hidden space-y-3 mb-4">
          <div class="p-4 bg-teal-50/90 border border-teal-200/80 rounded-xl text-slate-800 text-xs sm:text-sm leading-relaxed space-y-2.5">
            <div id="ai-tutor-guide-text" class="whitespace-pre-line font-medium text-slate-700"></div>
          </div>
          <div id="ai-tutor-hint-step" class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-bold flex items-center gap-2">
            <i class="fa-solid fa-lightbulb text-amber-500"></i>
            <span id="ai-tutor-step-text"></span>
          </div>
        </div>

        <!-- 追問輸入區 -->
        <div id="ai-tutor-interactive-box" class="hidden pt-2 border-t border-slate-100 space-y-2">
          <div class="flex gap-2">
            <input type="text" id="ai-tutor-input-query" placeholder="還有哪一步想不通？問問小助教..." class="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none">
            <button type="button" id="ai-tutor-btn-send" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
              發問
            </button>
          </div>
        </div>

        <!-- 底部關閉按鈕 -->
        <div class="pt-3 mt-3 border-t border-slate-100 flex justify-end">
          <button type="button" id="ai-tutor-btn-finish" class="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
            我知道該怎麼想了，再做一次！
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.classList.add('hidden');
    modal.querySelector('#ai-tutor-close-btn')?.addEventListener('click', close);
    modal.querySelector('#ai-tutor-btn-finish')?.addEventListener('click', close);

    // 追問發送事件
    modal.querySelector('#ai-tutor-btn-send')?.addEventListener('click', () => {
      const input = document.getElementById('ai-tutor-input-query');
      if (input && input.value.trim()) {
        const query = input.value.trim();
        input.value = '';
        fetchAiTutorAdvice(query);
      }
    });

    return modal;
  }

  // 向後端請求啟發式引導
  async function fetchAiTutorAdvice(userQuery = '') {
    const modal = ensureAiTutorModal();
    const loading = document.getElementById('ai-tutor-loading');
    const contentBox = document.getElementById('ai-tutor-content-box');
    const interactiveBox = document.getElementById('ai-tutor-interactive-box');
    const guideText = document.getElementById('ai-tutor-guide-text');
    const stepText = document.getElementById('ai-tutor-step-text');

    if (loading) loading.classList.remove('hidden');
    if (contentBox) contentBox.classList.add('hidden');
    if (interactiveBox) interactiveBox.classList.add('hidden');

    try {
      const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://learning.ifit.myds.me:4061/api';
      const res = await fetch(`${baseUrl}/ai-tutor/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeContext.subject,
          question: activeContext.question,
          options: activeContext.options,
          studentAnswer: activeContext.studentAnswer,
          attemptCount: activeContext.attemptCount,
          userQuery
        })
      });

      const data = await res.json();
      if (data.success) {
        if (guideText) guideText.textContent = data.guide || '試著回想課堂上的類似觀念，先在草稿紙畫出步驟圖！';
        if (stepText) stepText.textContent = data.hintStep || '跟著小助教的引導思考，再嘗試一次看看！';
        if (contentBox) contentBox.classList.remove('hidden');
        if (interactiveBox) interactiveBox.classList.remove('hidden');
      } else {
        if (guideText) guideText.textContent = '小助教正在翻閱知識百科，別灰心，先仔細重新閱讀題目關鍵字喔！';
        if (contentBox) contentBox.classList.remove('hidden');
      }
    } catch (err) {
      if (guideText) guideText.textContent = '做錯是學習的起點！先檢查算式的運算符號與單位，你一定可以想出來的！';
      if (contentBox) contentBox.classList.remove('hidden');
    } finally {
      if (loading) loading.classList.add('hidden');
    }
  }

  // 全域公開呼叫介面
  window.openAiTutorModal = function({ subject = 'math', question = '', options = [], studentAnswer = '', attemptCount = 1 }) {
    activeContext = { subject, question, options, studentAnswer, attemptCount };
    const modal = ensureAiTutorModal();
    const preview = document.getElementById('ai-tutor-question-preview');
    if (preview) {
      preview.textContent = `📝 當前題目：${question}`;
    }
    modal.classList.remove('hidden');
    fetchAiTutorAdvice();
  };
})();
