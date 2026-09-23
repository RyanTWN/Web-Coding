// 全局狀態管理 (支援 localStorage 持久化記憶與 sessionStorage 跨分頁同步)
let currentUser = JSON.parse(sessionStorage.getItem('g6_portal_user') || localStorage.getItem('g6_portal_user') || 'null');
let currentGuardian = JSON.parse(sessionStorage.getItem('g6_guardian_user') || localStorage.getItem('g6_guardian_user') || 'null');
let guardianToken = sessionStorage.getItem('g6_guardian_token') || localStorage.getItem('g6_guardian_token') || null;
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
    const isGuardianRoute = path.startsWith('/guardian') || path.startsWith('/dev/subscriptions');
    if (isGuardianRoute) {
      if (guardianToken) {
        headers.set('Authorization', `Bearer ${guardianToken}`);
      } else if (currentUser?.token) {
        headers.set('Authorization', `Bearer ${currentUser.token}`);
      }
    } else {
      if (currentUser?.token) {
        headers.set('Authorization', `Bearer ${currentUser.token}`);
      } else if (guardianToken) {
        headers.set('Authorization', `Bearer ${guardianToken}`);
      }
    }
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if ((response.status === 401 || (response.status === 403 && path.startsWith('/guardian'))) && !path.endsWith('/login') && !path.endsWith('/register') && !path.endsWith('/link')) {
    if (path.startsWith('/guardian')) {
      currentGuardian = null;
      guardianToken = null;
      sessionStorage.removeItem('g6_guardian_user');
      sessionStorage.removeItem('g6_guardian_token');
      localStorage.removeItem('g6_guardian_user');
      localStorage.removeItem('g6_guardian_token');
      showToast('家長登入憑證已過期，請重新登入', 'fa-lock');
      showView('view-login');
    } else {
      currentUser = null;
      sessionStorage.removeItem('g6_portal_user');
      localStorage.removeItem('g6_portal_user');
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
  renderCalendar();
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

  // 若切換至 calendar，因日曆已整併至每日學習右側欄位，直接顯示 learn 並滾動聚焦至日曆
  const shouldScrollToCalendar = (tabId === 'calendar');
  if (tabId === 'calendar') {
    tabId = 'learn';
  }

  // 1. 隱藏所有內容區塊
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
  
  // 2. 將所有按鈕重置為「未選取」狀態
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'text-rose-700', 'shadow-md', 'is-active', 'bg-brand-500', 'text-white');
    btn.classList.add('text-rose-900', 'hover:text-rose-700');
    btn.setAttribute('aria-selected', 'false');
  });

  // 3. 顯示目標內容區塊
  const view = document.getElementById(`app-view-${tabId}`);
  if(view) view.classList.remove('hidden');
  
  // 4. 為目前選中的按鈕加上選中樣式
  const navBtn = document.getElementById(`nav-${tabId}`);
  if(navBtn) {
    navBtn.classList.remove('text-rose-900', 'hover:text-rose-700', 'text-slate-500');
    navBtn.classList.add('bg-white', 'text-rose-700', 'shadow-md', 'is-active');
    navBtn.setAttribute('aria-selected', 'true');
  }

  if (tabId === 'learn') renderCalendar();
  if (tabId === 'starred') renderStarredList();

  if (shouldScrollToCalendar) {
    setTimeout(() => {
      document.getElementById('calendar-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
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
  const swatches = document.querySelectorAll('.theme-swatch');
  if (swatches.length) {
    swatches.forEach(btn => btn.parentElement?.removeChild(btn));
  }
  delete document.body.dataset.colorTheme;
  localStorage.removeItem('cool_learning_color_theme');
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

  // 切換單字時自動翻回正面
  const flashcard = document.getElementById('flashcard');
  if (flashcard) flashcard.classList.remove('is-flipped');

  const starBtn = document.getElementById('star-btn');
  if (starBtn) {
    const isStarred = starredIds.has(item.id);
    starBtn.className = isStarred
      ? "w-10 h-10 rounded-md bg-white/80 hover:bg-white text-amber-400 flex items-center justify-center text-lg shadow-sm border border-slate-200/60 transition is-starred"
      : "w-10 h-10 rounded-md bg-white/80 hover:bg-white text-slate-300 hover:text-amber-400 flex items-center justify-center text-lg shadow-sm border border-slate-200/60 transition";
    starBtn.style.color = isStarred ? '#f59e0b' : '';
    starBtn.title = isStarred ? '已加入難字本（需在「難字本拼字特訓」連續拼對 3 次方可移除）' : '點擊加入難字本';
  }

  const nextBtn = document.getElementById('btn-next-word');
  if (nextBtn) {
      if (currentIndex === today30Words.length - 1) {
        nextBtn.innerHTML = '完成學習 <i class="fa-solid fa-circle-check"></i>';
        nextBtn.className = "flex-1 max-w-[220px] py-3.5 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-md hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-2 text-sm";
      } else {
        nextBtn.innerHTML = '下一個單字 <i class="fa-solid fa-chevron-right text-base ml-1"></i>';
        nextBtn.className = "flex-1 max-w-[220px] py-3.5 px-6 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black shadow-md hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-2 text-sm";
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
  
  const counterBadge = document.getElementById('word-counter-badge');
  if (counterBadge) {
    const cur = String(currentIndex + 1).padStart(2, '0');
    const tot = String(today30Words.length).padStart(2, '0');
    counterBadge.textContent = `${cur} / ${tot}`;
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
    div.className = "bg-slate-50 border rounded-lg p-3 flex items-center justify-between";
    div.innerHTML = `
      <div><span class="font-bold text-slate-800 lowercase">${String(item.vocabulary || item.word || '').toLowerCase()}</span> <span class="text-xs text-rose-600 ml-2">${item.chinese || item.translation}</span></div>
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
    cell.className = completedDates.has(key) ? "h-8 bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center justify-center hover:bg-rose-600" : key <= todayKey ? "h-8 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center justify-center hover:bg-rose-100" : "h-8 bg-slate-50 text-slate-300 rounded-lg text-xs flex items-center justify-center";
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
        card.className = "w-full py-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold text-center";
        card.innerHTML = '<i class="fa-solid fa-circle-check text-rose-500"></i> 今日學習已完成打卡！';
      } else {
        card.className = "w-full py-3 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold text-center";
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

  // 本機開發快速進入（免驗證直接進大廳）
  const isLocalEnv = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const devQuickBox = document.getElementById('dev-quick-box');
  if (devQuickBox) {
    devQuickBox.style.display = isLocalEnv ? 'block' : 'none';
  }
  document.getElementById('btn-dev-quick-login')?.addEventListener('click', () => {
    currentUser = { name: '本機測試生', seatNo: '60101', token: 'mock-dev-token', isDev: true };
    sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
    const hName = document.getElementById('header-user-name');
    const hSeat = document.getElementById('header-user-seat');
    if (hName) hName.textContent = currentUser.name;
    if (hSeat) hSeat.textContent = `座號: ${currentUser.seatNo}`;
    const subName = document.getElementById('subject-user-name');
    if (subName) subName.textContent = currentUser.name;
    document.getElementById('user-profile-badge')?.classList.remove('hidden');
    showView('view-subjects');
    showToast('已以本機測試學生身分進入大廳', 'fa-flask');
  });

  // 登出與首頁
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('g6_portal_user');
    localStorage.removeItem('g6_portal_user');
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
    if (currentGuardian && guardianToken) {
      showView('view-guardian-dashboard');
      loadGuardianDashboard();
      return;
    }
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
        localStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
        
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
      renderCalendar();
      showToast('恭喜完成今日 30 字學習，已成功打卡！', 'fa-trophy');
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
  const guardianTabs = ['children', 'tracking', 'growth', 'physical', 'support', 'community'];
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

  const openAddChildModal = () => {
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
  };

  window.openAddChildModal = openAddChildModal;
  document.getElementById('btn-add-child-modal')?.addEventListener('click', openAddChildModal);
  document.getElementById('btn-open-add-child-modal')?.addEventListener('click', openAddChildModal);

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
    const gender = document.getElementById('input-child-gender')?.value || 'boy';
    const birthday = document.getElementById('input-child-birthday')?.value || null;
    const childPassword = document.getElementById('input-child-password').value;

    if (childPassword && (childPassword.length < 6 || !/[A-Za-z]/.test(childPassword) || !/[0-9]/.test(childPassword))) {
      showToast('子女登入密碼需至少 6 碼英數組合', 'fa-triangle-exclamation');
      return;
    }

    try {
      const url = childId ? `/guardian/children/${childId}` : '/guardian/children';
      const method = childId ? 'PUT' : 'POST';
      const payload = { nickname, gradeLevel, gender, birthday };
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

  // 學習追蹤、學習成長與生理成長記錄之子女下拉選單連動
  const syncAndLoadChild = (childId) => {
    if (!childId) return;
    ['tracking-child-select', 'growth-child-select', 'physical-child-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value !== childId) el.value = childId;
    });
    loadChildSummary(childId);
    loadChildGrowth(childId);
  };

  document.getElementById('tracking-child-select')?.addEventListener('change', (e) => syncAndLoadChild(e.target.value));
  document.getElementById('growth-child-select')?.addEventListener('change', (e) => syncAndLoadChild(e.target.value));
  document.getElementById('physical-child-select')?.addEventListener('change', (e) => syncAndLoadChild(e.target.value));
}

function switchGuardianTab(activeTab) {
  const tabs = ['children', 'tracking', 'growth', 'physical', 'support', 'community'];
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

  const activeChildId = document.getElementById('physical-child-select')?.value
    || document.getElementById('tracking-child-select')?.value
    || document.getElementById('growth-child-select')?.value;
  if (activeChildId) {
    if (activeTab === 'physical') {
      loadChildGrowth(activeChildId);
    } else if (['tracking', 'growth'].includes(activeTab)) {
      loadChildSummary(activeChildId);
    }
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

  const container = document.getElementById('guardian-children-list') || document.getElementById('guardian-children-container');
  if (container && (!guardianChildren || guardianChildren.length === 0)) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 text-teal-600"></i>
        <p class="text-xs font-medium">正在載入子女檔案...</p>
      </div>
    `;
  }

  try {
    const response = await apiFetch('/guardian/children');
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || '無法取得子女檔案');

    guardianChildren = data.data || [];
    renderGuardianChildren(guardianChildren);

    // 填充追蹤、學習成長與生理成長選單
    const trackingSelect = document.getElementById('tracking-child-select');
    const growthSelect = document.getElementById('growth-child-select');
    const physicalSelect = document.getElementById('physical-child-select');
    if (trackingSelect || growthSelect || physicalSelect) {
      if (guardianChildren.length === 0) {
        if (trackingSelect) trackingSelect.innerHTML = '<option value="">(尚未新增子女)</option>';
        if (growthSelect) growthSelect.innerHTML = '<option value="">(尚未新增子女)</option>';
        if (physicalSelect) physicalSelect.innerHTML = '<option value="">(尚未新增子女)</option>';
      } else {
        const optionsHtml = guardianChildren.map(c => `<option value="${c.id}">${c.nickname} (${c.linked_seat_no})</option>`).join('');
        if (trackingSelect) trackingSelect.innerHTML = optionsHtml;
        if (growthSelect) growthSelect.innerHTML = optionsHtml;
        if (physicalSelect) physicalSelect.innerHTML = optionsHtml;
        loadChildSummary(guardianChildren[0].id);
        loadChildGrowth(guardianChildren[0].id);
      }
    }
  } catch (err) {
    console.error(err);
    showToast('載入家長專區資料失敗', 'fa-triangle-exclamation');
    if (container) {
      container.innerHTML = `
        <div class="col-span-full py-10 px-4 text-center bg-rose-50/60 rounded-lg border border-rose-200">
          <i class="fa-solid fa-triangle-exclamation text-rose-500 text-2xl mb-2"></i>
          <p class="text-xs font-bold text-rose-700 mb-2">載入子女檔案失敗：${err.message || '網路或伺服器連線異常'}</p>
          <button onclick="loadGuardianDashboard()" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm">
            <i class="fa-solid fa-rotate-right mr-1"></i> 重新載入
          </button>
        </div>
      `;
    }
  }
}

function renderGuardianChildren(children) {
  const container = document.getElementById('guardian-children-list') || document.getElementById('guardian-children-container');
  if (!container) return;

  if (!children || children.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-4 text-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div class="w-14 h-14 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
          <i class="fa-solid fa-child-reaching"></i>
        </div>
        <h4 class="font-bold text-slate-700 text-sm mb-1">尚未建立任何子女檔案</h4>
        <p class="text-xs text-slate-400 mb-4">點擊右上角「+ 新增 / 綁定子女」，系統將自動產生 5 碼專屬虛擬座號，隨時一鍵進入學習！</p>
        <button onclick="window.openAddChildModal ? window.openAddChildModal() : (document.getElementById('btn-add-child-modal') || document.getElementById('btn-open-add-child-modal'))?.click()" class="px-5 py-2.5 bg-[#173852] hover:bg-[#112a3e] text-white font-bold text-xs rounded-lg shadow-md">
          <i class="fa-solid fa-user-plus mr-1.5"></i>立即新增第一位子女
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
    const initialChar = (child.nickname || '子').slice(0, 1);

    return `
      <div class="bg-white rounded-lg p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-md bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center text-lg font-black shadow-md">
                ${initialChar}
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
          <button onclick="startChildStudy(${child.id})" class="flex-1 py-2.5 bg-gradient-to-r from-[#173852] to-[#21546e] hover:from-[#112a3e] hover:to-[#173852] text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all">
            <i class="fa-solid fa-rocket text-amber-400"></i> 開始學習
          </button>
          <button onclick="openEditChildModal(${child.id})" class="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-colors" title="修改資訊或重設密碼">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button onclick="deleteChildProfile(${child.id})" class="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-lg transition-colors" title="刪除檔案">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.startChildStudy = async function(childId, nickname, seatNo) {
  const child = guardianChildren.find(c => c.id === Number(childId));
  const targetNickname = nickname || child?.nickname || '子女';
  const targetSeatNo = seatNo || child?.linked_seat_no || '';

  try {
    const response = await apiFetch(`/guardian/children/${childId}/select`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error || '代登失敗');

    currentUser = {
      name: targetNickname,
      seatNo: targetSeatNo,
      token: data.token,
      isChild: true,
      guardianLinked: true
    };
    sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
    localStorage.setItem('g6_portal_user', JSON.stringify(currentUser));

    const subjectUserEl = document.getElementById('subject-user-name');
    if (subjectUserEl) subjectUserEl.textContent = targetNickname;

    showToast(`正在以 ${targetNickname} (座號: ${targetSeatNo}) 開始自主學習！`, 'fa-rocket');
    showView('view-subjects');
  } catch (err) {
    console.error(err);
    showToast(err.message || '無法進入學生學習大廳', 'fa-triangle-exclamation');
  }
};

window.openEditChildModal = function(childId, nickname, gradeLevel) {
  const child = guardianChildren.find(c => c.id === Number(childId));
  const targetNickname = nickname || child?.nickname || '';
  const targetGrade = gradeLevel || child?.grade_level || '國小六年級';

  document.getElementById('modal-child-form-title').innerHTML = '<i class="fa-solid fa-pen text-teal-600"></i> 修改子女資訊 / 密碼';
  document.getElementById('child-modal-tabs')?.classList.add('hidden');
  document.getElementById('form-child-profile')?.classList.remove('hidden');
  document.getElementById('form-child-link')?.classList.add('hidden');
  document.getElementById('input-child-id').value = childId;
  document.getElementById('input-child-nickname').value = targetNickname;
  document.getElementById('input-child-grade').value = targetGrade;
  if (document.getElementById('input-child-gender')) {
    document.getElementById('input-child-gender').value = child?.gender || 'boy';
  }
  if (document.getElementById('input-child-birthday')) {
    document.getElementById('input-child-birthday').value = child?.birthday ? String(child.birthday).slice(0, 10) : '';
  }
  document.getElementById('input-child-password').value = '';
  document.getElementById('modal-child-form')?.classList.remove('hidden');
};

window.deleteChildProfile = function(childId, nickname) {
  const child = guardianChildren.find(c => c.id === Number(childId));
  const targetNickname = nickname || child?.nickname || '此子女';

  openCustomModal(`確定刪除子女【${targetNickname}】？`, '刪除後，相關學習歷程與座號綁定將一併移除且無法復原。', async () => {
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

// ============================================================
// 生理成長記錄與台灣 0-18 歲兒童生長曲線百分位常模系統
// ============================================================

const TAIWAN_GROWTH_NORMS = {
  ages: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  boy: {
    height: {
      p3:  [46.1, 71.0, 82.5, 90.7, 97.6, 104.0, 110.0, 115.5, 120.5, 125.0, 130.0, 134.5, 140.5, 148.0, 155.0, 160.0, 162.5, 163.5, 164.0],
      p15: [47.9, 73.4, 85.1, 93.5, 100.5, 107.0, 113.5, 119.0, 124.5, 129.5, 135.0, 140.0, 147.0, 155.0, 161.5, 165.5, 167.5, 168.5, 169.0],
      p50: [49.9, 75.7, 87.8, 96.1, 103.3, 110.0, 117.0, 123.0, 128.5, 134.0, 140.0, 146.0, 154.0, 162.0, 168.0, 171.0, 172.5, 173.5, 174.0],
      p85: [51.8, 78.1, 90.4, 99.1, 106.4, 113.5, 121.0, 127.5, 133.5, 139.5, 146.0, 153.0, 161.5, 169.5, 174.5, 177.0, 178.5, 179.5, 180.0],
      p97: [53.7, 80.5, 93.2, 102.1, 109.5, 117.0, 125.0, 132.0, 138.5, 145.0, 152.0, 160.0, 168.5, 175.5, 180.0, 182.0, 183.5, 184.5, 185.0]
    },
    weight: {
      p3:  [2.5, 7.7,  9.7, 11.3, 12.7, 14.1, 16.0, 18.0, 20.5, 23.0, 26.0, 29.0, 33.0, 38.0, 43.0, 47.0, 50.0, 52.0, 53.0],
      p15: [2.9, 8.6, 10.8, 12.7, 14.4, 16.1, 18.0, 20.5, 23.0, 26.0, 29.5, 34.0, 38.5, 44.0, 49.0, 53.0, 55.5, 57.5, 58.5],
      p50: [3.3, 9.6, 12.2, 14.3, 16.3, 18.3, 20.5, 23.5, 26.5, 30.5, 35.0, 40.5, 46.5, 52.5, 57.5, 61.5, 64.0, 65.5, 66.5],
      p85: [3.9, 10.8, 13.6, 16.2, 18.6, 21.2, 24.0, 28.0, 32.0, 37.0, 43.0, 49.5, 56.5, 63.0, 68.0, 71.5, 74.0, 76.0, 77.0],
      p97: [4.4, 12.0, 15.3, 18.3, 21.2, 24.2, 28.0, 33.0, 38.0, 45.0, 52.0, 60.0, 67.5, 74.0, 79.0, 82.5, 85.0, 87.0, 88.0]
    },
    bmi: {
      p3:  [11.5, 14.3, 14.1, 13.7, 13.5, 13.4, 13.5, 13.7, 14.0, 14.4, 14.9, 15.4, 16.0, 16.6, 17.2, 17.8, 18.2, 18.5, 18.7],
      p15: [12.4, 15.1, 14.8, 14.5, 14.2, 14.1, 14.2, 14.4, 14.8, 15.3, 15.9, 16.5, 17.2, 17.9, 18.6, 19.2, 19.7, 20.0, 20.3],
      p50: [13.4, 16.2, 15.7, 15.3, 15.1, 15.1, 15.2, 15.5, 16.0, 16.7, 17.4, 18.2, 19.0, 19.8, 20.6, 21.3, 21.9, 22.3, 22.5],
      p85: [14.6, 17.3, 16.8, 16.5, 16.3, 16.4, 16.7, 17.3, 18.0, 18.9, 19.9, 20.9, 21.9, 22.8, 23.6, 24.3, 24.8, 25.2, 25.5],
      p97: [15.8, 18.5, 18.0, 17.7, 17.6, 17.8, 18.3, 19.2, 20.2, 21.4, 22.6, 23.8, 24.9, 25.8, 26.6, 27.2, 27.8, 28.2, 28.5]
    }
  },
  girl: {
    height: {
      p3:  [45.4, 68.9, 80.0, 88.7, 96.0, 102.5, 108.5, 114.0, 119.0, 124.0, 129.5, 135.5, 142.5, 147.0, 149.5, 150.5, 151.0, 151.5, 151.5],
      p15: [47.2, 71.4, 83.2, 91.9, 99.1, 105.8, 112.0, 118.0, 123.0, 128.5, 134.5, 141.5, 148.0, 152.0, 154.0, 155.0, 155.5, 156.0, 156.0],
      p50: [49.1, 74.0, 86.4, 95.1, 102.3, 109.0, 115.5, 121.5, 127.0, 133.0, 139.5, 147.0, 153.0, 156.5, 158.5, 159.5, 160.0, 160.5, 160.5],
      p85: [51.0, 76.6, 89.6, 98.2, 105.5, 112.5, 119.5, 126.0, 132.0, 138.5, 145.5, 153.5, 158.5, 161.5, 163.0, 164.0, 164.5, 165.0, 165.0],
      p97: [52.9, 79.2, 92.9, 101.4, 108.8, 116.0, 124.0, 130.5, 137.0, 144.0, 151.5, 159.0, 164.0, 166.5, 167.5, 168.0, 168.5, 169.0, 169.0]
    },
    weight: {
      p3:  [2.4, 7.0,  9.0, 10.8, 12.3, 13.7, 15.3, 17.2, 19.3, 21.8, 24.8, 28.5, 33.0, 37.0, 40.0, 41.5, 42.5, 43.0, 43.0],
      p15: [2.8, 7.9, 10.2, 12.2, 14.0, 15.6, 17.3, 19.5, 22.0, 25.0, 28.5, 33.0, 38.0, 42.0, 44.5, 46.0, 47.0, 47.5, 47.5],
      p50: [3.2, 8.9, 11.5, 13.9, 16.0, 17.9, 19.9, 22.5, 25.5, 29.5, 34.0, 39.5, 44.5, 48.5, 51.0, 52.5, 53.5, 54.0, 54.0],
      p85: [3.7, 10.1, 13.0, 15.8, 18.5, 20.8, 23.4, 27.0, 31.0, 36.0, 41.5, 47.5, 53.0, 56.5, 58.5, 60.0, 61.0, 61.5, 62.0],
      p97: [4.2, 11.5, 14.8, 18.0, 21.3, 24.3, 27.6, 32.0, 37.0, 43.5, 50.0, 56.5, 62.0, 65.5, 67.5, 69.0, 70.0, 70.5, 71.0]
    },
    bmi: {
      p3:  [11.2, 13.8, 13.7, 13.4, 13.2, 13.1, 13.2, 13.4, 13.7, 14.1, 14.7, 15.4, 16.1, 16.8, 17.3, 17.7, 17.9, 18.0, 18.0],
      p15: [12.0, 14.6, 14.4, 14.1, 13.8, 13.8, 13.9, 14.2, 14.6, 15.1, 15.7, 16.4, 17.2, 17.9, 18.4, 18.8, 19.0, 19.2, 19.2],
      p50: [13.1, 15.6, 15.3, 14.9, 14.7, 14.7, 14.9, 15.3, 15.8, 16.4, 17.2, 18.0, 18.8, 19.5, 20.0, 20.4, 20.6, 20.8, 20.8],
      p85: [14.2, 16.8, 16.4, 16.1, 16.0, 16.1, 16.5, 17.1, 17.8, 18.7, 19.7, 20.7, 21.6, 22.4, 22.9, 23.3, 23.6, 23.8, 23.9],
      p97: [15.4, 18.0, 17.6, 17.4, 17.3, 17.6, 18.2, 19.0, 20.0, 21.2, 22.4, 23.6, 24.6, 25.4, 26.0, 26.4, 26.7, 26.9, 27.0]
    }
  }
};

let currentGrowthChildId = null;
let currentGrowthMetric = 'height'; // 'height' | 'weight' | 'bmi'
let currentGrowthRecords = [];
let currentChildBio = { gender: 'boy', birthday: null, nickname: '', grade_level: '國小六年級' };
let growthChartInstance = null;

// 計算年齡詳細資訊 (年、月、浮點數、文字)
function calculateChildAge(birthdayStr, recordDateStr = null, gradeLevel = '國小六年級') {
  const refDate = recordDateStr ? new Date(recordDateStr) : new Date();
  if (birthdayStr) {
    const bday = new Date(birthdayStr);
    if (!isNaN(bday.getTime())) {
      let years = refDate.getFullYear() - bday.getFullYear();
      let months = refDate.getMonth() - bday.getMonth();
      if (refDate.getDate() < bday.getDate()) months--;
      if (months < 0) { years--; months += 12; }
      years = Math.max(0, years);
      months = Math.max(0, months);
      const ageDecimal = Math.max(0, Math.min(18, years + months / 12));
      return { years, months, ageDecimal, display: `${years} 歲 ${months} 個月`, isEstimated: false };
    }
  }

  // 預設年齡推算 (國小六年級約 11 歲 8 個月)
  let estYears = 11;
  let estMonths = 8;
  if (gradeLevel === '國小四年級') { estYears = 9; estMonths = 6; }
  else if (gradeLevel === '國小五年級') { estYears = 10; estMonths = 6; }
  else if (gradeLevel === '國中七年級') { estYears = 12; estMonths = 8; }

  const ageDecimal = estYears + estMonths / 12;
  return { years: estYears, months: estMonths, ageDecimal, display: `${estYears} 歲 ${estMonths} 個月 (預估)`, isEstimated: true };
}

// 線性內插計算指定年齡的常模百分位數值
function interpolateNormValue(dataset, age) {
  const ages = TAIWAN_GROWTH_NORMS.ages;
  const clampedAge = Math.max(0, Math.min(18, age));
  const lowerIdx = Math.floor(clampedAge);
  const upperIdx = Math.min(18, Math.ceil(clampedAge));
  if (lowerIdx === upperIdx) return dataset[lowerIdx];
  const ratio = clampedAge - lowerIdx;
  return dataset[lowerIdx] + (dataset[upperIdx] - dataset[lowerIdx]) * ratio;
}

// 評估生長百分位落點與衛教評語
function evaluatePercentileStatus(metric, value, ageDecimal, gender = 'boy') {
  const genderNorms = TAIWAN_GROWTH_NORMS[gender] || TAIWAN_GROWTH_NORMS.boy;
  const data = genderNorms[metric] || genderNorms.height;

  const vP3 = interpolateNormValue(data.p3, ageDecimal);
  const vP15 = interpolateNormValue(data.p15, ageDecimal);
  const vP50 = interpolateNormValue(data.p50, ageDecimal);
  const vP85 = interpolateNormValue(data.p85, ageDecimal);
  const vP97 = interpolateNormValue(data.p97, ageDecimal);

  if (value < vP3) {
    return {
      percentileText: '< 3rd',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      statusText: metric === 'weight' ? '體重過輕' : (metric === 'bmi' ? '體重過輕' : '生長落後需關注'),
      color: '#e11d48'
    };
  } else if (value < vP15) {
    return {
      percentileText: '3rd ~ 15th',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      statusText: '生長稍偏小',
      color: '#d97706'
    };
  } else if (value <= vP85) {
    const approx = value <= vP50
      ? Math.round(15 + ((value - vP15) / (vP50 - vP15 || 1)) * 35)
      : Math.round(50 + ((value - vP50) / (vP85 - vP50 || 1)) * 35);
    return {
      percentileText: `約 ${approx}th`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      statusText: '生長正常健康',
      color: '#059669'
    };
  } else if (value <= vP97) {
    return {
      percentileText: '85th ~ 97th',
      badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
      statusText: metric === 'height' ? '身形高大' : '體重偏重',
      color: '#0d9488'
    };
  } else {
    return {
      percentileText: '> 97th',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      statusText: metric === 'height' ? '身形超群' : '需留意體重管理',
      color: '#7c3aed'
    };
  }
}

// 載入指定子女之生理成長記錄與基本資料
async function loadChildGrowth(childId) {
  if (!childId) return;
  currentGrowthChildId = Number(childId);

  // 嘗試從當前 guardianChildren 清單中獲取性別與生日快取
  const foundChild = (guardianChildren || []).find(c => c.id === currentGrowthChildId);
  if (foundChild) {
    currentChildBio = {
      nickname: foundChild.nickname || '子女',
      gender: foundChild.gender || 'boy',
      birthday: foundChild.birthday ? String(foundChild.birthday).slice(0, 10) : null,
      grade_level: foundChild.grade_level || '國小六年級',
      linked_seat_no: foundChild.linked_seat_no
    };
  }

  // 預設日期設為今天
  const inputDate = document.getElementById('input-growth-date');
  if (inputDate && !inputDate.value) {
    inputDate.value = new Date().toISOString().slice(0, 10);
  }

  try {
    const res = await apiFetch(`/guardian/children/${currentGrowthChildId}/growth`);
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.child) {
        currentChildBio = {
          ...currentChildBio,
          ...data.child
        };
      }
      currentGrowthRecords = data.records || [];
      // 快取至 localStorage 供離線備份
      localStorage.setItem(`g6_growth_${currentGrowthChildId}`, JSON.stringify({
        child: currentChildBio,
        records: currentGrowthRecords
      }));
    } else {
      throw new Error(data.error || '無法載入伺服器成長記錄');
    }
  } catch (err) {
    console.warn('loadChildGrowth apiFetch 警告 (切換至本地快取或預設模式):', err);
    const cached = localStorage.getItem(`g6_growth_${currentGrowthChildId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.child) currentChildBio = { ...currentChildBio, ...parsed.child };
        currentGrowthRecords = parsed.records || [];
      } catch (_) {}
    } else {
      // 若完全無紀錄，提供國小六年級標準參考示範點，讓圖表有畫面可看
      currentGrowthRecords = [
        {
          id: 'demo-1',
          record_date: '2024-11-21',
          height_cm: 148.5,
          weight_kg: 39.2,
          bmi: 17.8,
          note: '六年級健檢'
        }
      ];
    }
  }

  renderChildBioUI();
  renderGrowthQuickStats();
  renderGrowthHistoryList();
  renderGrowthCurveChart();
}

// 渲染子女性別、年齡標籤
function renderChildBioUI() {
  const genderBadge = document.getElementById('physical-gender-badge');
  const ageText = document.getElementById('physical-age-text');
  const isGirl = currentChildBio.gender === 'girl';

  if (genderBadge) {
    if (isGirl) {
      genderBadge.className = 'px-1.5 py-0.5 rounded text-[11px] bg-pink-100 text-pink-700 font-bold';
      genderBadge.innerHTML = '<i class="fa-solid fa-venus"></i> 女童';
    } else {
      genderBadge.className = 'px-1.5 py-0.5 rounded text-[11px] bg-blue-100 text-blue-700 font-bold';
      genderBadge.innerHTML = '<i class="fa-solid fa-mars"></i> 男童';
    }
  }

  const ageInfo = calculateChildAge(currentChildBio.birthday, null, currentChildBio.grade_level);
  if (ageText) {
    ageText.textContent = ageInfo.display;
  }
}

// 渲染最新生理指標摘要條
function renderGrowthQuickStats() {
  const elHeight = document.getElementById('quick-height');
  const elWeight = document.getElementById('quick-weight');
  const elBmi = document.getElementById('quick-bmi');
  const elPercentilePill = document.getElementById('quick-percentile-pill');
  const elPercentile = document.getElementById('quick-percentile');

  if (currentGrowthRecords.length === 0) {
    if (elHeight) elHeight.textContent = '--';
    if (elWeight) elWeight.textContent = '--';
    if (elBmi) elBmi.textContent = '--';
    if (elPercentile) elPercentile.textContent = '尚無量測記錄';
    if (elPercentilePill) elPercentilePill.className = 'bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1';
    return;
  }

  // 取最新一筆記錄 (依 record_date 由新至舊排序)
  const sorted = [...currentGrowthRecords].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
  const latest = sorted[0];

  if (elHeight) elHeight.textContent = latest.height_cm;
  if (elWeight) elWeight.textContent = latest.weight_kg;
  if (elBmi) elBmi.textContent = latest.bmi;

  const ageInfo = calculateChildAge(currentChildBio.birthday, latest.record_date, currentChildBio.grade_level);
  const evalH = evaluatePercentileStatus('height', latest.height_cm, ageInfo.ageDecimal, currentChildBio.gender);

  if (elPercentile) elPercentile.textContent = `${evalH.percentileText} (${evalH.statusText})`;
  if (elPercentilePill) {
    elPercentilePill.className = `${evalH.badgeClass} border px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all`;
  }
}

// 取得孩子當前年齡與預設前後各 1 年範圍 (共 2 年區間)
function getChildDefaultAgeRange() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const ageInfo = calculateChildAge(currentChildBio.birthday, todayStr, currentChildBio.grade_level);
  let centerAge = Number(ageInfo.ageDecimal.toFixed(2));
  if (isNaN(centerAge) || centerAge < 0) centerAge = 10;
  if (centerAge > 18) centerAge = 18;

  let defaultMin = Number((centerAge - 1.0).toFixed(2));
  let defaultMax = Number((centerAge + 1.0).toFixed(2));

  if (defaultMin < 0) {
    defaultMin = 0;
    defaultMax = Math.min(18, 2.0);
  } else if (defaultMax > 18) {
    defaultMax = 18;
    defaultMin = Math.max(0, 16.0);
  }

  return { defaultMin, defaultMax, centerAge, ageText: ageInfo.ageStr };
}

// 更新圖表範圍文字提示
function updateGrowthChartRangeDisplay(chart) {
  const rangeEl = document.getElementById('growth-chart-range-text');
  if (!rangeEl) return;
  const targetChart = chart || growthChartInstance;
  if (!targetChart || !targetChart.scales || !targetChart.scales.x) return;

  const minVal = Math.max(0, targetChart.scales.x.min).toFixed(1);
  const maxVal = Math.min(18, targetChart.scales.x.max).toFixed(1);
  const { centerAge } = getChildDefaultAgeRange();
  rangeEl.textContent = `顯示範圍：${minVal} 歲 ～ ${maxVal} 歲 (當前: ${centerAge}歲)`;
}

// 放大 (時間軸縮短) / 縮小 (時間軸拉長)
function zoomGrowthChart(direction) {
  if (!growthChartInstance || !growthChartInstance.scales || !growthChartInstance.scales.x) return;
  const currentMin = growthChartInstance.scales.x.min;
  const currentMax = growthChartInstance.scales.x.max;
  const currentSpan = Math.max(0.2, currentMax - currentMin);
  const center = (currentMin + currentMax) / 2;

  // 放大時區間縮短為 70%，縮小時區間擴大為 140%
  let newSpan = direction === 'in' ? currentSpan * 0.7 : currentSpan * 1.4;
  if (newSpan < 0.5) newSpan = 0.5; // 最少檢視半年 (0.5歲)
  if (newSpan > 18) newSpan = 18;   // 最多檢視 18 歲

  let newMin = center - newSpan / 2;
  let newMax = center + newSpan / 2;

  if (newMin < 0) {
    newMin = 0;
    newMax = Math.min(18, newSpan);
  } else if (newMax > 18) {
    newMax = 18;
    newMin = Math.max(0, 18 - newSpan);
  }

  growthChartInstance.options.scales.x.min = Number(newMin.toFixed(2));
  growthChartInstance.options.scales.x.max = Number(newMax.toFixed(2));
  growthChartInstance.update();
  updateGrowthChartRangeDisplay(growthChartInstance);
}

// 回到預設：顯示前後各 1 年
function resetGrowthChartDefaultRange() {
  if (!growthChartInstance) return;
  const { defaultMin, defaultMax } = getChildDefaultAgeRange();
  growthChartInstance.options.scales.x.min = defaultMin;
  growthChartInstance.options.scales.x.max = defaultMax;
  growthChartInstance.update();
  updateGrowthChartRangeDisplay(growthChartInstance);
}

// 檢視全部 0-18 歲
function resetGrowthChartFullRange() {
  if (!growthChartInstance) return;
  growthChartInstance.options.scales.x.min = 0;
  growthChartInstance.options.scales.x.max = 18;
  growthChartInstance.update();
  updateGrowthChartRangeDisplay(growthChartInstance);
}

// 繪製 0-18 歲兒童生長曲線百分位圖表 (Chart.js)
function renderGrowthCurveChart() {
  const canvas = document.getElementById('growth-curve-canvas');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js 尚未載入，稍候重試');
    setTimeout(renderGrowthCurveChart, 300);
    return;
  }

  const gender = currentChildBio.gender === 'girl' ? 'girl' : 'boy';
  const metric = currentGrowthMetric; // 'height' | 'weight' | 'bmi'
  const normData = TAIWAN_GROWTH_NORMS[gender][metric];
  const ages = TAIWAN_GROWTH_NORMS.ages;

  // 常模資料轉為 {x, y} 物件陣列，確保線性座標軸縮放、平移與裁切時順暢
  const toPoints = (arr) => arr.map((v, i) => ({ x: ages[i], y: v }));

  // 整理孩子的實際測量資料點
  const childPoints = currentGrowthRecords.map(r => {
    const ageInfo = calculateChildAge(currentChildBio.birthday, r.record_date, currentChildBio.grade_level);
    let val = r.height_cm;
    if (metric === 'weight') val = r.weight_kg;
    else if (metric === 'bmi') val = r.bmi;
    return {
      x: Number(ageInfo.ageDecimal.toFixed(2)),
      y: Number(val),
      recordDate: r.record_date,
      note: r.note || '',
      height: r.height_cm,
      weight: r.weight_kg,
      bmi: r.bmi
    };
  }).filter(pt => pt.x >= 0 && pt.x <= 18);

  const metricLabel = metric === 'height' ? '身高 (cm)' : (metric === 'weight' ? '體重 (kg)' : 'BMI (kg/m²)');
  const { defaultMin, defaultMax } = getChildDefaultAgeRange();

  if (growthChartInstance) {
    growthChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  growthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        // 孩子實測點
        {
          label: '【孩子量測記錄】',
          data: childPoints,
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2.5,
          showLine: true,
          borderDash: [4, 4],
          borderWidth: 2,
          tension: 0.2,
          order: 1
        },
        // 常模 P97
        {
          label: 'P97 (97%)',
          data: toPoints(normData.p97),
          borderColor: '#475569',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          order: 2
        },
        // 常模 P85
        {
          label: 'P85 (85%)',
          data: toPoints(normData.p85),
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: '+1',
          tension: 0.35,
          order: 3
        },
        // 常模 P50 (中位線)
        {
          label: 'P50 (中位標準)',
          data: toPoints(normData.p50),
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.12)',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: '-1',
          tension: 0.35,
          order: 4
        },
        // 常模 P15
        {
          label: 'P15 (15%)',
          data: toPoints(normData.p15),
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: '+1',
          tension: 0.35,
          order: 5
        },
        // 常模 P3
        {
          label: 'P3 (3%)',
          data: toPoints(normData.p3),
          borderColor: '#6366f1',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          tension: 0.35,
          order: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        // Chart.js Zoom 插件設定 (支援手勢 Pinch / 滾輪 Wheel / 拖曳 Pan)
        zoom: {
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: null,
            onPanComplete: function({ chart }) {
              updateGrowthChartRangeDisplay(chart);
            }
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1
            },
            pinch: {
              enabled: true
            },
            mode: 'x',
            onZoomComplete: function({ chart }) {
              updateGrowthChartRangeDisplay(chart);
            }
          },
          limits: {
            x: { min: 0, max: 18, minRange: 0.5 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title: function(items) {
              const item = items[0];
              if (item.datasetIndex === 0) {
                const raw = item.raw;
                return `測量日期：${raw.recordDate || ''} (年齡: ${raw.x} 歲)`;
              }
              const xVal = item.raw && typeof item.raw.x !== 'undefined' ? item.raw.x : item.label;
              return `年齡：${xVal} 歲常模`;
            },
            label: function(item) {
              if (item.datasetIndex === 0) {
                const raw = item.raw;
                return `孩子記錄：${raw.y} ${metric === 'height' ? 'cm' : (metric === 'weight' ? 'kg' : '')} ｜ 身高:${raw.height}cm 體重:${raw.weight}kg BMI:${raw.bmi}`;
              }
              const yVal = item.raw && typeof item.raw.y !== 'undefined' ? item.raw.y : item.formattedValue;
              return `${item.dataset.label}：${yVal} ${metric === 'height' ? 'cm' : (metric === 'weight' ? 'kg' : '')}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: '年齡 (歲)',
            font: { size: 11, weight: 'bold' },
            color: '#64748b'
          },
          min: defaultMin,
          max: defaultMax,
          ticks: {
            stepSize: (defaultMax - defaultMin) <= 3 ? 0.5 : 1,
            font: { size: 10 }
          },
          grid: {
            color: '#f1f5f9'
          }
        },
        y: {
          title: {
            display: true,
            text: metricLabel,
            font: { size: 11, weight: 'bold' },
            color: '#64748b'
          },
          ticks: {
            font: { size: 10 }
          },
          grid: {
            color: '#f1f5f9'
          }
        }
      }
    }
  });

  updateGrowthChartRangeDisplay(growthChartInstance);
}

// 渲染近期測量紀錄歷史清單
function renderGrowthHistoryList() {
  const container = document.getElementById('growth-history-container');
  const countSpan = document.getElementById('growth-records-count');
  if (!container) return;

  if (countSpan) countSpan.textContent = `共 ${currentGrowthRecords.length} 筆`;

  if (currentGrowthRecords.length === 0) {
    container.innerHTML = `
      <div class="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <i class="fa-solid fa-ruler-vertical text-slate-300 text-2xl mb-1.5"></i>
        <p class="text-xs font-bold text-slate-500">尚無量測記錄</p>
        <p class="text-[11px] text-slate-400 mt-0.5">歡迎使用上方表單登錄孩子的身高與體重！</p>
      </div>
    `;
    return;
  }

  // 依日期降冪排序
  const sorted = [...currentGrowthRecords].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));

  container.innerHTML = sorted.map(rec => {
    const ageInfo = calculateChildAge(currentChildBio.birthday, rec.record_date, currentChildBio.grade_level);
    const evalH = evaluatePercentileStatus('height', rec.height_cm, ageInfo.ageDecimal, currentChildBio.gender);

    return `
      <div class="p-3 bg-white hover:bg-slate-50/80 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3 shadow-xs">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-800">${rec.record_date}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${ageInfo.display}</span>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${evalH.badgeClass}">${evalH.statusText}</span>
          </div>
          <div class="text-[11px] text-slate-600 font-medium flex items-center gap-3">
            <span>身高：<b class="text-slate-800 font-bold">${rec.height_cm}</b> cm</span>
            <span>體重：<b class="text-slate-800 font-bold">${rec.weight_kg}</b> kg</span>
            <span>BMI：<b class="text-teal-700 font-bold">${rec.bmi}</b></span>
            ${rec.note ? `<span class="text-slate-400 text-[10px]">(${rec.note})</span>` : ''}
          </div>
        </div>

        <button type="button" onclick="deleteChildGrowthRecord('${rec.id}')" title="刪除此紀錄" class="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `;
  }).join('');
}

// 刪除一筆測量記錄
window.deleteChildGrowthRecord = async function(recordId) {
  if (!currentGrowthChildId || !recordId) return;

  openCustomModal('確定要刪除此筆測量紀錄？', '刪除後，生長曲線圖表將即時重繪更新。', async () => {
    try {
      if (typeof recordId === 'number' || (typeof recordId === 'string' && !recordId.startsWith('demo-'))) {
        const res = await apiFetch(`/guardian/children/${currentGrowthChildId}/growth/${recordId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '刪除失敗');
      }

      currentGrowthRecords = currentGrowthRecords.filter(r => String(r.id) !== String(recordId));
      localStorage.setItem(`g6_growth_${currentGrowthChildId}`, JSON.stringify({
        child: currentChildBio,
        records: currentGrowthRecords
      }));

      showToast('測量紀錄已成功刪除', 'fa-trash-can');
      renderGrowthQuickStats();
      renderGrowthHistoryList();
      renderGrowthCurveChart();
    } catch (err) {
      console.error(err);
      showToast(err.message || '刪除失敗', 'fa-triangle-exclamation');
    }
  });
};

// 綁定指標切換按鈕 (身高 / 體重 / BMI)
['height', 'weight', 'bmi'].forEach(metric => {
  document.getElementById(`btn-metric-${metric}`)?.addEventListener('click', () => {
    currentGrowthMetric = metric;
    ['height', 'weight', 'bmi'].forEach(m => {
      const btn = document.getElementById(`btn-metric-${m}`);
      if (m === metric) {
        btn?.classList.add('bg-[#173852]', 'text-white', 'shadow-sm');
        btn?.classList.remove('text-slate-600', 'hover:text-slate-900');
      } else {
        btn?.classList.remove('bg-[#173852]', 'text-white', 'shadow-sm');
        btn?.classList.add('text-slate-600', 'hover:text-slate-900');
      }
    });
    renderGrowthCurveChart();
  });
});

// 綁定時間軸縮放與視角控制按鈕
document.getElementById('btn-growth-zoom-in')?.addEventListener('click', () => zoomGrowthChart('in'));
document.getElementById('btn-growth-zoom-out')?.addEventListener('click', () => zoomGrowthChart('out'));
document.getElementById('btn-growth-zoom-default')?.addEventListener('click', resetGrowthChartDefaultRange);
document.getElementById('btn-growth-zoom-full')?.addEventListener('click', resetGrowthChartFullRange);

// 新增測量紀錄表單送出
document.getElementById('form-add-growth-record')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGrowthChildId) {
    showToast('請先選擇子女檔案', 'fa-triangle-exclamation');
    return;
  }

  const recordDate = document.getElementById('input-growth-date').value;
  const heightCm = Number(document.getElementById('input-growth-height').value);
  const weightKg = Number(document.getElementById('input-growth-weight').value);
  const note = document.getElementById('input-growth-note').value.trim();

  if (!recordDate || isNaN(heightCm) || isNaN(weightKg)) {
    showToast('請完整填寫測量日期、身高與體重', 'fa-circle-exclamation');
    return;
  }

  const bmi = Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
  const newRecord = {
    id: Date.now(),
    record_date: recordDate,
    height_cm: heightCm,
    weight_kg: weightKg,
    bmi,
    note
  };

  const btn = document.getElementById('btn-save-growth');
  const origHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 儲存中...';
  }

  try {
    const res = await apiFetch(`/guardian/children/${currentGrowthChildId}/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        record_date: recordDate,
        height_cm: heightCm,
        weight_kg: weightKg,
        note
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.data) {
      newRecord.id = data.data.id;
    }
  } catch (err) {
    console.warn('POST growth record API 離線/降級使用本地儲存:', err);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  }

  // 更新記憶體與 LocalStorage
  currentGrowthRecords.push(newRecord);
  localStorage.setItem(`g6_growth_${currentGrowthChildId}`, JSON.stringify({
    child: currentChildBio,
    records: currentGrowthRecords
  }));

  showToast('身高體重紀錄儲存成功！曲線已更新', 'fa-circle-check');
  document.getElementById('input-growth-note').value = '';

  renderGrowthQuickStats();
  renderGrowthHistoryList();
  renderGrowthCurveChart();
});

// 生理資訊設定彈窗 (性別與生日)
document.getElementById('btn-edit-child-bio')?.addEventListener('click', () => {
  const isGirl = currentChildBio.gender === 'girl';
  const rBoy = document.getElementById('child-bio-gender-boy');
  const rGirl = document.getElementById('child-bio-gender-girl');
  if (isGirl && rGirl) rGirl.checked = true;
  else if (rBoy) rBoy.checked = true;

  const bdayInput = document.getElementById('input-child-bio-birthday');
  if (bdayInput) {
    bdayInput.value = currentChildBio.birthday ? String(currentChildBio.birthday).slice(0, 10) : '';
  }

  document.getElementById('modal-child-bio')?.classList.remove('hidden');
});

document.getElementById('btn-close-bio-modal')?.addEventListener('click', () => {
  document.getElementById('modal-child-bio')?.classList.add('hidden');
});
document.getElementById('btn-cancel-bio-modal')?.addEventListener('click', () => {
  document.getElementById('modal-child-bio')?.classList.add('hidden');
});

// 儲存性別與生日表單
document.getElementById('form-child-bio')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentGrowthChildId) return;

  const rGirl = document.getElementById('child-bio-gender-girl');
  const gender = rGirl?.checked ? 'girl' : 'boy';
  const birthday = document.getElementById('input-child-bio-birthday')?.value || null;

  currentChildBio.gender = gender;
  currentChildBio.birthday = birthday;

  // 同步更新當前 guardianChildren 清單
  const target = (guardianChildren || []).find(c => c.id === currentGrowthChildId);
  if (target) {
    target.gender = gender;
    target.birthday = birthday;
  }

  try {
    await apiFetch(`/guardian/children/${currentGrowthChildId}/gender-birthday`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gender, birthday })
    });
  } catch (err) {
    console.warn('PUT gender-birthday API 降級:', err);
  }

  localStorage.setItem(`g6_growth_${currentGrowthChildId}`, JSON.stringify({
    child: currentChildBio,
    records: currentGrowthRecords
  }));

  document.getElementById('modal-child-bio')?.classList.add('hidden');
  showToast('子女生理資訊已儲存，生長曲線已更新！', 'fa-circle-check');

  renderChildBioUI();
  renderGrowthQuickStats();
  renderGrowthHistoryList();
  renderGrowthCurveChart();
});
