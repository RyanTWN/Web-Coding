/**
 * 酷學習 (Cool Learning) - AI 蘇格拉底智能學科助教前端元件 (ai-tutor.js)
 * 在學生做錯或遇到難題時，提供啟發式思考引導（絕不直接給出答案）。
 * 支援全站各學科（數學、自然、國語、社會、英語），具備端點自動連線與本機即時保底規則引擎。
 */

(function() {
  'use strict';

  let activeContext = {
    subject: 'math',
    question: '',
    options: [],
    studentAnswer: '',
    attemptCount: 1
  };

  // 本機端智慧啟發式規則庫（網路延遲、離線或 API 逾時之即時保底引擎）
  function getClientFallbackGuidance({ subject = 'math', question = '', studentAnswer = '' }) {
    const qLower = String(question || '').toLowerCase();

    if (subject === 'math') {
      if (qLower.includes('公因數') || qLower.includes('公倍數') || qLower.includes('質因數') || qLower.includes('短除法')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '先別急著猜答案喔！我們可以先用「短除法」列出這兩個數字的共同質因數。\n\n💡 想想看：要找的是「能同時整除它們的最大數字」，還是「它們共同的倍數」呢？試著在草稿紙把質因數相乘看看！',
          hintStep: '步驟一：觀察兩個數能否同時被 2、3、5 整除，列出短除法。'
        };
      }
      if (qLower.includes('速率') || qLower.includes('時速') || qLower.includes('距離') || qLower.includes('時間')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '還記得速率三兄弟的三角關係嗎？\n\n💡 距離 ＝ 速率 × 時間。\n先檢查題目給的單位：時間是「小時」還是「分鐘」？距離是「公里」還是「公尺」？先統一單位再計算就不會算錯囉！',
          hintStep: '步驟一：確認「時間單位」與「速率單位」是否一致。'
        };
      }
      if (qLower.includes('圓') || qLower.includes('扇形') || qLower.includes('3.14') || qLower.includes('半徑') || qLower.includes('直徑')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '計算圓形或扇形時，最容易看錯的是「直徑」還是「半徑」喔！\n\n💡 圓面積是「半徑 × 半徑 × 3.14」，圓周長則是「直徑 × 3.14」。\n題目問的是面積還是周長？給你的線索是半徑還是直徑呢？',
          hintStep: '步驟一：先把直徑換算成半徑，再套入公式。'
        };
      }
      if (qLower.includes('柱體') || qLower.includes('表面積') || qLower.includes('體積') || qLower.includes('圓柱') || qLower.includes('角柱')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '柱體體積的秘密口訣是：底面積 × 柱高！\n\n💡 如果算表面積，記得要拆成「2 個底面積 ＋ 側面積（底面周長 × 柱高）」。先在草稿紙畫出展開圖會更清楚喔！',
          hintStep: '步驟一：先算出底面底形（三角形或圓形）的面積。'
        };
      }
      if (qLower.includes('分數') || qLower.includes('小數') || qLower.includes('除法') || qLower.includes('倒數')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '分數除法的小口訣：「除以一個分數，等於乘以它的倒數」！\n\n💡 小數除法要記得先把除數變成整數，被除數的小數點跟著往右移相同的位數喔！',
          hintStep: '步驟一：檢查除數的小數點是否已經移乾淨，再進行計算。'
        };
      }
      if (qLower.includes('比') || qLower.includes('比值') || qLower.includes('比例尺')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '「比」是前項比後項，而「比值」就是前項除以後項！\n\n💡 前後項同乘或同除以一個不為 0 的數，比值都不會改變喔！試著化為最簡整數比看看。',
          hintStep: '步驟一：先把兩邊的單位化為一致，再算比值。'
        };
      }
      return {
        title: '🦉 貓頭鷹小助教提點',
        guide: `這題的題目條件很豐富喔！\n\n💡 試著把題目裡的已知數字在草稿紙圈起來，列成關係算式。\n剛剛填寫的「${studentAnswer || '這個答案'}」可能在哪個運算步驟或單位漏看了呢？靜下心再檢驗一次！`,
        hintStep: '步驟一：先列出已知與未知的關係算式，再逐步反求答案。'
      };
    }

    if (subject === 'nature') {
      if (qLower.includes('水溶液') || qLower.includes('酸') || qLower.includes('鹼') || qLower.includes('石蕊') || qLower.includes('紫色高麗菜')) {
        return {
          title: '🦉 貓頭鷹實驗小助教',
          guide: '回想一下自然課實驗室的情境！\n\n💡 藍色石蕊試紙變紅代表「酸性」；紅色石蕊試紙變藍代表「鹼性」（口訣：藍色像大海一樣鹹/鹼）。如果是檸檬酸或白醋，試紙會呈現什麼顏色呢？',
          hintStep: '實驗線索：酸性讓藍變紅，鹼性讓紅變藍，中性兩者皆不變。'
        };
      }
      if (qLower.includes('熱') || qLower.includes('傳導') || qLower.includes('對流') || qLower.includes('輻射') || qLower.includes('保溫')) {
        return {
          title: '🦉 貓頭鷹實驗小助教',
          guide: '熱的傳播有三種方式：傳導、對流與輻射！\n\n💡 固體接觸主要靠「傳導」，液體和氣體流動靠「對流」，不需要介質直接照耀的是「輻射」。保溫瓶是用什麼方法阻隔熱能散失的呢？',
          hintStep: '實驗線索：真空間隔能同時阻斷傳導與對流。'
        };
      }
      if (qLower.includes('天氣') || qLower.includes('鋒面') || qLower.includes('水循環') || qLower.includes('蒸發') || qLower.includes('凝結')) {
        return {
          title: '🦉 貓頭鷹氣象小助教',
          guide: '觀察天氣圖上的符號！\n\n💡 藍色三角形鋸齒是「冷鋒」，代表冷空氣推動；紅色半圓形是「暖鋒」。水蒸氣遇冷變成水滴叫「凝結」，水受熱變成水蒸氣叫「蒸發」喔！',
          hintStep: '氣象線索：冷空氣密度大沉在下方，促使暖空氣抬升成雲致雨。'
        };
      }
      return {
        title: '🦉 貓頭鷹實驗小助教',
        guide: '自然科學的關鍵在於觀察變因與生活經驗！\n\n💡 想想看生活中的自然現象或課本上的對照實驗，哪個選項最符合科學原理呢？',
        hintStep: '思考線索：找出操縱變因與不變的控制變因。'
      };
    }

    if (subject === 'chinese' || subject === 'social') {
      return {
        title: '🦉 貓頭鷹學科小助教',
        guide: '閱讀題目的語境是解題的金鑰匙！\n\n💡 句子前後文要表達的是褒義（稱讚）還是貶義（批評）？觀察前後句的因果關係，答案往往就藏在題幹的關鍵字裡！',
        hintStep: '推敲線索：分析題幹前後文的情緒脈絡與歷史時間軸。'
      };
    }

    return {
      title: '🦉 貓頭鷹小助教提點',
      guide: '好問題！做錯是學習最強大的催化劑。\n\n💡 先把題目拆解成兩個小問題，你覺得第一步應該先確認什麼線索呢？',
      hintStep: '靜下心重新審題，成功就在下一步！'
    };
  }

  // 動態建立或取得 AI 助教對話彈窗 DOM
  function ensureAiTutorModal() {
    let modal = document.getElementById('ai-tutor-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ai-tutor-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-200';
    // 嚴格使用 inline style 確保跨瀏覽器與 CSS 樣式庫獨立性（避免 precompiled Tailwind 缺 class 導致隱形）
    modal.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 999999; display: none; align-items: center; justify-content: center; padding: 1rem;';

    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-5 sm:p-7 max-w-lg w-full shadow-2xl border border-teal-200 relative overflow-hidden text-left" style="max-height: 90vh; display: flex; flex-direction: column;">
        <!-- 頂部裝飾光暈 -->
        <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-teal-200/40 pointer-events-none" style="filter: blur(24px);"></div>

        <!-- 標題列 -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
              🦉
            </div>
            <div>
              <h3 id="ai-tutor-title" class="text-base sm:text-lg font-black text-slate-800 leading-tight">AI 貓頭鷹小助教</h3>
              <p class="text-[11px] text-teal-700 font-bold">蘇格拉底啟發式解題思維引導</p>
            </div>
          </div>
          <button type="button" id="ai-tutor-close-btn" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="關閉">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        <!-- 內容滾動區 -->
        <div class="flex-1 overflow-y-auto space-y-3.5 pr-1">
          <!-- 題目摘要預覽 -->
          <div id="ai-tutor-question-preview" class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed">
            題目載入中...
          </div>

          <!-- AI 思考中動畫 -->
          <div id="ai-tutor-loading" class="py-6 flex flex-col items-center justify-center gap-2.5 text-teal-700">
            <div class="flex items-center gap-2 text-2xl animate-bounce">
              <span>🦉</span>
              <span class="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping"></span>
            </div>
            <span class="text-xs font-bold tracking-wide">貓頭鷹小助教正在為你推敲思考線索...</span>
          </div>

          <!-- AI 引導內容卡 -->
          <div id="ai-tutor-content-box" class="space-y-3" style="display: none;">
            <div class="p-4 bg-teal-50/90 border border-teal-200/80 rounded-xl text-slate-800 text-xs sm:text-sm leading-relaxed space-y-2.5 shadow-xs">
              <div id="ai-tutor-guide-text" class="whitespace-pre-line font-medium text-slate-700"></div>
            </div>
            <div id="ai-tutor-hint-step" class="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-bold flex items-center gap-2">
              <i class="fa-solid fa-lightbulb text-amber-500 shrink-0"></i>
              <span id="ai-tutor-step-text"></span>
            </div>
          </div>

          <!-- 追問輸入區 -->
          <div id="ai-tutor-interactive-box" class="pt-2 border-t border-slate-100 space-y-2" style="display: none;">
            <div class="flex gap-2">
              <input type="text" id="ai-tutor-input-query" placeholder="還有哪一步想不通？問問小助教..." class="flex-1 py-2 px-3 text-xs rounded-xl border border-slate-300 focus:border-teal-500 focus:outline-none">
              <button type="button" id="ai-tutor-btn-send" class="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0">
                發問
              </button>
            </div>
          </div>
        </div>

        <!-- 底部關閉按鈕 -->
        <div class="pt-3 mt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button type="button" id="ai-tutor-btn-finish" class="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer">
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

  // 向後端請求啟發式引導，並支援逾時自動降級保底
  async function fetchAiTutorAdvice(userQuery = '') {
    const modal = ensureAiTutorModal();
    const loading = document.getElementById('ai-tutor-loading');
    const contentBox = document.getElementById('ai-tutor-content-box');
    const interactiveBox = document.getElementById('ai-tutor-interactive-box');
    const guideText = document.getElementById('ai-tutor-guide-text');
    const stepText = document.getElementById('ai-tutor-step-text');

    if (loading) loading.style.display = 'flex';
    if (contentBox) contentBox.style.display = 'none';
    if (interactiveBox) interactiveBox.style.display = 'none';

    // 取得本機保底內容
    const fallbackData = getClientFallbackGuidance({
      subject: activeContext.subject,
      question: activeContext.question,
      studentAnswer: activeContext.studentAnswer
    });

    let rendered = false;

    try {
      const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'https://learning.ifit.myds.me:4061/api';

      // 設置 5 秒超時控制器，避免網路卡住
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${baseUrl}/ai-tutor/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          subject: activeContext.subject,
          question: activeContext.question,
          options: activeContext.options,
          studentAnswer: activeContext.studentAnswer,
          attemptCount: activeContext.attemptCount,
          userQuery
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          if (guideText) guideText.textContent = data.guide || fallbackData.guide;
          if (stepText) stepText.textContent = data.hintStep || fallbackData.hintStep;
          if (contentBox) contentBox.style.display = 'block';
          if (interactiveBox) interactiveBox.style.display = 'block';
          rendered = true;
        }
      }
    } catch (err) {
      console.warn('AI 助教連線異常或超時，自動啟用本機智慧保底引擎:', err.message);
    } finally {
      if (!rendered) {
        // 使用本機智慧保底引擎渲染
        if (guideText) guideText.textContent = fallbackData.guide;
        if (stepText) stepText.textContent = fallbackData.hintStep;
        if (contentBox) contentBox.style.display = 'block';
        if (interactiveBox) interactiveBox.style.display = 'block';
      }
      if (loading) loading.style.display = 'none';
    }
  }

  // 全域公開呼叫介面
  window.openAiTutorModal = function({ subject = 'math', question = '', options = [], studentAnswer = '', attemptCount = 1 } = {}) {
    const rawQuestion = String(question || '').trim();
    activeContext = {
      subject: subject || 'math',
      question: rawQuestion,
      options: Array.isArray(options) ? options : [],
      studentAnswer: String(studentAnswer || '').trim(),
      attemptCount: Number(attemptCount) || 1
    };

    const modal = ensureAiTutorModal();
    const preview = document.getElementById('ai-tutor-question-preview');
    if (preview) {
      preview.textContent = rawQuestion ? `📝 當前題目：${rawQuestion}` : '📝 正在檢視目前題目...';
    }

    // 顯式展示彈窗（雙重保證 class 與 inline style）
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    fetchAiTutorAdvice();
  };
})();
