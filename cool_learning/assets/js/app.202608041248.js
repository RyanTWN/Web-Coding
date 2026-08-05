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
let starredWordsMap = new Map(); // 新增這行：用來存放完整的難字資料，避免隔天消失
let starredSpellingCounts = {};
let completedDates = new Set();
let learnedWordIds = new Set();
let calendarViewDate = new Date();
let modalCallback = null;

// UI 通知系統
function showToast(text, iconClass = "fa-circle-info") {
  const container = document.getElementById('toast-container');
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
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-icon').className = `fa-solid ${iconClass}`;
  modalCallback = onConfirm;
  document.getElementById('custom-modal').classList.remove('hidden');
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

// 核心功能 1: 不重複隨機 30 字動態抽樣演算法
// 前端向自己的 NAS 動態抓取今日單字
async function fetchDailyWordsFromCloud(studentId) {
    try {
        // 透過 4061 加密通道向後端 API 請求單字
        const response = await fetch(`https://learning.ifit.myds.me:4061/api/get-daily-words?studentId=${studentId}`);
        const result = await response.json();
        
        if (result.success) {
            console.log(`成功載入第 ${result.currentDay} 天的學習單字！`);
            return result.dailyWords; 
        } else {
            console.error("無法取得單字:", result.error);
            return [];
        }
    } catch (error) {
        console.error("伺服器連線失敗", error);
        return [];
    }
}

function saveStudentAppData() {
  if (!currentUser || currentUser.isAdmin) return;
  const seatNo = currentUser.seatNo;
  localStorage.setItem(`g6_vocab_starred_${seatNo}`, JSON.stringify([...starredIds]));
  localStorage.setItem(`g6_vocab_starred_detail_${seatNo}`, JSON.stringify([...starredWordsMap.values()])); // 儲存完整難字資料
  localStorage.setItem(`g6_vocab_starred_spelling_${seatNo}`, JSON.stringify(starredSpellingCounts));
  localStorage.setItem(`g6_vocab_completed_${seatNo}`, JSON.stringify([...completedDates]));
  localStorage.setItem(`g6_learned_ids_${seatNo}`, JSON.stringify([...learnedWordIds]));
  
  // 保存今日的單字與學習進度，避免切換 APP 時重置
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(`g6_daily_words_${seatNo}_${todayStr}`, JSON.stringify(today30Words));
  localStorage.setItem(`g6_daily_index_${seatNo}_${todayStr}`, currentIndex);
}

async function loadStudentAppData(seatNo) {
  starredIds = new Set(JSON.parse(localStorage.getItem(`g6_vocab_starred_${seatNo}`)) || []);
  const savedStarredDetails = JSON.parse(localStorage.getItem(`g6_vocab_starred_detail_${seatNo}`)) || [];
  starredWordsMap = new Map(savedStarredDetails.map(w => [w.id, w])); // 讀取完整難字資料
  
  starredSpellingCounts = JSON.parse(localStorage.getItem(`g6_vocab_starred_spelling_${seatNo}`)) || {};
  completedDates = new Set(JSON.parse(localStorage.getItem(`g6_vocab_completed_${seatNo}`)) || []);

  const todayStr = new Date().toISOString().split('T')[0];
  const cachedWords = JSON.parse(localStorage.getItem(`g6_daily_words_${seatNo}_${todayStr}`));
  const cachedIndex = localStorage.getItem(`g6_daily_index_${seatNo}_${todayStr}`);

  if (cachedWords && cachedWords.length > 0) {
    // 如果今天已經載入過了，就直接使用快取的單字與進度 (解決切換APP重新開始的問題)
    today30Words = cachedWords;
    currentIndex = cachedIndex ? parseInt(cachedIndex, 10) : 0;
  } else {
    // 只有今天第一次登入，才向後端請求新單字
    const dailyWords = await fetchDailyWordsFromCloud(seatNo);
    today30Words = dailyWords || [];
    currentIndex = 0;
    saveStudentAppData(); // 儲存下來，鎖定今日進度
  }

  if (today30Words.length === 0) {
    showToast("今日單字載入失敗，請確認伺服器連線", "fa-triangle-exclamation");
    return;
  }
  renderCard();
}

// 畫面切換與卡片渲染
function showView(viewId) {
  document.querySelectorAll('section[id^="view-"]').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(viewId).classList.remove('hidden');

  const badge = document.getElementById('user-profile-badge');
  if (currentUser && viewId !== 'view-login') {
    badge.classList.remove('hidden');
    badge.classList.add('flex');
    document.getElementById('header-user-name').textContent = currentUser.name;
    document.getElementById('header-user-seat').textContent = currentUser.isAdmin ? '系統管理員' : `座號: ${currentUser.seatNo}`;
  } else {
    badge.classList.add('hidden');
    badge.classList.remove('flex');
  }
}

function switchAppTab(tabId) {
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('bg-white', 'text-brand-600', 'shadow-sm'));

  document.getElementById(`app-view-${tabId}`).classList.remove('hidden');
  document.getElementById(`nav-${tabId}`).classList.add('bg-white', 'text-brand-600', 'shadow-sm');

  if (tabId === 'starred') renderStarredList();
  if (tabId === 'calendar') renderCalendar();
}

