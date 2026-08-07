// 全局狀態管理
let currentUser = JSON.parse(sessionStorage.getItem('g6_portal_user')) || null;
let studentsList = JSON.parse(localStorage.getItem('g6_portal_students')) || [
  { name: "王小明", seatNo: "60101", created: "2026-07-01" },
  { name: "李小華", seatNo: "60102", created: "2026-07-01" },
  { name: "陳大文", seatNo: "60103", created: "2026-07-01" }
];

let today30Words = [];
let currentIndex = 0;
let starredIds = new Set();
let starredWordsMap = new Map(); 
let starredSpellingCounts = {};
let completedDates = new Set();
let learnedWordIds = new Set();
let calendarViewDate = new Date();
let modalCallback = null;
const API_BASE_URL = 'https://learning.ifit.myds.me:4061/api';
let progressSyncTimer = null;

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

function updateSyncStatus(text, className = 'text-slate-400') {
  const status = document.getElementById('sync-status');
  if (!status) return;
  status.textContent = text;
  status.className = `block text-[10px] font-bold ${className}`;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (currentUser?.token) headers.set('Authorization', `Bearer ${currentUser.token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && !path.endsWith('/login')) {
    currentUser = null;
    sessionStorage.removeItem('g6_portal_user');
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.assign('index.html?session=expired');
    }
  }
  return response;
}

// UI 通知系統 (加入防呆)
function showToast(text, iconClass = "fa-circle-info") {
  const container = document.getElementById('toast-container');
  if (!container) return; // 防呆：如果畫面沒有通知容器，就不執行
  
  document.getElementById('toast-text').textContent = text;
  document.getElementById('toast-icon').className = `fa-solid ${iconClass} text-amber-400 text-lg`;
  container.classList.remove('-translate-y-12', 'opacity-0', 'pointer-events-none');
  container.classList.add('translate-y-0', 'opacity-100');
  setTimeout(() => {
    container.classList.remove('translate-y-0', 'opacity-100');
    container.classList.add('-translate-y-12', 'opacity-0', 'pointer-events-none');
  }, 3000);
}

function openCustomModal(title, desc, onConfirm, iconClass = "fa-triangle-exclamation") {
  const modal = document.getElementById('custom-modal');
  if (!modal) return;
  
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-icon').className = `fa-solid ${iconClass}`;
  modalCallback = onConfirm;
  modal.classList.remove('hidden');
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }
}

// 核心功能 1: 從後端獲取單字
async function fetchDailyWordsFromCloud(studentId) {
    try {
        const response = await apiFetch(`/get-daily-words?studentId=${encodeURIComponent(studentId)}`);
        const result = await response.json().catch(() => ({}));
        
        if (response.ok && result.success) {
            console.log(`成功載入第 ${result.currentDay} 天的學習單字！`);
            return result.dailyWords; 
        } else {
            throw new Error(result.error || `伺服器回應 ${response.status}`);
        }
    } catch (error) {
        console.error("伺服器連線失敗", error);
        showToast(`今日單字載入失敗：${error.message}`, "fa-triangle-exclamation");
        return null;
    }
}

function saveStudentAppData() {
  if (!currentUser || currentUser.isAdmin) return;
  const seatNo = currentUser.seatNo;
  localStorage.setItem(`g6_vocab_starred_${seatNo}`, JSON.stringify([...starredIds]));
  localStorage.setItem(`g6_vocab_starred_detail_${seatNo}`, JSON.stringify([...starredWordsMap.values()])); 
  localStorage.setItem(`g6_vocab_starred_spelling_${seatNo}`, JSON.stringify(starredSpellingCounts));
  localStorage.setItem(`g6_vocab_completed_${seatNo}`, JSON.stringify([...completedDates]));
  localStorage.setItem(`g6_learned_ids_${seatNo}`, JSON.stringify([...learnedWordIds]));
  
  const todayStr = getTodayKey();
  localStorage.setItem(`g6_daily_words_${seatNo}_${todayStr}`, JSON.stringify(today30Words));
  localStorage.setItem(`g6_daily_index_${seatNo}_${todayStr}`, currentIndex);
  scheduleProgressSync();
}

function scheduleProgressSync() {
  clearTimeout(progressSyncTimer);
  progressSyncTimer = setTimeout(() => syncStudentProgressToCloud(), 500);
}

async function syncStudentProgressToCloud() {
  if (!currentUser || currentUser.isAdmin) return;

  const todayStr = getTodayKey();
  try {
    updateSyncStatus('同步中…', 'text-amber-600');
    const response = await apiFetch('/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatNo: currentUser.seatNo,
        learningDate: todayStr,
        currentWordIndex: currentIndex,
        completed: completedDates.has(todayStr),
        completedDates: [...completedDates],
        learnedWordIds: [...learnedWordIds],
        starredIds: [...starredIds],
        starredWords: [...starredWordsMap.values()],
        starredSpellingCounts
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    updateSyncStatus('已同步', 'text-emerald-600');
  } catch (error) {
    // localStorage 保留離線資料；下一次操作時會再次同步。
    console.error('學習進度同步失敗，已保留於本機等待重試', error);
    updateSyncStatus('等待網路重試', 'text-rose-600');
  }
}

async function loadStudentProgressFromCloud(seatNo) {
  try {
    updateSyncStatus('讀取雲端…', 'text-amber-600');
    const response = await apiFetch(`/student-progress?seatNo=${encodeURIComponent(seatNo)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success || !result.data) return null;
    updateSyncStatus('已連上雲端', 'text-emerald-600');
    return result.data;
  } catch (error) {
    console.error('雲端進度載入失敗，改用本機快取', error);
    updateSyncStatus('使用本機快取', 'text-rose-600');
    return null;
  }
}

