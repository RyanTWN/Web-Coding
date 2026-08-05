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
  localStorage.setItem(`g6_vocab_starred_detail_${seatNo}`, JSON.stringify([...starredWordsMap.values()])); 
  localStorage.setItem(`g6_vocab_starred_spelling_${seatNo}`, JSON.stringify(starredSpellingCounts));
  localStorage.setItem(`g6_vocab_completed_${seatNo}`, JSON.stringify([...completedDates]));
  localStorage.setItem(`g6_learned_ids_${seatNo}`, JSON.stringify([...learnedWordIds]));
  
  const todayStr = new Date().toISOString().split('T')[0];
  localStorage.setItem(`g6_daily_words_${seatNo}_${todayStr}`, JSON.stringify(today30Words));
  localStorage.setItem(`g6_daily_index_${seatNo}_${todayStr}`, currentIndex);
}

async function loadStudentAppData(seatNo) {
  starredIds = new Set(JSON.parse(localStorage.getItem(`g6_vocab_starred_${seatNo}`)) || []);
  const savedStarredDetails = JSON.parse(localStorage.getItem(`g6_vocab_starred_detail_${seatNo}`)) || [];
  starredWordsMap = new Map(savedStarredDetails.map(w => [w.id, w])); 
  
  starredSpellingCounts = JSON.parse(localStorage.getItem(`g6_vocab_starred_spelling_${seatNo}`)) || {};
  completedDates = new Set(JSON.parse(localStorage.getItem(`g6_vocab_completed_${seatNo}`)) || []);

  const todayStr = new Date().toISOString().split('T')[0];
  const cachedWords = JSON.parse(localStorage.getItem(`g6_daily_words_${seatNo}_${todayStr}`));
  const cachedIndex = localStorage.getItem(`g6_daily_index_${seatNo}_${todayStr}`);

  if (cachedWords && cachedWords.length > 0) {
    today30Words = cachedWords;
    currentIndex = cachedIndex ? parseInt(cachedIndex, 10) : 0;
  } else {
    const dailyWords = await fetchDailyWordsFromCloud(seatNo);
    today30Words = dailyWords || [];
    currentIndex = 0;
    saveStudentAppData(); 
  }

  if (today30Words.length === 0) {
    showToast("今日單字載入失敗，請確認伺服器連線", "fa-triangle-exclamation");
    return;
  }
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
  // 1. 隱藏所有內容區塊
  document.querySelectorAll('.tab-view').forEach(v => v.classList.add('hidden'));
  
  // 2. 將所有按鈕重置為「未選取」的平坦狀態
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-brand-500', 'text-white', 'shadow-comic', 'transform', '-translate-y-1');
    btn.classList.add('text-slate-500', 'hover:text-slate-800');
  });

  // 3. 顯示目標內容區塊
  const view = document.getElementById(`app-view-${tabId}`);
  if(view) view.classList.remove('hidden');
  
  // 4. 為目前選中的按鈕加上「彩色浮起」的漫畫風格
  const navBtn = document.getElementById(`nav-${tabId}`);
  if(navBtn) {
    navBtn.classList.remove('text-slate-500', 'hover:text-slate-800');
    navBtn.classList.add('bg-brand-500', 'text-white', 'shadow-comic', 'transform', '-translate-y-1');
  }

  if (tabId === 'starred') renderStarredList();
  if (tabId === 'calendar') renderCalendar();
}

// 渲染單字卡 (加入全方位防呆，確保部分標籤不存在也不會報錯)
function renderCard() {
  if (today30Words.length === 0) return;
  const item = today30Words[currentIndex];

  const imgEl = document.getElementById('card-image');
  if (imgEl) imgEl.src = item.img || `https://placehold.co/300x300/e0f2fe/0284c7?text=${encodeURIComponent(item.vocabulary)}`;
  
  const wordEl = document.getElementById('card-word');
  if (wordEl) wordEl.textContent = item.vocabulary;
  
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
  if (progText) progText.textContent = `${currentIndex + 1} / ${today30Words.length}`;
  
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
      <div><span class="font-bold text-slate-800">${item.vocabulary || item.word}</span> <span class="text-xs text-brand-600 ml-2">${item.chinese || item.translation}</span></div>
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
      const response = await fetch('https://learning.ifit.myds.me:4061/api/login', {
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
        currentUser = { name, seatNo };
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
      const todayKey = new Date().toISOString().split('T')[0];
      completedDates.add(todayKey);
      saveStudentAppData();
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