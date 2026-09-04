// 全局狀態管理
let currentUser = JSON.parse(sessionStorage.getItem('g6_portal_user')) || null;
let currentGuardian = JSON.parse(sessionStorage.getItem('g6_guardian_user')) || null;
let guardianToken = sessionStorage.getItem('g6_guardian_token') || null;
let guardianChildren = [];

// 管理後台用；一律由 /api/admin/analytics 的真實資料覆蓋（見 admin.js），這裡只需要空陣列起始值。
let studentsList = [];

let today30Words = [];
let currentIndex = 0;
let starredIds = new Set();
let starredWordsMap = new Map(); 
let starredSpellingCounts = {};
let completedDates = new Set();
let learnedWordIds = new Set();
let calendarViewDate = new Date();
let selectedLearningDate = getTodayKey();
let dailyProgressMap = new Map();
let allWordsCompleted = false;
let modalCallback = null;
let progressSyncTimer = null;
let studentLoginStage = 'identity'; // 'identity' | 'password'

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

// 將學生登入表單重置回「輸入姓名/座號」的第一階段。
function resetStudentLoginForm() {
  studentLoginStage = 'identity';
  document.getElementById('student-login-error')?.classList.add('hidden');
  document.getElementById('student-login-step-identity')?.classList.remove('hidden');
  document.getElementById('student-login-step-password')?.classList.add('hidden');
  document.getElementById('student-login-password-existing')?.classList.remove('hidden');
  document.getElementById('student-login-password-setup')?.classList.add('hidden');
  const passwordInput = document.getElementById('input-student-password');
  if (passwordInput) passwordInput.value = '';
  const newPasswordInput = document.getElementById('input-student-new-password');
  if (newPasswordInput) newPasswordInput.value = '';
  const confirmInput = document.getElementById('input-student-new-password-confirm');
  if (confirmInput) confirmInput.value = '';
  const submitBtn = document.getElementById('btn-student-login-submit');
  if (submitBtn) submitBtn.innerHTML = '探索開始！';
}

// 切換到第二階段：{ setup: true } 顯示「首次登入設定密碼」欄位，否則顯示一般密碼欄位。
function showStudentLoginPasswordStep({ setup }) {
  studentLoginStage = 'password';
  document.getElementById('student-login-error')?.classList.add('hidden');
  document.getElementById('student-login-step-identity')?.classList.add('hidden');
  document.getElementById('student-login-step-password')?.classList.remove('hidden');
  document.getElementById('student-login-password-existing')?.classList.toggle('hidden', setup);
  document.getElementById('student-login-password-setup')?.classList.toggle('hidden', !setup);
  const submitBtn = document.getElementById('btn-student-login-submit');
  if (submitBtn) {
    submitBtn.innerHTML = setup
      ? '設定密碼並登入 <i class="fa-solid fa-arrow-right"></i>'
      : '登入 <i class="fa-solid fa-arrow-right"></i>';
  }
  const passwordInput = document.getElementById('input-student-password');
  if (passwordInput) { passwordInput.value = ''; if (!setup) passwordInput.focus(); }
}

function updateSyncStatus(text, className = 'text-slate-400') {
  const status = document.getElementById('sync-status');
  if (!status) return;
  status.textContent = text;
  status.className = `block text-[10px] font-bold ${className}`;
}

async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Authorization')) {
    if (currentUser?.token) {
      headers.set('Authorization', `Bearer ${currentUser.token}`);
    } else if (guardianToken) {
      headers.set('Authorization', `Bearer ${guardianToken}`);
    }
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (response.status === 401 && !path.endsWith('/login') && !path.endsWith('/register') && !path.endsWith('/link')) {
    if (path.startsWith('/guardian')) {
      currentGuardian = null;
      guardianToken = null;
      sessionStorage.removeItem('g6_guardian_user');
      sessionStorage.removeItem('g6_guardian_token');
      showToast('家長登入憑證已過期，請重新登入', 'fa-lock');
      showView('view-login');
    } else {
      currentUser = null;
      sessionStorage.removeItem('g6_portal_user');
      if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
        window.location.assign('index.html?session=expired');
      }
    }
  }
  return response;
}