async function loadStudentAppData(seatNo) {
  starredIds = new Set(JSON.parse(localStorage.getItem(`g6_vocab_starred_${seatNo}`)) || []);
  const savedStarredDetails = JSON.parse(localStorage.getItem(`g6_vocab_starred_detail_${seatNo}`)) || [];
  starredWordsMap = new Map(savedStarredDetails.map(w => [w.id, w])); 
  
  starredSpellingCounts = JSON.parse(localStorage.getItem(`g6_vocab_starred_spelling_${seatNo}`)) || {};
  completedDates = new Set(JSON.parse(localStorage.getItem(`g6_vocab_completed_${seatNo}`)) || []);
  learnedWordIds = new Set(JSON.parse(localStorage.getItem(`g6_learned_ids_${seatNo}`)) || []);

  const todayStr = getTodayKey();
  const cachedWords = JSON.parse(localStorage.getItem(`g6_daily_words_${seatNo}_${todayStr}`));
  const cachedIndex = localStorage.getItem(`g6_daily_index_${seatNo}_${todayStr}`);
  const cloudProgress = await loadStudentProgressFromCloud(seatNo);

  if (cloudProgress) {
    completedDates = new Set([...completedDates, ...(cloudProgress.completedDates || [])]);
    learnedWordIds = new Set([...learnedWordIds, ...(cloudProgress.learnedWordIds || [])]);
    // 收藏允許取消，因此有雲端狀態時以伺服器版本為準，避免舊裝置恢復已取消收藏。
    if (cloudProgress.updatedAt) {
      starredIds = new Set(cloudProgress.starredIds || []);
      starredWordsMap = new Map((cloudProgress.starredWords || []).map(word => [word.id, word]));
      starredSpellingCounts = cloudProgress.starredSpellingCounts || {};
    }
    if (Array.isArray(cloudProgress.quizHistory)) {
      localStorage.setItem(`g6_vocab_quiz_history_${seatNo}`, JSON.stringify(
        cloudProgress.quizHistory.map(item => ({
          modeName: item.mode,
          score: Number(item.score),
          timestamp: item.timestamp || '雲端紀錄'
        }))
      ));
    }
  }

  if (cachedWords && cachedWords.length > 0) {
    today30Words = cachedWords;
    const localIndex = cachedIndex ? parseInt(cachedIndex, 10) : 0;
    const cloudIndex = cloudProgress?.learningDate === todayStr ? Number(cloudProgress.currentWordIndex || 0) : 0;
    currentIndex = Math.max(localIndex, cloudIndex);
  } else {
    const dailyWords = await fetchDailyWordsFromCloud(seatNo);
    if (dailyWords === null) return;
    today30Words = dailyWords || [];
    currentIndex = cloudProgress?.learningDate === todayStr
      ? Number(cloudProgress.currentWordIndex || 0)
      : 0;
    saveStudentAppData(); 
  }

  if (today30Words.length === 0) {
    showToast("今日單字載入失敗，請確認伺服器連線", "fa-triangle-exclamation");
    return;
  }
  saveStudentAppData();
  renderCard();
}