function renderCard() {
  if (today30Words.length === 0) return;
  const item = today30Words[currentIndex];

  // 【修改後】改為呼叫 loremflickr，並帶入英文單字作為搜尋關鍵字
  document.getElementById('card-image').src = item.img|| `https://placehold.co/300x300/e0f2fe/0284c7?text=${encodeURIComponent(item.vocabulary)}`;
  document.getElementById('card-word').textContent = item.vocabulary;
  document.getElementById('card-phonetic').textContent = item.phonetic;
  document.getElementById('card-chinese').textContent = item.chinese;
  document.getElementById('card-sentence').textContent = item.sentence;
  
  // 新增: 顯示例句中文翻譯 (請確保 index.html 中有 <div id="card-translate"></div>)
  const translateEl = document.getElementById('card-translate');
  if(translateEl) {
      translateEl.textContent = item.translate;
  }

  const starBtn = document.getElementById('star-btn');
  starBtn.className = starredIds.has(item.id) ? "absolute top-4 right-4 text-2xl text-amber-400 p-2 z-10" : "absolute top-4 right-4 text-2xl text-slate-300 p-2 z-10";

  const nextBtn = document.getElementById('btn-next-word');
  if (currentIndex === today30Words.length - 1) {
    nextBtn.innerHTML = '完成學習 <i class="fa-solid fa-circle-check"></i>';
    nextBtn.className = "flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all shadow-md";
  } else {
    nextBtn.innerHTML = '下一個 <i class="fa-solid fa-arrow-right"></i>';
    nextBtn.className = "flex-1 py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold transition-all shadow-md";
  }

  const progressPercent = ((currentIndex + 1) / today30Words.length) * 100;
  document.getElementById('progress-bar').style.width = `${progressPercent}%`;
  document.getElementById('progress-text').textContent = `${currentIndex + 1} / ${today30Words.length}`;
  document.getElementById('starred-count-badge').textContent = `${starredIds.size} 難字`;
}

function renderStarredList() {
  const container = document.getElementById('starred-list-container');
  container.innerHTML = '';
  
  // 直接從 Map 裡面取出所有收藏的難字，保證跨日不會消失
  const list = [...starredWordsMap.values()];

  if (list.length === 0) {
    container.innerHTML = `<p class="text-center py-8 text-slate-400 font-bold text-xs">目前無標記難字喔！</p>`;
    return;
  }

  list.forEach(item => {
    const div = document.createElement('div');
    div.className = "bg-slate-50 border rounded-2xl p-3 flex items-center justify-between";
    div.innerHTML = `
      <div><span class="font-bold text-slate-800">${item.vocabulary || item.word}</span> <span class="text-xs text-brand-600 ml-2">${item.chinese || item.translation}</span></div>
      <button class="text-amber-400 p-1" data-id="${item.id}"><i class="fa-solid fa-star"></i></button>
    `;
    div.querySelector('button').onclick = () => {
      starredIds.delete(item.id);
      starredWordsMap.delete(item.id); // 同步移除
      saveStudentAppData();
      renderStarredList();
    };
    container.appendChild(div);
  });
}