// UI 通知系統 (畫面正中央置中顯示，精緻透明毛玻璃感，寬敞呼吸感間距)
function showToast(text, iconClass = "fa-circle-info") {
  const container = document.getElementById('toast-container');
  if (!container) {
    alert(text);
    return;
  }
  
  const textEl = document.getElementById('toast-text');
  const iconEl = document.getElementById('toast-icon');
  
  // 強制覆蓋外層容器居中與層級
  container.style.position = 'fixed';
  container.style.zIndex = '9999999';
  container.style.top = '50%';
  container.style.left = '50%';
  container.style.transform = 'translate(-50%, -50%) scale(1)';
  container.style.opacity = '1';
  container.style.pointerEvents = 'auto';

  // 精緻透明毛玻璃效果卡片
  const inner = container.firstElementChild;
  if (inner) {
    inner.style.background = 'rgba(15, 23, 42, 0.78)';
    inner.style.backdropFilter = 'blur(16px) saturate(180%)';
    inner.style.webkitBackdropFilter = 'blur(16px) saturate(180%)';
    inner.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    inner.style.borderRadius = '20px';
    inner.style.padding = '14px 26px';
    inner.style.display = 'flex';
    inner.style.alignItems = 'center';
    inner.style.gap = '14px';
    inner.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)';
    inner.style.color = '#ffffff';
  }

  // 獨立圓形圖示徽章，避免圖示與文字擠壓
  if (iconEl) {
    iconEl.className = `fa-solid ${iconClass} text-amber-300`;
    iconEl.style.width = '36px';
    iconEl.style.height = '36px';
    iconEl.style.borderRadius = '50%';
    iconEl.style.background = 'rgba(255, 255, 255, 0.12)';
    iconEl.style.display = 'inline-flex';
    iconEl.style.alignItems = 'center';
    iconEl.style.justifyContent = 'center';
    iconEl.style.fontSize = '16px';
    iconEl.style.flexShrink = '0';
  }

  // 文字舒適排版
  if (textEl) {
    textEl.textContent = text;
    textEl.style.color = '#ffffff';
    textEl.style.fontSize = '15px';
    textEl.style.fontWeight = '600';
    textEl.style.letterSpacing = '0.3px';
    textEl.style.lineHeight = '1.5';
    textEl.style.maxWidth = 'min(75vw, 360px)';
    textEl.style.textAlign = 'left';
  }

  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    container.style.transform = 'translate(-50%, -50%) scale(0.9)';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
  }, 3200);
}
window.showToast = showToast;

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
async function fetchDailyWordsFromCloud(studentId, learningDate = getTodayKey()) {
    try {
        const response = await apiFetch(`/get-daily-words?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(learningDate)}`);
        const result = await response.json().catch(() => ({}));
        
        if (response.ok && result.success) {
            return result;
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
  
  localStorage.setItem(`g6_daily_words_${seatNo}_${selectedLearningDate}`, JSON.stringify(today30Words));
  localStorage.setItem(`g6_daily_index_${seatNo}_${selectedLearningDate}`, currentIndex);
  scheduleProgressSync();
}

function scheduleProgressSync() {
  clearTimeout(progressSyncTimer);
  progressSyncTimer = setTimeout(() => syncStudentProgressToCloud(), 500);
}

async function syncStudentProgressToCloud() {
  if (!currentUser || currentUser.isAdmin) return;

  try {
    updateSyncStatus('同步中…', 'text-amber-600');
    const response = await apiFetch('/student-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seatNo: currentUser.seatNo,
        learningDate: selectedLearningDate,
        currentWordIndex: currentIndex,
        completed: completedDates.has(selectedLearningDate),
        completedDates: [...completedDates],
        learnedWordIds: [...learnedWordIds],
        starredIds: [...starredIds],
        starredWords: [...starredWordsMap.values()],
        starredSpellingCounts
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.error || `HTTP ${response.status}`);
    const justCompletedAllWords = Boolean(result.allWordsCompleted) && !allWordsCompleted;
    allWordsCompleted = Boolean(result.allWordsCompleted);
    if (justCompletedAllWords) showToast('恭喜所有單字已學習完成！', 'fa-trophy');
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
    dailyProgressMap = new Map((cloudProgress.dailyProgress || []).map(item => [item.learningDate, item]));
    completedDates = new Set((cloudProgress.dailyProgress || []).filter(item => item.completed).map(item => item.learningDate));
    allWordsCompleted = Boolean(cloudProgress.allWordsCompleted);
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

  selectedLearningDate = todayStr;
  const dailyResult = await fetchDailyWordsFromCloud(seatNo, todayStr);
  if (dailyResult) {
    today30Words = dailyResult.dailyWords || [];
    const localIndex = cachedIndex ? parseInt(cachedIndex, 10) : 0;
    currentIndex = Math.max(localIndex, Number(dailyResult.currentWordIndex || 0));
    if (dailyResult.completed) completedDates.add(todayStr);
    allWordsCompleted = Boolean(dailyResult.allWordsCompleted);
  } else if (cachedWords && cachedWords.length > 0) {
    today30Words = cachedWords;
    currentIndex = cachedIndex ? parseInt(cachedIndex, 10) : 0;
    showToast('目前使用本機快取，連線恢復後會再同步', 'fa-cloud-arrow-down');
  } else {
    return;
  }

  if (today30Words.length === 0) {
    showToast("今日單字載入失敗，請確認伺服器連線", "fa-triangle-exclamation");
    return;
  }
  saveStudentAppData();
  renderCard();
  if (allWordsCompleted) showToast('恭喜所有單字已學習完成！', 'fa-trophy');
}

async function openLearningDate(learningDate) {
  if (!currentUser || learningDate > getTodayKey()) return;
  updateSyncStatus('載入指定日期…', 'text-amber-600');
  const result = await fetchDailyWordsFromCloud(currentUser.seatNo, learningDate);
  if (!result) return;
  selectedLearningDate = learningDate;
  today30Words = result.dailyWords || [];
  currentIndex = result.completed ? 0 : Number(result.currentWordIndex || 0);
  if (result.completed) completedDates.add(learningDate);
  dailyProgressMap.set(learningDate, {
    learningDate,
    currentWordIndex: currentIndex,
    completed: Boolean(result.completed)
  });
  localStorage.setItem(`g6_daily_words_${currentUser.seatNo}_${learningDate}`, JSON.stringify(today30Words));
  localStorage.setItem(`g6_daily_index_${currentUser.seatNo}_${learningDate}`, currentIndex);
  switchAppTab('learn');
  renderCard();
  showToast(result.completed ? `正在複習 ${learningDate} 的 30 個單字` : `正在補學 ${learningDate} 的 30 個單字`, result.completed ? 'fa-rotate-left' : 'fa-book-open');
}

// 畫面切換 (加入防呆)
function showView(viewId) {
  document.querySelectorAll('section[id^="view-"]').forEach(sec => sec.classList.add('hidden'));
  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.remove('hidden');

  const globalHeader = document.getElementById('global-header');
  if (viewId === 'view-login') {
    document.body.classList.add('is-login-state');
    if (globalHeader) globalHeader.classList.add('hidden');
  } else {
    document.body.classList.remove('is-login-state');
    if (globalHeader) globalHeader.classList.remove('hidden');
  }

  const badge = document.getElementById('user-profile-badge');
  if (badge) {
      if (currentUser && viewId !== 'view-login' && viewId !== 'view-guardian-dashboard') {
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
    const isStarred = starredIds.has(item.id);
    starBtn.className = isStarred
      ? "absolute top-3 right-3 text-3xl text-amber-400 p-2 z-30 transition-transform transform hover:scale-110 active:scale-95 drop-shadow-md is-starred"
      : "absolute top-3 right-3 text-3xl text-slate-300 hover:text-amber-400 p-2 z-30 transition-transform transform hover:scale-110 active:scale-95 drop-shadow-md";
    starBtn.style.color = isStarred ? '#f59e0b' : '';
    starBtn.title = isStarred ? '已加入難字本（需在「難字本拼字特訓」連續拼對 3 次方可移除）' : '點擊加入難字本';
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
    const dateLabel = selectedLearningDate === getTodayKey() ? '' : `${selectedLearningDate} · `;
    progText.textContent = `${dateLabel}${currentIndex + 1} / ${today30Words.length} · ${percent}%`;
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
      showToast('難字需在「難字本拼字特訓」連續拼對 3 次才能移除喔！', 'fa-info-circle');
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

    const cell = document.createElement(key <= todayKey ? 'button' : 'div');
    cell.className = completedDates.has(key) ? "h-8 bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center hover:bg-emerald-600" : key <= todayKey ? "h-8 bg-amber-50 text-amber-800 rounded-xl text-xs flex items-center justify-center hover:bg-amber-100" : "h-8 bg-slate-50 text-slate-300 rounded-xl text-xs flex items-center justify-center";
    cell.textContent = day;
    if (key <= todayKey) {
      cell.type = 'button';
      cell.title = completedDates.has(key) ? '點擊複習當日單字' : '點擊補學當日單字';
      cell.addEventListener('click', () => openLearningDate(key));
    }
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
    resetStudentLoginForm();
    if (currentGuardian && guardianToken) {
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
    } else {
      showView('view-login');
    }
  });

  document.getElementById('btn-go-home')?.addEventListener('click', () => {
    if (currentUser) {
      showView('view-subjects');
    } else if (currentGuardian && guardianToken) {
      showView('view-guardian-dashboard');
    } else {
      showView('view-login');
    }
  });

  // 登入模式切換籤 (學生模式 vs 家長模式)
  document.getElementById('login-tab-student')?.addEventListener('click', () => {
    resetStudentLoginForm();
    document.getElementById('form-student-login')?.classList.remove('hidden');
    document.getElementById('guardian-auth-container')?.classList.add('hidden');
    document.getElementById('login-tab-student')?.classList.add('bg-white', 'text-[#173852]', 'shadow-sm');
    document.getElementById('login-tab-student')?.classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-guardian')?.classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-guardian')?.classList.remove('bg-white', 'text-[#173852]', 'shadow-sm');
  });

  document.getElementById('login-tab-guardian')?.addEventListener('click', () => {
    document.getElementById('guardian-auth-container')?.classList.remove('hidden');
    document.getElementById('form-student-login')?.classList.add('hidden');
    document.getElementById('login-tab-guardian')?.classList.add('bg-white', 'text-[#173852]', 'shadow-sm');
    document.getElementById('login-tab-guardian')?.classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student')?.classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student')?.classList.remove('bg-white', 'text-[#173852]', 'shadow-sm');
  });

  // 學生登入處理：分兩階段。第一階段只送姓名+座號探測狀態，
  // 第二階段依伺服器回應顯示「輸入密碼」或「首次登入設定密碼」畫面。
  document.getElementById('btn-student-login-back')?.addEventListener('click', () => resetStudentLoginForm());

  // 輸入時自動隱藏學生登入錯誤
  ['input-student-name', 'input-student-seat', 'input-student-password', 'input-student-new-password', 'input-student-new-password-confirm'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById('student-login-error')?.classList.add('hidden');
    });
  });

  document.getElementById('form-student-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-student-login-submit');
    const errBox = document.getElementById('student-login-error');
    const errText = document.getElementById('student-login-error-text');
    const errIcon = document.getElementById('student-login-error-icon');

    const showStudentLoginError = (msg, icon = 'fa-triangle-exclamation') => {
      if (errBox && errText) {
        errText.textContent = msg;
        if (errIcon) errIcon.className = `fa-solid ${icon} text-rose-500 text-base shrink-0 mt-0.5`;
        errBox.classList.remove('hidden');
        errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(msg, icon);
    };

    errBox?.classList.add('hidden');

    const name = document.getElementById('input-student-name').value.trim();
    const seatNo = document.getElementById('input-student-seat').value.trim();
    const payload = { name, seatNo };

    if (studentLoginStage === 'password') {
      const isSetupStep = !document.getElementById('student-login-password-setup')?.classList.contains('hidden');
      if (isSetupStep) {
        const newPassword = document.getElementById('input-student-new-password').value;
        const confirmPassword = document.getElementById('input-student-new-password-confirm').value;
        if (newPassword.length < 6 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
          showStudentLoginError('密碼至少需要 6 碼，且需同時包含英文字母與數字', 'fa-triangle-exclamation');
          return;
        }
        if (newPassword !== confirmPassword) {
          showStudentLoginError('兩次輸入的密碼不一致，請再確認一次', 'fa-triangle-exclamation');
          return;
        }
        payload.newPassword = newPassword;
      } else {
        payload.password = document.getElementById('input-student-password').value;
      }
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';
      }

      const response = await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (data.status === 'expired') {
        document.getElementById('paywall-modal')?.classList.remove('hidden');
        return; 
      }

      if (data.status === 'needs_password_setup') {
        showStudentLoginPasswordStep({ setup: true });
        if (data.error) showStudentLoginError(data.error, 'fa-triangle-exclamation');
        return;
      }

      if (data.status === 'needs_password') {
        showStudentLoginPasswordStep({ setup: false });
        if (payload.password) {
          showStudentLoginError(data.message || '密碼錯誤，請重新輸入', 'fa-lock');
        } else {
          showToast(data.message || '請輸入密碼', 'fa-lock');
        }
        return;
      }

      if (data.status === 'locked') {
        showStudentLoginError(data.message || '帳號已鎖定，請稍後再試', 'fa-lock');
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

        resetStudentLoginForm();
        showView('view-subjects');
        
        if (data.is_premium === 1) {
          showToast("登入成功！VIP 權限已啟用", "fa-crown");
        } else {
          const days = data.days_remaining !== undefined ? data.days_remaining : 7;
          showToast(`免費試用中，剩餘 ${days} 天`, "fa-clock");
        }
      } else {
        showStudentLoginError(data.message || data.error || '登入失敗，請檢查資料', 'fa-triangle-exclamation');
      }
    } catch (error) {
      console.error(error);
      showStudentLoginError('伺服器連線異常，請檢查網路', 'fa-triangle-exclamation');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnHtml;
      }
    }
  });

  // 初始化家長專區模組
  initGuardianModule();

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
  document.getElementById('star-btn')?.addEventListener('click', (e) => {
    e?.stopPropagation();
    if (today30Words.length === 0) return;
    const item = today30Words[currentIndex];
    if (!item) return;

    if (starredIds.has(item.id)) {
      // 依規定：難字一旦加入即常亮，除非透過難字拼字測驗答對三次外，不得手動取消
      showToast('已在難字本中，需在「難字本拼字特訓」連續拼對 3 次方可移除！', 'fa-info-circle');
      return;
    }

    starredIds.add(item.id);
    starredWordsMap.set(item.id, item);
    saveStudentAppData();
    renderCard();
    showToast(`已將「${item.vocabulary || item.word}」加入難字本！`, 'fa-star');
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
      completedDates.add(selectedLearningDate);
      dailyProgressMap.set(selectedLearningDate, { learningDate: selectedLearningDate, currentWordIndex: 29, completed: true });
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
        window.location.href = 'admin.html';
      } else {
        const subjectUserEl = document.getElementById('subject-user-name');
        if (subjectUserEl) subjectUserEl.textContent = currentUser.name;
        showView('view-subjects');
      }
    } else if (currentGuardian && guardianToken) {
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
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

// ==========================================
// 家長專區 (Guardian Module) 邏輯與互動實作
// ==========================================
function initGuardianModule() {
  // 切換註冊 / 登入
  document.getElementById('btn-switch-to-register')?.addEventListener('click', () => {
    document.getElementById('form-guardian-login')?.classList.add('hidden');
    document.getElementById('form-guardian-register')?.classList.remove('hidden');
  });

  document.getElementById('btn-switch-to-login')?.addEventListener('click', () => {
    document.getElementById('form-guardian-register')?.classList.add('hidden');
    document.getElementById('form-guardian-login')?.classList.remove('hidden');
  });

  // ==========================================
  // Google OAuth 2.0 (Google Identity Services) 整合
  // ==========================================
  async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
      showToast('未取得 Google 登入憑證，請重試', 'fa-triangle-exclamation');
      return;
    }
    try {
      showToast('正在驗證 Google 帳號...', 'fa-circle-notch fa-spin');
      const res = await apiFetch('/guardian/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Google 登入驗證失敗');
      }

      guardianToken = data.token;
      currentGuardian = data.guardian;
      sessionStorage.setItem('g6_guardian_token', guardianToken);
      sessionStorage.setItem('g6_guardian_user', JSON.stringify(currentGuardian));

      showToast(`Google 登入成功！歡迎回來，${currentGuardian.displayName || currentGuardian.email}！`, 'fa-circle-check');
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
    } catch (err) {
      console.error('Google login error:', err);
      showToast(err.message || 'Google 登入失敗', 'fa-triangle-exclamation');
    }
  }

  function initGoogleAuth() {
    if (typeof GOOGLE_CLIENT_ID === 'undefined' || !GOOGLE_CLIENT_ID) return;

    const tryInit = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: 'signin_with',
            locale: 'zh_TW'
          });
          // 當官方標準按鈕渲染後，備用按鈕可設為隱藏以維持簡潔外觀
          const fallbackBtn = document.getElementById('btn-guardian-google-login');
          if (fallbackBtn) fallbackBtn.classList.add('hidden');
        }
      } else {
        setTimeout(tryInit, 250);
      }
    };
    tryInit();
  }

  initGoogleAuth();

  // 自訂備用 Google 登入按鈕
  document.getElementById('btn-guardian-google-login')?.addEventListener('click', () => {
    if (window.google?.accounts?.id) {
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showToast('請允許第三方 Cookie 或直接點擊上方 Google 登入按鈕', 'fa-circle-info');
        }
      });
    } else {
      showToast('Google 登入模組載入中，請稍候重試', 'fa-clock');
    }
  });

  // 輸入時自動隱藏家長登入錯誤
  ['guardian-login-email', 'guardian-login-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById('guardian-login-error')?.classList.add('hidden');
    });
  });

  // 家長登入
  document.getElementById('form-guardian-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-guardian-login-submit');
    const errBox = document.getElementById('guardian-login-error');
    const errText = document.getElementById('guardian-login-error-text');

    const showGuardianLoginError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove('hidden');
        errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(msg, 'fa-triangle-exclamation');
    };

    errBox?.classList.add('hidden');

    const email = document.getElementById('guardian-login-email').value.trim();
    const password = document.getElementById('guardian-login-password').value;

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';
      }

      const response = await apiFetch('/guardian/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '家長登入失敗，請檢查帳號密碼');
      }

      guardianToken = data.token;
      currentGuardian = data.guardian;
      sessionStorage.setItem('g6_guardian_token', guardianToken);
      sessionStorage.setItem('g6_guardian_user', JSON.stringify(currentGuardian));

      showToast(`歡迎回來，${currentGuardian.displayName || currentGuardian.email}！`, 'fa-user-shield');
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
    } catch (err) {
      console.error(err);
      showGuardianLoginError(err.message || '登入失敗');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnHtml;
      }
    }
  });

  // 家長註冊
  document.getElementById('form-guardian-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('guardian-register-name').value.trim();
    const email = document.getElementById('guardian-register-email').value.trim();
    const password = document.getElementById('guardian-register-password').value;
    const confirmPassword = document.getElementById('guardian-register-confirm').value;

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      showToast('家長密碼至少需 8 碼，且同時包含英文字母與數字', 'fa-triangle-exclamation');
      return;
    }
    if (password !== confirmPassword) {
      showToast('兩次輸入的密碼不一致，請確認', 'fa-triangle-exclamation');
      return;
    }

    try {
      const response = await apiFetch('/guardian/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '註冊失敗');
      }

      guardianToken = data.token;
      currentGuardian = data.guardian;
      sessionStorage.setItem('g6_guardian_token', guardianToken);
      sessionStorage.setItem('g6_guardian_user', JSON.stringify(currentGuardian));

      showToast('家長帳號註冊成功！歡迎進入專區', 'fa-circle-check');
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
    } catch (err) {
      console.error(err);
      showToast(err.message || '註冊失敗', 'fa-triangle-exclamation');
    }
  });

  // 家長登出
  document.getElementById('btn-guardian-logout')?.addEventListener('click', () => {
    currentGuardian = null;
    guardianToken = null;
    guardianChildren = [];
    sessionStorage.removeItem('g6_guardian_token');
    sessionStorage.removeItem('g6_guardian_user');
    showToast('已安全登出家長帳號', 'fa-right-from-bracket');
    showView('view-login');
  });

  // 家長儀表板分頁籤
  const guardianTabs = ['children', 'tracking', 'growth', 'support', 'community'];
  guardianTabs.forEach(tab => {
    document.getElementById(`guardian-tab-${tab}`)?.addEventListener('click', () => {
      switchGuardianTab(tab);
    });
  });

  // 新增/修改子女彈窗
  function switchChildModalTab(mode) {
    document.getElementById('link-child-error')?.classList.add('hidden');
    const tabCreate = document.getElementById('tab-child-mode-create');
    const tabLink = document.getElementById('tab-child-mode-link');
    const formProfile = document.getElementById('form-child-profile');
    const formLink = document.getElementById('form-child-link');

    if (mode === 'link') {
      tabLink?.classList.add('bg-white', 'text-teal-700', 'shadow-sm');
      tabLink?.classList.remove('text-slate-500');
      tabCreate?.classList.remove('bg-white', 'text-teal-700', 'shadow-sm');
      tabCreate?.classList.add('text-slate-500');
      formProfile?.classList.add('hidden');
      formLink?.classList.remove('hidden');
    } else {
      tabCreate?.classList.add('bg-white', 'text-teal-700', 'shadow-sm');
      tabCreate?.classList.remove('text-slate-500');
      tabLink?.classList.remove('bg-white', 'text-teal-700', 'shadow-sm');
      tabLink?.classList.add('text-slate-500');
      formLink?.classList.add('hidden');
      formProfile?.classList.remove('hidden');
    }
  }

  // 輸入時自動隱藏錯誤提示
  ['input-link-name', 'input-link-seat', 'input-link-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById('link-child-error')?.classList.add('hidden');
    });
  });

  document.getElementById('tab-child-mode-create')?.addEventListener('click', () => switchChildModalTab('create'));
  document.getElementById('tab-child-mode-link')?.addEventListener('click', () => switchChildModalTab('link'));

  document.getElementById('btn-open-add-child-modal')?.addEventListener('click', () => {
    document.getElementById('modal-child-form-title').innerHTML = '<i class="fa-solid fa-user-plus text-teal-600"></i> 新增或綁定子女';
    document.getElementById('child-modal-tabs')?.classList.remove('hidden');
    document.getElementById('link-child-error')?.classList.add('hidden');
    document.getElementById('input-child-id').value = '';
    document.getElementById('input-child-nickname').value = '';
    document.getElementById('input-child-grade').value = '國小六年級';
    document.getElementById('input-child-password').value = '';

    // 重設綁定表單
    document.getElementById('input-link-name').value = '';
    document.getElementById('input-link-seat').value = '';
    document.getElementById('input-link-password').value = '';
    document.getElementById('input-link-nickname').value = '';
    document.getElementById('input-link-grade').value = '國小六年級';

    switchChildModalTab('create');
    document.getElementById('modal-child-form')?.classList.remove('hidden');
  });

  document.getElementById('btn-close-child-modal')?.addEventListener('click', () => {
    document.getElementById('modal-child-form')?.classList.add('hidden');
  });
  document.getElementById('btn-cancel-child-modal')?.addEventListener('click', () => {
    document.getElementById('modal-child-form')?.classList.add('hidden');
  });
  document.getElementById('btn-cancel-child-link-modal')?.addEventListener('click', () => {
    document.getElementById('modal-child-form')?.classList.add('hidden');
  });

  // 建立全新子女或修改
  document.getElementById('form-child-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const childId = document.getElementById('input-child-id').value;
    const nickname = document.getElementById('input-child-nickname').value.trim();
    const gradeLevel = document.getElementById('input-child-grade').value;
    const childPassword = document.getElementById('input-child-password').value;

    if (childPassword && (childPassword.length < 6 || !/[A-Za-z]/.test(childPassword) || !/[0-9]/.test(childPassword))) {
      showToast('子女登入密碼需至少 6 碼英數組合', 'fa-triangle-exclamation');
      return;
    }

    try {
      const url = childId ? `/guardian/children/${childId}` : '/guardian/children';
      const method = childId ? 'PUT' : 'POST';
      const payload = { nickname, gradeLevel };
      if (childPassword) payload.childPassword = childPassword;

      const response = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '儲存子女資訊失敗');

      showToast(childId ? '子女資料修改成功！' : '全新子女檔案建立成功！', 'fa-circle-check');
      document.getElementById('modal-child-form')?.classList.add('hidden');
      loadGuardianDashboard();
    } catch (err) {
      console.error(err);
      showToast(err.message || '儲存失敗', 'fa-triangle-exclamation');
    }
  });

  // 綁定既有子女
  document.getElementById('form-child-link')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-submit-child-link');
    const errBox = document.getElementById('link-child-error');
    const errText = document.getElementById('link-child-error-text');

    const showLinkError = (msg) => {
      if (errBox && errText) {
        errText.textContent = msg;
        errBox.classList.remove('hidden');
        errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      showToast(msg, 'fa-circle-exclamation');
    };

    errBox?.classList.add('hidden');

    const name = document.getElementById('input-link-name').value.trim();
    const seatNo = document.getElementById('input-link-seat').value.trim();
    const password = document.getElementById('input-link-password').value;
    const nickname = document.getElementById('input-link-nickname').value.trim();
    const gradeLevel = document.getElementById('input-link-grade').value;

    if (!name || !seatNo) {
      showLinkError('請輸入學生真實姓名與 5 碼座號');
      return;
    }
    if (!/^\d{5}$/.test(seatNo)) {
      showLinkError('座號必須為 5 碼數字');
      return;
    }
    if (password && (password.length < 6 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))) {
      showLinkError('密碼需至少 6 碼英數組合');
      return;
    }

    const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 驗證中...';
      }
      showToast('正在驗證並綁定子女帳號...', 'fa-spinner fa-spin');
      const response = await apiFetch('/guardian/children/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, seatNo, password, nickname, gradeLevel })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '綁定子女失敗');

      showToast(`成功綁定子女【${data.data?.nickname || name}】！`, 'fa-link');
      document.getElementById('modal-child-form')?.classList.add('hidden');
      loadGuardianDashboard();
    } catch (err) {
      console.error(err);
      showLinkError(err.message || '綁定失敗');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnHtml;
      }
    }
  });

  // 學習追蹤與成長記錄之子女下拉選單連動
  document.getElementById('tracking-child-select')?.addEventListener('change', (e) => {
    const childId = e.target.value;
    if (childId) {
      const syncOther = document.getElementById('growth-child-select');
      if (syncOther) syncOther.value = childId;
      loadChildSummary(childId);
    }
  });

  document.getElementById('growth-child-select')?.addEventListener('change', (e) => {
    const childId = e.target.value;
    if (childId) {
      const syncOther = document.getElementById('tracking-child-select');
      if (syncOther) syncOther.value = childId;
      loadChildSummary(childId);
    }
  });
}