// 畫面切換 (加入防呆)
function showView(viewId) {
  document.querySelectorAll('section[id^="view-"]').forEach(sec => sec.classList.add('hidden'));
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');

  const badge = document.getElementById('user-profile-badge');
  if (badge) {
      if (currentUser && viewId !== 'view-login') {
        badge.classList.remove('hidden');
        badge.classList.add('flex');
        const nameEl = document.getElementById('header-user-name');
        const seatEl = document.getElementById('header-user-seat');
        if(nameEl) nameEl.textContent = currentUser.name;
        if(seatEl) seatEl.textContent = currentUser.isAdmin ? '系統管理員' : `座號: ${currentUser.seatNo}`;
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
      }
  }
}

function switchAppTab(tabId) {
  document.body.dataset.englishTab = tabId;
  // 1. 隱藏所有內容區塊
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
  
  // 2. 將所有按鈕重置為「未選取」的平坦狀態
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-brand-500', 'text-white', 'shadow-comic', 'transform', '-translate-y-1');
    btn.classList.remove('is-active');
    btn.classList.add('text-slate-500', 'hover:text-slate-800');
    btn.setAttribute('aria-selected', 'false');
  });

  // 3. 顯示目標內容區塊
  const view = document.getElementById(`app-view-${tabId}`);
  if(view) view.classList.remove('hidden');
  
  // 4. 為目前選中的按鈕加上「彩色浮起」的漫畫風格
  const navBtn = document.getElementById(`nav-${tabId}`);
  if(navBtn) {
    navBtn.classList.remove('text-slate-500', 'hover:text-slate-800');
    navBtn.classList.add('bg-brand-500', 'text-white', 'shadow-comic', 'transform', '-translate-y-1');
    navBtn.classList.add('is-active');
    navBtn.setAttribute('aria-selected', 'true');
  }

  if (tabId === 'starred') renderStarredList();
  if (tabId === 'calendar') renderCalendar();
}

/**
 * 取得可愛漫畫風的單字圖象記憶圖片網址 (Pollinations.ai 最新版 API)
 * @param {string} word - 英文單字
 * @param {string} meaning - 中文翻譯或含義
 * @returns {string} 完整的圖片 URL
 */