function renderCalendar() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  document.getElementById('cal-month-title').textContent = `${year} 年 ${month + 1} 月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));

  const todayKey = new Date().toISOString().split('T')[0];
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const key = `${year}-${mm}-${dd}`;

    const cell = document.createElement('div');
    cell.className = completedDates.has(key) ? "h-8 bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center" : "h-8 bg-slate-50 text-slate-600 rounded-xl text-xs flex items-center justify-center";
    cell.textContent = day;
    grid.appendChild(cell);
  }

  document.getElementById('streak-count').textContent = `${completedDates.size} 天`;
  document.getElementById('total-days-count').textContent = `${completedDates.size} 天`;

  const card = document.getElementById('today-status-card');
  if (completedDates.has(todayKey)) {
    card.className = "w-full py-3 bg-emerald-100 text-emerald-800 rounded-2xl text-xs font-bold text-center";
    card.innerHTML = '<i class="fa-solid fa-circle-check"></i> 今日學習已完成打卡！';
  } else {
    card.className = "w-full py-3 bg-amber-50 text-amber-800 rounded-2xl text-xs font-bold text-center";
    card.innerHTML = '<i class="fa-solid fa-clock"></i> 完成今日 30 字將自動打卡';
  }
}

// 事件接管綁定
document.addEventListener('DOMContentLoaded', () => {
  if (typeof initQuizModule === 'function') initQuizModule();
  if (typeof initAdminModule === 'function') initAdminModule();

  document.getElementById('modal-confirm-btn').onclick = () => {
    document.getElementById('custom-modal').classList.add('hidden');
    if (modalCallback) modalCallback();
  };
  document.getElementById('modal-cancel-btn').onclick = () => document.getElementById('custom-modal').classList.add('hidden');

  document.getElementById('btn-logout').onclick = () => {
    currentUser = null;
    sessionStorage.removeItem('g6_portal_user');
    showView('view-login');
  };

  document.getElementById('btn-go-home').onclick = () => {
    if (!currentUser) showView('view-login');
    else if (currentUser.isAdmin) showView('view-admin');
    else showView('view-subjects');
  };

document.getElementById('login-tab-student').onclick = () => {
    // 切換表單顯示
    document.getElementById('form-student-login').classList.remove('hidden');
    document.getElementById('form-admin-login').classList.add('hidden');
    // 切換按鈕顏色
    document.getElementById('login-tab-student').classList.add('bg-white', 'text-brand-600', 'shadow-sm');
    document.getElementById('login-tab-student').classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-admin').classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-admin').classList.remove('bg-white', 'text-brand-600', 'shadow-sm');
  };

  document.getElementById('login-tab-admin').onclick = () => {
    // 切換表單顯示
    document.getElementById('form-admin-login').classList.remove('hidden');
    document.getElementById('form-student-login').classList.add('hidden');
    // 切換按鈕顏色
    document.getElementById('login-tab-admin').classList.add('bg-white', 'text-brand-600', 'shadow-sm');
    document.getElementById('login-tab-admin').classList.remove('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student').classList.add('text-slate-500', 'hover:text-slate-700');
    document.getElementById('login-tab-student').classList.remove('bg-white', 'text-brand-600', 'shadow-sm');
  };

    // 學生登入處理 (包含付費牆攔截與VIP防呆)
  document.getElementById('form-student-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('input-student-name').value.trim();
    const seatNo = document.getElementById('input-student-seat').value.trim();

    try {
      // [API 串接] 使用您的真實 IP
      const response = await fetch('https://learning.ifit.myds.me:4061/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, seatNo })
      });
      const data = await response.json();

      // 🛑 1. 付費牆攔截邏輯
      if (data.status === 'expired') {
        document.getElementById('paywall-modal').classList.remove('hidden');
        return; 
      }

      // 🟢 2. 正常登入流程
      if (data.success) {
        currentUser = { name, seatNo };
        sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
        
        document.getElementById('header-user-name').textContent = currentUser.name;
        document.getElementById('header-user-seat').textContent = `座號: ${currentUser.seatNo}`;
        document.getElementById('user-profile-badge').classList.remove('hidden');

        showView('view-subjects');
        
        // 顯示試用或 VIP 提示 (嚴格防呆版)
        if (data.is_premium === 1) {
          showToast("登入成功！VIP 權限已啟用", "fa-crown");
        } else {
          const days = data.days_remaining !== undefined ? data.days_remaining : 7;
          showToast(`免費試用中，剩餘 ${days} 天`, "fa-clock");
        }
      } else {
        // 登入失敗 (例如無此帳號)
        showToast(data.message || '登入失敗，請檢查資料', "fa-triangle-exclamation");
      }
    } catch (error) {
      console.error(error);
      showToast("伺服器連線異常，請檢查網路", "fa-triangle-exclamation");
    }
  });

  document.getElementById('btn-open-english').onclick = () => {
    loadStudentAppData(currentUser.seatNo);
    switchAppTab('learn');
    showView('view-english-app');
  };

  document.getElementById('btn-math-go').onclick = () => { window.location.href = 'math.html'; };
  document.getElementById('btn-back-subjects').onclick = () => showView('view-subjects');

  document.getElementById('nav-learn').onclick = () => switchAppTab('learn');
  document.getElementById('nav-starred').onclick = () => switchAppTab('starred');
  document.getElementById('nav-quiz').onclick = () => switchAppTab('quiz');
  document.getElementById('nav-calendar').onclick = () => switchAppTab('calendar');

  document.getElementById('star-btn').onclick = () => {
    const item = today30Words[currentIndex];
    if (starredIds.has(item.id)) {
      starredIds.delete(item.id);
      starredWordsMap.delete(item.id);
    } else {
      starredIds.add(item.id);
      starredWordsMap.set(item.id, item); // 把整張單字卡的資料存起來
    }
    saveStudentAppData();
    renderCard();
  };

  document.getElementById('btn-speak-word').onclick = () => speakText(today30Words[currentIndex].vocabulary);
  document.getElementById('btn-speak-sentence').onclick = () => speakText(today30Words[currentIndex].sentence);

  document.getElementById('btn-next-word').onclick = () => {
    if (currentIndex < today30Words.length - 1) {
      currentIndex++;
      saveStudentAppData(); // 新增這行：切換單字時隨時儲存進度
      renderCard();
    } else {
      // 完成今日 30 字，寫入已學過的單字 ID 與打卡日期
      today30Words.forEach(w => learnedWordIds.add(w.id));
      const todayKey = new Date().toISOString().split('T')[0];
      completedDates.add(todayKey);
      saveStudentAppData();
      switchAppTab('calendar');
    }
  };

  document.getElementById('btn-prev-word').onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      saveStudentAppData(); // 新增這行：切換單字時隨時儲存進度
      renderCard();
    }
  };

  if (currentUser) {
    if (currentUser.isAdmin) showView('view-admin');
    else {
      document.getElementById('subject-user-name').textContent = currentUser.name;
      showView('view-subjects');
    }
  } else {
    showView('view-login');
  }
});
