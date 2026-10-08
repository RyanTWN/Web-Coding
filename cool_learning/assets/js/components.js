/**
 * 酷學習 (Cool Learning) 全域共用 UI 元件庫 (components.js)
 * 提供全站統一的 Toast 提示、確認彈窗、全域 Header 同步與學習連續天數計算。
 */

// 1. 全域共用 Toast 提示函式（相容各科目歷史呼叫參數）
function showGlobalToast(message, option = 'info') {
  let toastContainer = document.getElementById('toast-container');
  let toastInner = document.getElementById('toast-inner');
  let toastIcon = document.getElementById('toast-icon');
  let toastText = document.getElementById('toast-text');

  // 若目前頁面缺少 Toast 結構，動態建立注入 body
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed left-1/2 top-1/2 max-w-[90vw] pointer-events-none opacity-0 transition-all duration-300';
    toastContainer.style.cssText = 'z-index: 9999999; transform: translate(-50%, -50%) scale(0.9);';
    toastContainer.innerHTML = `
      <div id="toast-inner" style="background: rgba(15, 23, 42, 0.82) !important; -webkit-backdrop-filter: blur(16px) saturate(180%) !important; backdrop-filter: blur(16px) saturate(180%) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08) !important; border-radius: 20px !important; padding: 14px 26px !important; display: flex; align-items: center; gap: 14px;">
        <i id="toast-icon" class="fa-solid fa-circle-info text-amber-300" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255, 255, 255, 0.12); display: inline-flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0;"></i>
        <span id="toast-text" style="color: #ffffff !important; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; line-height: 1.5; max-width: min(75vw, 360px); text-align: left;">訊息通知</span>
      </div>
    `;
    document.body.appendChild(toastContainer);
    toastInner = document.getElementById('toast-inner');
    toastIcon = document.getElementById('toast-icon');
    toastText = document.getElementById('toast-text');
  }

  if (toastText) toastText.textContent = message;

  // 圖標與色調判斷（相容 FontAwesome 類別或語義色彩）
  if (toastIcon) {
    if (typeof option === 'string' && option.startsWith('fa-')) {
      toastIcon.className = `fa-solid ${option} text-amber-300`;
    } else {
      const toneMap = {
        success: { icon: 'fa-circle-check', color: 'text-emerald-400' },
        warning: { icon: 'fa-triangle-exclamation', color: 'text-amber-400' },
        danger: { icon: 'fa-circle-xmark', color: 'text-rose-400' },
        error: { icon: 'fa-circle-xmark', color: 'text-rose-400' },
        rose: { icon: 'fa-heart', color: 'text-rose-400' },
        info: { icon: 'fa-circle-info', color: 'text-sky-300' },
        slate: { icon: 'fa-circle-info', color: 'text-slate-300' }
      };
      const config = toneMap[option] || toneMap.info;
      toastIcon.className = `fa-solid ${config.icon} ${config.color}`;
    }
  }

  // 彈跳動畫展現
  toastContainer.style.opacity = '1';
  toastContainer.style.transform = 'translate(-50%, -50%) scale(1)';

  if (window._globalToastTimer) clearTimeout(window._globalToastTimer);
  window._globalToastTimer = setTimeout(() => {
    if (toastContainer) {
      toastContainer.style.opacity = '0';
      toastContainer.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }
  }, 2300);
}

// 2. 全域共用確認對話框 (Confirm Modal)
let _globalModalCallback = null;
function showGlobalConfirmModal({ title = '確定要執行嗎？', desc = '此動作無法復原，請確認是否繼續。', icon = 'fa-triangle-exclamation', confirmText = '確認', cancelText = '取消', onConfirm = null }) {
  let modal = document.getElementById('custom-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'custom-modal';
    modal.className = 'fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/60 text-center card-flip-enter">
        <div class="w-14 h-14 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
          <i id="modal-icon" class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 id="modal-title" class="text-xl font-bold text-slate-800 mb-2">確定要執行嗎？</h3>
        <p id="modal-desc" class="text-xs text-slate-500 mb-6 leading-relaxed">此動作無法復原，請確認是否繼續。</p>
        <div class="flex gap-3">
          <button id="modal-cancel-btn" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">取消</button>
          <button id="modal-confirm-btn" class="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-md transition-colors">確認</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
      modal.classList.add('hidden');
      if (typeof _globalModalCallback === 'function') _globalModalCallback();
    });
  }

  const titleEl = document.getElementById('modal-title');
  const descEl = document.getElementById('modal-desc');
  const iconEl = document.getElementById('modal-icon');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');

  if (titleEl) titleEl.textContent = title;
  if (descEl) descEl.textContent = desc;
  if (iconEl) iconEl.className = `fa-solid ${icon}`;
  if (confirmBtn) confirmBtn.textContent = confirmText;
  if (cancelBtn) cancelBtn.textContent = cancelText;

  _globalModalCallback = onConfirm;
  modal.classList.remove('hidden');
}

// 3. 全域 Header 身分同步函式
function syncGlobalHeaderBadge() {
  try {
    const rawUser = sessionStorage.getItem('g6_portal_user') || localStorage.getItem('g6_portal_user');
    const badge = document.getElementById('user-profile-badge');
    const nameEl = document.getElementById('header-user-name');
    const seatEl = document.getElementById('header-user-seat');

    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (nameEl) nameEl.textContent = user.name || '學生';
      if (seatEl) seatEl.textContent = `座號: ${user.seat_no || user.seat || '-'}`;
      if (badge) badge.classList.remove('hidden');
    }
  } catch (e) {
    console.debug('Header badge sync skipped:', e);
  }
}

// 4. 計算連續學習天數 (Streak) 工具函式
function calculateLearningStreak(dateSetOrArray) {
  if (!dateSetOrArray) return { currentStreak: 0, maxStreak: 0 };
  const dates = Array.from(dateSetOrArray instanceof Set ? dateSetOrArray : dateSetOrArray)
    .filter(Boolean)
    .map(d => String(d).slice(0, 10))
    .sort();

  if (dates.length === 0) return { currentStreak: 0, maxStreak: 0 };

  const uniqueSorted = Array.from(new Set(dates));
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // 產生標準 YYYY-MM-DD
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = formatYMD(today);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);

  // 判斷今日或昨日是否有打卡以延續 streak
  const hasToday = uniqueSorted.includes(todayStr);
  const hasYesterday = uniqueSorted.includes(yesterdayStr);

  if (hasToday || hasYesterday) {
    let checkDate = hasToday ? new Date(today) : new Date(yesterday);
    while (true) {
      const dStr = formatYMD(checkDate);
      if (uniqueSorted.includes(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 計算歷史最長連續天數
  let prevDate = null;
  for (const dStr of uniqueSorted) {
    const curDate = new Date(dStr);
    if (prevDate) {
      const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;
    prevDate = curDate;
  }

  return { currentStreak, maxStreak };
}

// 頁面載入時自動同步 Header
document.addEventListener('DOMContentLoaded', syncGlobalHeaderBadge);
