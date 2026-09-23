// 全站共用設定：唯一的 API_BASE_URL 來源。
// 這個檔案必須在 app.js / nature.js / math.html 的內嵌 script 之前載入，
// 這幾支檔案都會直接使用這裡定義的全域常數，不再各自宣告一份。
// 之後如果要切換環境（例如本機開發用 http://localhost:4060/api），只需要改這一個地方。
const API_BASE_URL = 'https://learning.ifit.myds.me:4061/api';

// Google OAuth 2.0 Web Client ID (家長登入使用)
const GOOGLE_CLIENT_ID = '348668007512-mosn8igdq98m4ogop7q1vtb4jjoe1fla.apps.googleusercontent.com';

// 登入狀態持久化記憶（支援電腦版與手機版關閉瀏覽器後重開免重複登入）
(function() {
  try {
    const authKeys = ['g6_portal_user', 'g6_guardian_user', 'g6_guardian_token'];
    
    // 1. 若 sessionStorage 為空但 localStorage 有紀錄（例如重新開啟瀏覽器/分頁），自動還原
    authKeys.forEach(key => {
      const persistentVal = localStorage.getItem(key);
      if (persistentVal && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, persistentVal);
      }
    });

    // 2. 增強 sessionStorage.setItem 與 removeItem，實現自動雙向持久化同步
    const origSetItem = sessionStorage.setItem.bind(sessionStorage);
    const origRemoveItem = sessionStorage.removeItem.bind(sessionStorage);

    sessionStorage.setItem = function(key, val) {
      origSetItem(key, val);
      if (authKeys.includes(key)) {
        try { localStorage.setItem(key, val); } catch (e) {}
      }
    };

    sessionStorage.removeItem = function(key) {
      origRemoveItem(key);
      if (authKeys.includes(key)) {
        try { localStorage.removeItem(key); } catch (e) {}
      }
    };
  } catch (err) {
    console.warn('Auth persistence initialization error:', err);
  }
})();
