/**
 * 酷學習 (Cool Learning) 雙軌介面切換器 (Feature Flag Controller)
 * 支援「現代極簡磨砂 (modern)」與「經典漫畫風 (classic)」雙版本無縫隨時切換。
 */
(function() {
  const THEME_STORAGE_KEY = 'cool_learning_ui_theme_v2';
  const DEFAULT_THEME = 'modern'; // 預設使用全新 Apple Bento Grid 旗艦介面

  // 1. 取得當前主題偏好（優先支援 URL 參數 ?ui=modern 或 ?ui=classic 覆蓋）
  function getPreferredTheme() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTheme = urlParams.get('ui');
      if (urlTheme === 'classic' || urlTheme === 'modern') {
        localStorage.setItem(THEME_STORAGE_KEY, urlTheme);
        return urlTheme;
      }
      // 若曾儲存過舊版 key，清除之以確保新版 Apple 旗艦風格第一時間呈現
      if (localStorage.getItem('cool_learning_ui_theme')) {
        localStorage.removeItem('cool_learning_ui_theme');
      }
      return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  // 2. 套用主題到 <html> 與 <body>
  function applyTheme(theme) {
    const isModern = (theme === 'modern');
    document.documentElement.setAttribute('data-theme', theme);
    if (document.body) {
      document.body.classList.toggle('theme-modern', isModern);
      document.body.classList.toggle('theme-classic', !isModern);
    }
    updateToggleButtons(theme);
  }

  // 3. 更新頁面上所有切換按鈕的文字與圖標
  function updateToggleButtons(theme) {
    const isModern = (theme === 'modern');
    document.querySelectorAll('.btn-ui-theme-toggle').forEach(btn => {
      btn.setAttribute('aria-pressed', isModern ? 'true' : 'false');
      const icon = btn.querySelector('.theme-toggle-icon');
      const text = btn.querySelector('.theme-toggle-text');
      if (icon) {
        icon.className = isModern
          ? 'fa-solid fa-wand-magic-sparkles text-indigo-500 theme-toggle-icon'
          : 'fa-solid fa-palette text-amber-500 theme-toggle-icon';
      }
      if (text) {
        text.textContent = isModern ? '新版微光' : '經典風';
      }
      btn.title = isModern ? '目前為新版微光介面，點擊切換為經典版' : '目前為經典介面，點擊切換為新版微光';
    });
  }

  // 4. 對外公開之全域切換函式
  window.toggleUiTheme = function() {
    const current = getPreferredTheme();
    const nextTheme = (current === 'modern') ? 'classic' : 'modern';

    const update = () => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (e) {}
      applyTheme(nextTheme);
      
      // 友善 Toast 提示
      const toastText = nextTheme === 'modern'
        ? '✨ 已切換為「新版商業微光介面」'
        : '🎨 已切換為「經典風格介面」';
      if (typeof window.showToast === 'function') {
        window.showToast(toastText, nextTheme === 'modern' ? 'fa-wand-magic-sparkles' : 'fa-palette');
      }
    };

    // 支援原生 View Transitions API 絲滑變換
    if (document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  };

  window.getUiTheme = getPreferredTheme;

  // =========================================================================
  // 每日任務寶箱與鑽石資產管理 (支援每日限領一次、防重複點擊、狀態持久化)
  // =========================================================================
  function getTodayKey() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
    } catch (e) {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
  }

  function getCurrentUserKey() {
    try {
      const user = JSON.parse(sessionStorage.getItem('g6_portal_user') || localStorage.getItem('g6_portal_user') || 'null');
      return (user && user.seatNo) ? `user_${user.seatNo}` : 'default';
    } catch (e) {
      return 'default';
    }
  }

  function getUserDiamonds() {
    try {
      const key = `g6_diamonds_${getCurrentUserKey()}`;
      const saved = localStorage.getItem(key);
      if (saved !== null && !isNaN(parseInt(saved, 10))) {
        return parseInt(saved, 10);
      }
    } catch (e) {}
    return 380; // 系統預設起始鑽石資產
  }

  function setUserDiamonds(amount) {
    try {
      const key = `g6_diamonds_${getCurrentUserKey()}`;
      localStorage.setItem(key, String(amount));
    } catch (e) {}
    updateDiamondDisplay(amount);
  }

  function isDailyChestClaimedToday() {
    try {
      const key = `g6_daily_chest_${getCurrentUserKey()}_date`;
      return localStorage.getItem(key) === getTodayKey();
    } catch (e) {
      return false;
    }
  }

  function markDailyChestClaimedToday() {
    try {
      const key = `g6_daily_chest_${getCurrentUserKey()}_date`;
      localStorage.setItem(key, getTodayKey());
    } catch (e) {}
  }

  function updateDiamondDisplay(amount) {
    const text = `${amount} 鑽`;
    document.querySelectorAll('#user-diamond-count, .user-diamond-display').forEach(el => {
      el.textContent = text;
    });
    document.querySelectorAll('.island-chip[title*="鑽石"] span').forEach(el => {
      el.textContent = text;
    });
  }

  function initDailyChestUI() {
    const isClaimed = isDailyChestClaimedToday();
    const currentDiamonds = getUserDiamonds();
    updateDiamondDisplay(currentDiamonds);

    const chestBtns = document.querySelectorAll('.island-btn-claim, #btn-daily-chest');
    chestBtns.forEach(btn => {
      if (isClaimed) {
        btn.classList.add('is-claimed');
        btn.setAttribute('aria-disabled', 'true');
        btn.title = '今天已開過寶箱囉！';
        const textSpan = btn.querySelector('span');
        if (textSpan) {
          textSpan.textContent = '今日已領取 (50 鑽)';
        }
      } else {
        btn.classList.remove('is-claimed');
        btn.removeAttribute('aria-disabled');
        btn.title = '點擊開啟每日寶箱獲取 50 鑽';
        const textSpan = btn.querySelector('span');
        if (textSpan) {
          textSpan.textContent = '領取每日寶箱 (50 鑽)';
        }
      }
    });
  }

  // 每日任務寶箱領取互動回饋
  window.claimDailyReward = function() {
    // 1. 若今日已開啟過寶箱，不可重複領取，並跳出指定提示
    if (isDailyChestClaimedToday()) {
      const alreadyMsg = '今天已開過寶箱囉！';
      if (typeof window.showToast === 'function') {
        window.showToast(alreadyMsg, 'fa-clock');
      } else {
        alert(alreadyMsg);
      }
      return;
    }

    // 2. 今日首次開啟：鑽石增加 50 並標記今日已領取
    const currentDiamonds = getUserDiamonds();
    const newDiamonds = currentDiamonds + 50;
    setUserDiamonds(newDiamonds);
    markDailyChestClaimedToday();

    // 3. 按鈕即刻變淡為不可點擊狀態
    initDailyChestUI();

    // 4. 跳出獲得獎勵提示
    const msg = '🎉 太棒了！已領取今日每日寶箱！獲得 💎 50 鑽石 ＋ 雙倍經驗卡！';
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'fa-gift');
    } else {
      alert(msg);
    }
  };

  // 測試輔助工具：重置今日寶箱與鑽石數值（便於驗證）
  window.resetDailyChestForTesting = function() {
    try {
      localStorage.removeItem(`g6_daily_chest_${getCurrentUserKey()}_date`);
      localStorage.setItem(`g6_diamonds_${getCurrentUserKey()}`, '380');
      initDailyChestUI();
      console.log('✅ 每日寶箱已重置為未領取狀態，鑽石已恢復預設 380 鑽');
    } catch (e) {}
  };

  // =========================================================================
  // 每日測驗鑽石獎勵機制
  // 規則：完成每日測驗得 50 鑽；若測驗成績為 100 分得 60 鑽。
  // 每日每科目僅能領取一次；若先前未得 100 分而領過 50 顆，下次測驗若得 100 分可再多領 10 顆。
  // =========================================================================
  const SUBJECT_DISPLAY_NAMES = {
    chinese: '國語',
    math: '數學',
    english: '英語',
    nature: '自然',
    social: '社會'
  };

  function awardQuizDiamonds(subject, score) {
    const subKey = String(subject || 'general').toLowerCase();
    const subjectName = SUBJECT_DISPLAY_NAMES[subKey] || '各科';
    const today = getTodayKey();
    const userKey = getCurrentUserKey();
    const storageKey = `g6_quiz_diamonds_${userKey}_${subKey}_${today}`;
    
    let previouslyAwarded = 0;
    try {
      previouslyAwarded = parseInt(localStorage.getItem(storageKey) || '0', 10);
      if (isNaN(previouslyAwarded)) previouslyAwarded = 0;
    } catch (e) {
      previouslyAwarded = 0;
    }

    const numericScore = (typeof score === 'number') ? score : (parseInt(String(score).replace(/[^\d]/g, ''), 10) || 0);
    const isPerfectScore = (numericScore === 100);

    let awarded = 0;
    let newAwardedTotal = previouslyAwarded;
    let status = 'none'; // 'first_50', 'first_60', 'bonus_10', 'already_claimed'
    let message = '';

    if (isPerfectScore) {
      if (previouslyAwarded === 0) {
        // 今日首次測驗且直接達 100 分滿分：獲得 60 顆鑽石
        awarded = 60;
        newAwardedTotal = 60;
        status = 'first_60';
        message = `🏆 太厲害了！【${subjectName}】每日測驗榮獲 100 分滿分！獲得最高獎勵 💎 60 顆鑽石！`;
      } else if (previouslyAwarded < 60) {
        // 之前未得 100 分已領過 50 顆，本次測驗達 100 分：加碼多領 10 顆
        awarded = 60 - previouslyAwarded; // 10
        newAwardedTotal = 60;
        status = 'bonus_10';
        message = `🏆 恭喜挑戰 100 分滿分成功！【${subjectName}】加碼多領 💎 ${awarded} 顆鑽石！（今日累計 60 鑽）`;
      } else {
        // 今日已領過 100 分滿分的 60 顆鑽石
        status = 'already_claimed';
        message = `🌟 今日【${subjectName}】已領取滿分 60 顆鑽石最高獎勵囉！繼續保持！`;
      }
    } else {
      // 測驗完成但未達 100 分
      if (previouslyAwarded === 0) {
        // 今日首次完成測驗：獲得 50 顆鑽石
        awarded = 50;
        newAwardedTotal = 50;
        status = 'first_50';
        message = `🎉 完成【${subjectName}】每日測驗！獲得 💎 50 顆鑽石！（若再戰 100 分滿分可再多領 10 顆喔！）`;
      } else {
        // 今日已領過 50 顆或 60 顆，未得 100 分不可重複領取
        status = 'already_claimed';
        if (previouslyAwarded < 60) {
          message = `今日【${subjectName}】已領過每日測驗 50 顆鑽石囉！若測驗達 100 分滿分可再多領 10 顆！`;
        } else {
          message = `今日【${subjectName}】已領取滿分 60 顆鑽石最高獎勵！`;
        }
      }
    }

    // 若有新增加的鑽石，更新資產並寫入 localStorage
    if (awarded > 0) {
      try {
        const currentDiamonds = getUserDiamonds();
        const newDiamonds = currentDiamonds + awarded;
        setUserDiamonds(newDiamonds);
        localStorage.setItem(storageKey, String(newAwardedTotal));
      } catch (e) {}
    }

    // 彈出通知提示 (Toast 或 Alert)
    if (typeof window.showToast === 'function') {
      const toastIcon = (status === 'first_60' || status === 'bonus_10') ? 'fa-crown' : (awarded > 0 ? 'fa-gem' : 'fa-circle-check');
      window.showToast(message, toastIcon);
    } else {
      alert(message);
    }

    // 在當前頁面的測驗結算視圖渲染精美獎勵橫幅
    try {
      renderQuizDiamondBanner(subKey, {
        subjectName,
        awarded,
        totalToday: newAwardedTotal,
        status,
        score: numericScore,
        isPerfectScore,
        message
      });
    } catch (e) {
      console.warn('渲染測驗鑽石橫幅失敗:', e);
    }

    return {
      awarded,
      totalToday: newAwardedTotal,
      status,
      message
    };
  }

  function renderQuizDiamondBanner(subject, info) {
    let banner = document.getElementById('quiz-diamond-reward-banner');
    if (!banner) {
      const candidates = [
        document.getElementById('quiz-final-score')?.parentElement,
        document.getElementById('result-today-total'),
        document.getElementById('result-summary-text'),
        document.getElementById('view-result')?.querySelector('.grid'),
        document.getElementById('view-idiom-quiz-result')?.querySelector('.grid')
      ];
      const target = candidates.find(el => el && el.parentElement);
      if (target && target.parentElement) {
        banner = document.createElement('div');
        banner.id = 'quiz-diamond-reward-banner';
        target.insertAdjacentElement('afterend', banner);
      }
    }

    if (banner) {
      let bg = 'bg-amber-50 border-amber-200 text-amber-900';
      let icon = 'fa-gem text-amber-500';
      let title = '💎 每日測驗鑽石獎勵';
      let sub = info.message;

      if (info.status === 'first_60') {
        bg = 'bg-gradient-to-r from-amber-50 to-yellow-100 border-amber-300 text-amber-900 shadow-sm';
        icon = 'fa-crown text-amber-500';
        title = '🏆 滿分最高榮譽！已獲得 💎 +60 顆鑽石';
        sub = '表現完美無瑕！已達今日該科最高鑽石獎勵。';
      } else if (info.status === 'bonus_10') {
        bg = 'bg-gradient-to-r from-amber-50 to-emerald-50 border-emerald-300 text-emerald-900 shadow-sm';
        icon = 'fa-wand-magic-sparkles text-emerald-600';
        title = '🎉 滿分加碼！補領 💎 +10 顆鑽石';
        sub = '勇於再次挑戰並榮獲 100 分滿分！今日該科已累計領滿 60 鑽。';
      } else if (info.status === 'first_50') {
        bg = 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-300 text-sky-900 shadow-sm';
        icon = 'fa-gem text-sky-500';
        title = '🎉 完成每日測驗！已獲得 💎 +50 顆鑽石';
        sub = '今日若再挑戰 100 分滿分，可再多領 10 顆鑽石喔！';
      } else {
        bg = 'bg-slate-50 border-slate-200 text-slate-700';
        icon = 'fa-circle-check text-slate-400';
        title = `✨ 今日測驗獎勵：已累計 ${info.totalToday} 顆鑽石`;
        sub = (info.totalToday < 60)
          ? '今日若再測驗達 100 分滿分，可再多領 10 顆鑽石！'
          : '今日已領取滿分 60 鑽最高獎勵，表現優異！';
      }

      banner.className = `my-3.5 p-3.5 rounded-xl border flex items-center gap-3 text-left transition-all ${bg}`;
      banner.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-xl shadow-xs flex-shrink-0">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-black text-sm">${title}</div>
          <div class="text-xs opacity-90 font-medium mt-0.5">${sub}</div>
        </div>
      `;
    }
  }

  // 測試專用：重置特定科目今日的測驗鑽石紀錄
  window.resetQuizDiamondsForTesting = function(subject) {
    try {
      const subKey = String(subject || 'general').toLowerCase();
      const storageKey = `g6_quiz_diamonds_${getCurrentUserKey()}_${subKey}_${getTodayKey()}`;
      localStorage.removeItem(storageKey);
      const banner = document.getElementById('quiz-diamond-reward-banner');
      if (banner) banner.remove();
      console.log(`✅ 已重置【${subKey}】今日測驗鑽石紀錄，可重新測試領取`);
    } catch (e) {}
  };

  // 測試專用：重置所有科目今日的測驗鑽石紀錄
  window.resetAllQuizDiamondsForTesting = function() {
    try {
      const subjects = ['chinese', 'math', 'english', 'nature', 'social'];
      subjects.forEach(s => window.resetQuizDiamondsForTesting(s));
      console.log('✅ 已重置所有科目今日測驗鑽石紀錄');
    } catch (e) {}
  };

  window.awardQuizDiamonds = awardQuizDiamonds;
  window.renderQuizDiamondBanner = renderQuizDiamondBanner;
  window.initDailyChestUI = initDailyChestUI;
  window.getUserDiamonds = getUserDiamonds;
  window.setUserDiamonds = setUserDiamonds;

  // 5. 立即執行一次，防範畫面閃爍 (FOUC)
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(initialTheme);
      initDailyChestUI();
    });
  } else {
    applyTheme(initialTheme);
    initDailyChestUI();
  }
})();
