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

  // 每日任務寶箱領取互動回饋
  window.claimDailyReward = function() {
    const msg = '🎉 太棒了！已領取今日每日寶箱！獲得 💎 50 鑽石 ＋ 雙倍經驗卡！';
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'fa-gift');
    } else {
      alert(msg);
    }
  };

  // 5. 立即執行一次，防範畫面閃爍 (FOUC)
  const initialTheme = getPreferredTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme(initialTheme);
    });
  } else {
    applyTheme(initialTheme);
  }
})();