function getVocabularyImageUrl(word, meaning) {
    // 優化提示詞：明確描述小女孩特徵，並強調與含義的視覺化互動
    // 我們將女孩描述為「擁有流動棕色長髮、 cheerful 的年輕學徒」，
    // 並穿著「火焰圖案連身裙」以呼應記憶法。
    const prompt = `A cute anime chibi style illustration of a long-haired little girl, like a cheerful young apprentice with flowing brown hair, wearing a stylized, flame-patterned dress. The girl is actively exploring the concept of the English word "${word}", visually and creatively representing its meaning: "${meaning}". The girl is interacting with objects or concepts related to the meaning. Warm lighting, highly detailed, educational children's book style.`;
    
    const encodedPrompt = encodeURIComponent(prompt);

    // 記憶卡防呆機制：使用單字的字元碼來產生一個固定的「種子碼 (seed)」
    // 這能讓同一個單字在 Pollinations 的不同请求中，內容維持一定的穩定度。
    let fixedSeed = 0;
    for (let i = 0; i < word.length; i++) {
        fixedSeed += word.charCodeAt(i);
    }
    fixedSeed = fixedSeed * 1024 + 42; 

    // 💡 重要優化：加上 _cb 參數強制瀏覽器繞過快取，確保每次單字切換都能載入新圖。
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&model=flux&seed=${fixedSeed}&_cb=${Date.now()}`;
}

function getPartOfSpeechLabel(item) {
  const value = item.part_of_speech ?? item.partOfSpeech ?? item.pos ?? item.word_class ?? item.wordClass;
  return String(value || 'word').trim().toLowerCase();
}

function getResponsiveWordSize(word) {
  const length = Array.from(word).length;
  if (length <= 8) return '4.6rem';
  if (length <= 12) return '3.6rem';
  if (length <= 16) return '2.85rem';
  if (length <= 20) return '2.2rem';
  return '1.7rem';
}

function setupColorThemeSwitcher() {
  const allowedThemes = new Set(['blue', 'green', 'pink']);
  const storedTheme = localStorage.getItem('cool_learning_color_theme');
  const initialTheme = allowedThemes.has(storedTheme) ? storedTheme : 'blue';
  const themeColors = { blue: '#71899d', green: '#788e80', pink: '#a98283' };

  const applyTheme = (theme) => {
    if (!allowedThemes.has(theme)) return;
    document.body.dataset.colorTheme = theme;
    localStorage.setItem('cool_learning_color_theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColors[theme]);
    document.querySelectorAll('.theme-swatch').forEach((button) => {
      const isActive = button.dataset.theme === theme;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  };

  document.querySelectorAll('.theme-swatch').forEach((button) => {
    button.addEventListener('click', () => applyTheme(button.dataset.theme));
  });
  applyTheme(initialTheme);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// 渲染單字卡 (加入全方位防呆，確保部分標籤不存在也不會報錯)
function renderCard() {
    if (today30Words.length === 0) return;
    const item = today30Words[currentIndex];

    // 1. 渲染圖片
    const imgEl = document.getElementById('card-image');
    if (imgEl) {
        // 💡 優化：在載入新圖片前先清空 src，有助於瀏覽器流暢切換。
        imgEl.src = '';
        if (item.img) {
            // 如果資料庫中已經有指定好的真實圖片，優先顯示
            imgEl.src = item.img;
        } else {
            // 呼叫函數產生網址。函數內部會處理強制快取清除、seed 計算與提示詞優化
            imgEl.src = getVocabularyImageUrl(item.vocabulary, item.chinese);
        }
    }

    // 2. 渲染單字與音標
    const wordEl = document.getElementById('card-vocabulary');
    if (wordEl) wordEl.textContent = item.vocabulary;

    const phoneticEl = document.getElementById('card-phonetic');
    if (phoneticEl) phoneticEl.textContent = item.phonetic;

    // 3. 渲染中文翻譯與例句
    const chineseEl = document.getElementById('card-chinese');
    if (chineseEl) chineseEl.textContent = item.chinese;

    const sentenceEl = document.getElementById('card-sentence');
    if (sentenceEl) sentenceEl.textContent = item.sentence;

    const translateEl = document.getElementById('card-translate');
    if (translateEl) translateEl.textContent = item.translate;

    fixedSeed = fixedSeed * 1024 + 42; 

    // 使用官方最新 GET 端點，並指定 model=flux 與 seed
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&model=flux&seed=${fixedSeed}`;
}