function switchGuardianTab(activeTab) {
  const tabs = ['children', 'tracking', 'growth', 'support', 'community'];
  tabs.forEach(tab => {
    const btn = document.getElementById(`guardian-tab-${tab}`);
    const panel = document.getElementById(`guardian-panel-${tab}`);
    if (tab === activeTab) {
      btn?.classList.add('bg-[#173852]', 'text-white', 'shadow-md');
      btn?.classList.remove('text-slate-500', 'hover:text-slate-800');
      panel?.classList.remove('hidden');
    } else {
      btn?.classList.remove('bg-[#173852]', 'text-white', 'shadow-md');
      btn?.classList.add('text-slate-500', 'hover:text-slate-800');
      panel?.classList.add('hidden');
    }
  });
  if (['tracking', 'growth'].includes(activeTab)) {
    const activeChildId = document.getElementById('tracking-child-select')?.value || document.getElementById('growth-child-select')?.value;
    if (activeChildId) loadChildSummary(activeChildId);
  }
}

async function loadGuardianDashboard() {
  if (!guardianToken) return;

  const emailBadge = document.getElementById('guardian-email-badge');
  const userDisplay = document.getElementById('guardian-user-display');
  if (currentGuardian) {
    if (emailBadge) emailBadge.textContent = currentGuardian.email;
    if (userDisplay) userDisplay.innerHTML = `歡迎，<span class="font-bold text-slate-700">${currentGuardian.displayName || currentGuardian.email}</span>`;
  }

  try {
    const response = await apiFetch('/guardian/children');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || '無法取得子女檔案');

    guardianChildren = data.data || [];
    renderGuardianChildren(guardianChildren);

    // 填充追蹤與成長選單
    const trackingSelect = document.getElementById('tracking-child-select');
    const growthSelect = document.getElementById('growth-child-select');
    if (trackingSelect && growthSelect) {
      if (guardianChildren.length === 0) {
        trackingSelect.innerHTML = '<option value="">(尚未新增子女)</option>';
        growthSelect.innerHTML = '<option value="">(尚未新增子女)</option>';
      } else {
        const optionsHtml = guardianChildren.map(c => `<option value="${c.id}">${c.nickname} (${c.linked_seat_no})</option>`).join('');
        trackingSelect.innerHTML = optionsHtml;
        growthSelect.innerHTML = optionsHtml;
        loadChildSummary(guardianChildren[0].id);
      }
    }
  } catch (err) {
    console.error(err);
    showToast('載入家長專區資料失敗', 'fa-triangle-exclamation');
  }
}