// 渲染單字卡 (加入全方位防呆，確保部分標籤不存在也不會報錯)
function renderCard() {
  if (today30Words.length === 0) return;
  const item = today30Words[currentIndex];

  const imgEl = document.getElementById('card-image');
  if (imgEl) {
    if (item.img) {
      // 如果資料庫中已經有指定好的真實圖片，優先顯示
      imgEl.src = item.img;
    } else {
      // 【動態生成】：呼叫函數，傳入英文單字與對應的中文，產生可愛專屬插圖！
      // 若資料表中文欄位叫 translation，請改為 item.translation
      imgEl.src = getVocabularyImageUrl(item.vocabulary, item.chinese);
    }
  }
  
  const wordEl = document.getElementById('card-word');
  if (wordEl) {
    const normalizedWord = String(item.vocabulary || item.word || '').trim().toLowerCase();
    wordEl.textContent = normalizedWord;
    wordEl.style.setProperty('--word-size', getResponsiveWordSize(normalizedWord));
  }

  const partOfSpeechEl = document.getElementById('card-part-of-speech');
  if (partOfSpeechEl) partOfSpeechEl.textContent = getPartOfSpeechLabel(item);
  
  const phoneticEl = document.getElementById('card-phonetic');
  if (phoneticEl) phoneticEl.textContent = item.phonetic;
  
  const chineseEl = document.getElementById('card-chinese');
  if (chineseEl) chineseEl.textContent = item.chinese;
  
  const sentenceEl = document.getElementById('card-sentence');
  if (sentenceEl) sentenceEl.textContent = item.sentence;
  
  const translateEl = document.getElementById('card-translate');
  if (translateEl) translateEl.textContent = item.translate;

  const starBtn = document.getElementById('star-btn');
  if (starBtn) {
      starBtn.className = starredIds.has(item.id) ? "absolute top-4 right-4 text-2xl text-amber-400 p-2 z-10" : "absolute top-4 right-4 text-2xl text-slate-300 p-2 z-10";
  }

  const nextBtn = document.getElementById('btn-next-word');
  if (nextBtn) {
      if (currentIndex === today30Words.length - 1) {
        nextBtn.innerHTML = '完成學習 <i class="fa-solid fa-circle-check"></i>';
        nextBtn.className = "flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-md";
      } else {
        nextBtn.innerHTML = '下一個 <i class="fa-solid fa-arrow-right"></i>';
        nextBtn.className = "flex-1 py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-all shadow-md";
      }
  }

  const progBar = document.getElementById('progress-bar');
  if (progBar) progBar.style.width = `${((currentIndex + 1) / today30Words.length) * 100}%`;
  
  const progText = document.getElementById('progress-text');
  if (progText) {
    const percent = Math.round(((currentIndex + 1) / today30Words.length) * 100);
    progText.textContent = `${currentIndex + 1} / ${today30Words.length} · ${percent}%`;
  }
  
  const starBadge = document.getElementById('starred-count-badge');
  if (starBadge) starBadge.textContent = `${starredIds.size} 難字`;
}

function renderStarredList() {
  const container = document.getElementById('starred-list-container');
  if (!container) return; // 防呆
  
  container.innerHTML = '';
  const list = [...starredWordsMap.values()];

  if (list.length === 0) {
    container.innerHTML = `<p class="text-center py-8 text-slate-400 font-bold text-xs">目前無標記難字喔！</p>`;
    return;
  }

  list.forEach(item => {
    const div = document.createElement('div');
    div.className = "bg-slate-50 border rounded-2xl p-3 flex items-center justify-between";
    div.innerHTML = `
      <div><span class="font-bold text-slate-800 lowercase">${String(item.vocabulary || item.word || '').toLowerCase()}</span> <span class="text-xs text-brand-600 ml-2">${item.chinese || item.translation}</span></div>
      <button class="text-amber-400 p-1" data-id="${item.id}"><i class="fa-solid fa-star"></i></button>
    `;
    div.querySelector('button').onclick = () => {
      starredIds.delete(item.id);
      starredWordsMap.delete(item.id); 
      saveStudentAppData();
      renderStarredList();
    };
    container.appendChild(div);
  });
}

function renderCalendar() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  
  const title = document.getElementById('cal-month-title');
  if (title) title.textContent = `${year} 年 ${month + 1} 月`;

  const grid = document.getElementById('calendar-grid');
  if (!grid) return; // 防呆
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

  const todayKey = getTodayKey();
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const key = `${year}-${mm}-${dd}`;

    const cell = document.createElement('div');
    cell.className = completedDates.has(key) ? "h-8 bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center" : "h-8 bg-slate-50 text-slate-600 rounded-xl text-xs flex items-center justify-center";
    cell.textContent = day;
    grid.appendChild(cell);
  }

  const streak = document.getElementById('streak-count');
  if (streak) streak.textContent = `${completedDates.size} 天`;
  
  const totalDays = document.getElementById('total-days-count');
  if (totalDays) totalDays.textContent = `${completedDates.size} 天`;

  const card = document.getElementById('today-status-card');
  if (card) {
      if (completedDates.has(todayKey)) {
        card.className = "w-full py-3 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold text-center";
        card.innerHTML = '<i class="fa-solid fa-circle-check"></i> 今日學習已完成打卡！';
      } else {
        card.className = "w-full py-3 bg-amber-50 text-amber-800 rounded-2xl text-xs font-bold text-center";
        card.innerHTML = '<i class="fa-solid fa-clock"></i> 完成今日 30 字將自動打卡';
      }
  }
}