function renderGuardianChildren(children) {
  const container = document.getElementById('guardian-children-container');
  if (!container) return;

  if (!children || children.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <div class="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
          <i class="fa-solid fa-child-reaching"></i>
        </div>
        <h4 class="font-bold text-slate-700 text-sm mb-1">尚未建立任何子女檔案</h4>
        <p class="text-xs text-slate-400 mb-4">點擊右上角「+ 新增子女檔案」，系統將自動產生 5 碼專屬虛擬座號，隨時一鍵進入學習！</p>
        <button onclick="document.getElementById('btn-open-add-child-modal').click()" class="px-5 py-2.5 bg-[#173852] hover:bg-[#112a3e] text-white font-bold text-xs rounded-xl shadow-md">
          立即新增第一位子女
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = children.map(child => {
    const hasPwd = Boolean(child.has_password);
    const pwdBadge = hasPwd
      ? `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-key mr-1"></i>自主密碼已啟用</span>`
      : `<span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold"><i class="fa-solid fa-shield-cat mr-1"></i>限家長代登模式</span>`;

    return `
      <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center text-lg font-black shadow-md">
                ${child.nickname.slice(0, 1)}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-black text-base text-slate-800">${child.nickname}</h4>
                  <span class="text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-lg">${child.grade_level || '國小六年級'}</span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    座號: ${child.linked_seat_no}
                  </span>
                  ${pwdBadge}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button onclick="startChildStudy(${child.id}, '${child.nickname}', '${child.linked_seat_no}')" class="flex-1 py-2.5 bg-gradient-to-r from-[#173852] to-[#21546e] hover:from-[#112a3e] hover:to-[#173852] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all">
            <i class="fa-solid fa-rocket text-amber-400"></i> 開始學習
          </button>
          <button onclick="openEditChildModal(${child.id}, '${child.nickname}', '${child.grade_level || '國小六年級'}')" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors" title="修改資訊或重設密碼">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteChildProfile(${child.id}, '${child.nickname}')" class="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-colors" title="刪除檔案">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.startChildStudy = async function(childId, nickname, seatNo) {
  try {
    const response = await apiFetch(`/guardian/children/${childId}/select`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || '代登失敗');

    currentUser = {
      name: nickname,
      seatNo: seatNo,
      token: data.token,
      isChild: true,
      guardianLinked: true
    };
    sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));

    const subjectUserEl = document.getElementById('subject-user-name');
    if (subjectUserEl) subjectUserEl.textContent = nickname;

    showToast(`正在以 ${nickname} (座號: ${seatNo}) 開始自主學習！`, 'fa-rocket');
    showView('view-subjects');
  } catch (err) {
    console.error(err);
    showToast(err.message || '無法進入學生學習大廳', 'fa-triangle-exclamation');
  }
};

window.openEditChildModal = function(childId, nickname, gradeLevel) {
  document.getElementById('modal-child-form-title').innerHTML = '<i class="fa-solid fa-pen text-teal-600"></i> 修改子女資訊 / 密碼';
  document.getElementById('child-modal-tabs')?.classList.add('hidden');
  document.getElementById('form-child-profile')?.classList.remove('hidden');
  document.getElementById('form-child-link')?.classList.add('hidden');
  document.getElementById('input-child-id').value = childId;
  document.getElementById('input-child-nickname').value = nickname;
  document.getElementById('input-child-grade').value = gradeLevel;
  document.getElementById('input-child-password').value = '';
  document.getElementById('modal-child-form')?.classList.remove('hidden');
};

window.deleteChildProfile = function(childId, nickname) {
  openCustomModal(`確定刪除子女【${nickname}】？`, '刪除後，相關學習歷程與座號綁定將一併移除且無法復原。', async () => {
    try {
      const response = await apiFetch(`/guardian/children/${childId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || '刪除失敗');

      showToast(`已成功刪除子女檔案【${nickname}】`, 'fa-trash-can');
      loadGuardianDashboard();
    } catch (err) {
      console.error(err);
      showToast(err.message || '刪除失敗', 'fa-triangle-exclamation');
    }
  });
};