// ==========================================
// 💡 事件接管綁定區 (使用 ?. 徹底解決 null 報錯問題)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupColorThemeSwitcher();
  if (currentUser && !currentUser.token) {
    currentUser = null;
    sessionStorage.removeItem('g6_portal_user');
  }
  if (typeof initQuizModule === 'function') initQuizModule();
  if (typeof initAdminModule === 'function') initAdminModule();

  // 彈窗按鈕
  document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
    document.getElementById('custom-modal')?.classList.add('hidden');
    if (modalCallback) modalCallback();
  });
  document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      document.getElementById('custom-modal')?.classList.add('hidden');
  });

  // 登出與首頁
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('g6_portal_user');
    showView('view-login');
  });

  document.getElementById('btn-go-home')?.addEventListener('click', () => {
    if (!currentUser) showView('view-login');
    else if (currentUser.isAdmin) showView('view-admin');
    else showView('view-subjects');
  });

  // 登入頁籤切換
  document.getElementById('login-tab-student')?.addEventListener('click', () => {
    document.getElementById('form-student-login')?.classList.remove('hidden');
    document.getElementById('form-admin-login')?.classList.add('hidden');
    document.getElementById('login-tab-student')?.classList.add('bg-white', 'text-brand-600', 'shadow-sm');
    document.getElementById('login-tab-student')?.classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-admin')?.classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-admin')?.classList.remove('bg-white', 'text-brand-600', 'shadow-sm');
  });

  document.getElementById('login-tab-admin')?.addEventListener('click', () => {
    document.getElementById('form-admin-login')?.classList.remove('hidden');
    document.getElementById('form-student-login')?.classList.add('hidden');
    document.getElementById('login-tab-admin')?.classList.add('bg-white', 'text-brand-600', 'shadow-sm');
    document.getElementById('login-tab-admin')?.classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student')?.classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student')?.classList.remove('bg-white', 'text-brand-600', 'shadow-sm');
  });

  // 學生登入處理 (包含付費牆攔截)
  document.getElementById('form-student-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('input-student-name').value.trim();
    const seatNo = document.getElementById('input-student-seat').value.trim();

    try {
      const response = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, seatNo })
      });
      const data = await response.json();

      if (data.status === 'expired') {
        document.getElementById('paywall-modal')?.classList.remove('hidden');
        return; 
      }

      if (data.success) {
        currentUser = { name, seatNo, token: data.token, isAdmin: false };
        sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
        
        const hName = document.getElementById('header-user-name');
        const hSeat = document.getElementById('header-user-seat');
        if(hName) hName.textContent = currentUser.name;
        if(hSeat) hSeat.textContent = `座號: ${currentUser.seatNo}`;
        document.getElementById('user-profile-badge')?.classList.remove('hidden');

        showView('view-subjects');
        
        if (data.is_premium === 1) {
          showToast("登入成功！VIP 權限已啟用", "fa-crown");
        } else {
          const days = data.days_remaining !== undefined ? data.days_remaining : 7;
          showToast(`免費試用中，剩餘 ${days} 天`, "fa-clock");
        }
      } else {
        showToast(data.message || '登入失敗，請檢查資料', "fa-triangle-exclamation");
      }
    } catch (error) {
      console.error(error);
      showToast("伺服器連線異常，請檢查網路", "fa-triangle-exclamation");
    }
  });

  document.getElementById('form-admin-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('input-admin-id').value.trim();
    const password = document.getElementById('input-admin-pwd').value;
    try {
      const response = await apiFetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '登入失敗');
      currentUser = { name: '系統管理員', seatNo: 'ADMIN', token: data.token, isAdmin: true };
      sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
      showView('view-admin');
      if (typeof renderAdminTables === 'function') await renderAdminTables();
    } catch (error) {
      showToast(error.message || '管理員登入失敗', 'fa-triangle-exclamation');
    }
  });

  // 科目大廳按鈕
  document.getElementById('btn-open-english')?.addEventListener('click', () => {
    loadStudentAppData(currentUser.seatNo);
    switchAppTab('learn');
    showView('view-english-app');
  });

  document.getElementById('btn-math-go')?.addEventListener('click', () => { 
      window.location.href = 'math.html'; 
  });
  
  document.getElementById('btn-back-subjects')?.addEventListener('click', () => showView('view-subjects'));

  // 底部導航列
  document.getElementById('nav-learn')?.addEventListener('click', () => switchAppTab('learn'));
  document.getElementById('nav-starred')?.addEventListener('click', () => switchAppTab('starred'));
  document.getElementById('nav-quiz')?.addEventListener('click', () => switchAppTab('quiz'));
  document.getElementById('nav-calendar')?.addEventListener('click', () => switchAppTab('calendar'));

  // 單字卡互動按鈕
  document.getElementById('star-btn')?.addEventListener('click', () => {
    if (today30Words.length === 0) return;
    const item = today30Words[currentIndex];
    if (starredIds.has(item.id)) {
      starredIds.delete(item.id);
      starredWordsMap.delete(item.id);
    } else {
      starredIds.add(item.id);
      starredWordsMap.set(item.id, item); 
    }
    saveStudentAppData();
    renderCard();
  });

  document.getElementById('btn-speak-word')?.addEventListener('click', () => {
      if (today30Words[currentIndex]) speakText(today30Words[currentIndex].vocabulary);
  });
  document.getElementById('btn-speak-sentence')?.addEventListener('click', () => {
      if (today30Words[currentIndex]) speakText(today30Words[currentIndex].sentence);
  });

  document.getElementById('btn-next-word')?.addEventListener('click', () => {
    if (currentIndex < today30Words.length - 1) {
      currentIndex++;
      saveStudentAppData(); 
      renderCard();
    } else {
      today30Words.forEach(w => learnedWordIds.add(w.id));
      const todayKey = getTodayKey();
      completedDates.add(todayKey);
      saveStudentAppData();
      syncStudentProgressToCloud();
      switchAppTab('calendar');
    }
  });

  document.getElementById('btn-prev-word')?.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      saveStudentAppData(); 
      renderCard();
    }
  });

// 初始化畫面狀態：先判斷是否在首頁 (是否有登入區塊)
  const loginView = document.getElementById('view-login');
  if (loginView) {
    if (currentUser) {
      if (currentUser.isAdmin) {
          showView('view-admin');
          if (typeof renderAdminTables === 'function') renderAdminTables();
      } else {
        const subjectUserEl = document.getElementById('subject-user-name');
        if (subjectUserEl) subjectUserEl.textContent = currentUser.name;
        showView('view-subjects');
      }
    } else {
      showView('view-login');
    }
  } else {
    // 如果不在首頁 (例如在 english.html)，確保顯示專屬的區塊
    const englishApp = document.getElementById('view-english-app');
    if (englishApp) {
      englishApp.classList.remove('hidden');
    }
  }
});