async function loadChildSummary(childId) {
  if (!childId) return;

  try {
    const response = await apiFetch(`/guardian/children/${childId}/summary`);
    const data = await response.json();
    if (!response.ok || !data.success) return;

    // 同步相容 summary 或 data.stats 或 data.summary
    const summary = data.summary || data.data?.stats || data.data?.summary || {};
    const english = summary.english || {};
    const math = summary.math || {};
    const nature = summary.nature || {};
    const social = summary.social || {};

    // 英文追蹤
    const engDays = english.completedDays ?? english.daysCompleted ?? 0;
    const engScore = english.avgScore ?? 0;
    const engQuizzes = english.quizCount ?? english.totalQuizzes ?? 0;
    const engWords = english.learnedWords ?? 0;
    const engStarred = english.starredCount ?? 0;

    const elEngDays = document.getElementById('track-eng-days');
    if (elEngDays) elEngDays.textContent = engDays;
    const elEngScore = document.getElementById('track-eng-score');
    if (elEngScore) elEngScore.textContent = engScore;
    const elEngQuizzes = document.getElementById('track-eng-quizzes');
    if (elEngQuizzes) elEngQuizzes.textContent = engQuizzes;
    const elEngWords = document.getElementById('track-eng-words');
    if (elEngWords) elEngWords.textContent = engWords;
    const elEngStarred = document.getElementById('track-eng-starred');
    if (elEngStarred) elEngStarred.textContent = engStarred;

    // 數學追蹤
    const elMathQuizzes = document.getElementById('track-math-quizzes');
    if (elMathQuizzes) elMathQuizzes.textContent = math.quizCount ?? math.totalQuizzes ?? 0;
    const elMathScore = document.getElementById('track-math-score');
    if (elMathScore) elMathScore.textContent = math.avgScore ?? 0;
    const elMathMastered = document.getElementById('track-math-mastered');
    if (elMathMastered) elMathMastered.textContent = math.masteredWrong ?? math.masteredCount ?? 0;

    // 自然追蹤
    const elNatureDays = document.getElementById('track-nature-days');
    if (elNatureDays) elNatureDays.textContent = nature.completedDays ?? nature.daysCompleted ?? nature.quizCount ?? 0;
    const elNatureScore = document.getElementById('track-nature-score');
    if (elNatureScore) elNatureScore.textContent = nature.avgScore ?? 0;
    const elNatureMastered = document.getElementById('track-nature-mastered');
    if (elNatureMastered) elNatureMastered.textContent = nature.masteredWrong ?? nature.masteredCount ?? 0;

    // 社會追蹤
    const elSocialDays = document.getElementById('track-social-days');
    if (elSocialDays) elSocialDays.textContent = social.completedDays ?? social.daysCompleted ?? social.quizCount ?? 0;
    const elSocialScore = document.getElementById('track-social-score');
    if (elSocialScore) elSocialScore.textContent = social.avgScore ?? 0;
    const elSocialMastered = document.getElementById('track-social-mastered');
    if (elSocialMastered) elSocialMastered.textContent = social.masteredWrong ?? social.masteredCount ?? 0;

    // 成長記錄精熟率進度條
    const mathTotal = Number(math.totalWrong ?? math.wrongCount ?? 0);
    const mathMastered = Number(math.masteredWrong ?? math.masteredCount ?? 0);
    const mathRate = mathTotal > 0 ? Math.round((mathMastered / mathTotal) * 100) : ((math.quizCount ?? math.totalQuizzes ?? 0) > 0 ? 100 : 0);
    const elGrowthMathRate = document.getElementById('growth-math-rate');
    if (elGrowthMathRate) elGrowthMathRate.textContent = `${mathRate}%`;
    const elGrowthMathBar = document.getElementById('growth-math-bar');
    if (elGrowthMathBar) elGrowthMathBar.style.width = `${mathRate}%`;

    const natureTotal = Number(nature.totalWrong ?? nature.wrongCount ?? 0);
    const natureMastered = Number(nature.masteredWrong ?? nature.masteredCount ?? 0);
    const natureRate = natureTotal > 0 ? Math.round((natureMastered / natureTotal) * 100) : ((nature.quizCount ?? nature.completedDays ?? 0) > 0 ? 100 : 0);
    const elGrowthNatureRate = document.getElementById('growth-nature-rate');
    if (elGrowthNatureRate) elGrowthNatureRate.textContent = `${natureRate}%`;
    const elGrowthNatureBar = document.getElementById('growth-nature-bar');
    if (elGrowthNatureBar) elGrowthNatureBar.style.width = `${natureRate}%`;

    const socialTotal = Number(social.totalWrong ?? social.wrongCount ?? 0);
    const socialMastered = Number(social.masteredWrong ?? social.masteredCount ?? 0);
    const socialRate = socialTotal > 0 ? Math.round((socialMastered / socialTotal) * 100) : ((social.quizCount ?? social.completedDays ?? 0) > 0 ? 100 : 0);
    const elGrowthSocialRate = document.getElementById('growth-social-rate');
    if (elGrowthSocialRate) elGrowthSocialRate.textContent = `${socialRate}%`;
    const elGrowthSocialBar = document.getElementById('growth-social-bar');
    if (elGrowthSocialBar) elGrowthSocialBar.style.width = `${socialRate}%`;
  } catch (err) {
    console.error('loadChildSummary error:', err);
  }
}

// 登入輔助互動彈窗提示 (依據設計稿連結)
window.showRegisterInfoModal = function() {
  if (typeof showToast === 'function') {
    showToast('課堂學生由學校統一建立名冊；家長自學方案請使用行動端 App 註冊！', 'fa-circle-info');
  } else {
    alert('課堂學生由學校統一建立名冊；家長自學方案請使用行動端 App 註冊！');
  }
};

window.showForgotPasswordInfoModal = function() {
  const msg = '請通知家長、任課老師或管理員進行密碼重置';
  if (typeof showToast === 'function') {
    showToast(msg, 'fa-key');
  } else {
    alert(msg);
  }
};

window.showOauthGuidance = function(platform) {
  if (typeof showToast === 'function') {
    showToast(`此 ${platform} 連動為家長端 App 專屬；學生課堂登入請使用上方姓名與座號。`, 'fa-mobile-screen');
  } else {
    alert(`此 ${platform} 連動為家長端 App 專屬；學生課堂登入請使用上方姓名與座號。`);
  }
};
