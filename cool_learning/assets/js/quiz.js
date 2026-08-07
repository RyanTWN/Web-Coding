// cool_learning/assets/js/quiz.js

let quizQuestions = [];
let currentQuizIndex = 0;
let quizScore = 0;
let currentQuizMode = 'choice';

function initQuizModule() {
  let btnChoice = document.getElementById('btn-quiz-mode-choice');
  if (btnChoice) btnChoice.onclick = () => startQuiz('choice');

  let btnSpelling = document.getElementById('btn-quiz-mode-spelling');
  if (btnSpelling) btnSpelling.onclick = () => startQuiz('spelling');

  let btnStarred = document.getElementById('btn-quiz-mode-starred');
  if (btnStarred) btnStarred.onclick = () => startQuiz('starred');

  let btnStarredSpelling = document.getElementById('btn-quiz-mode-starred-spelling');
  if (btnStarredSpelling) btnStarredSpelling.onclick = () => startQuiz('starred_spelling');

  let btnReset = document.getElementById('btn-reset-quiz-menu');
  if (btnReset) btnReset.onclick = resetQuizMenu;

  let btnNext = document.getElementById('quiz-next-btn');
  if (btnNext) btnNext.onclick = nextQuizQuestion;

  let btnSubmitSpelling = document.getElementById('quiz-submit-spelling-btn');
  if (btnSubmitSpelling) btnSubmitSpelling.onclick = submitSpellingAnswer;
}

function resetQuizMenu() {
  document.getElementById('quiz-screen-start').classList.remove('hidden');
  document.getElementById('quiz-screen-active').classList.add('hidden');
  document.getElementById('quiz-screen-results').classList.add('hidden');
}

// 實作標準的 Fisher-Yates 洗牌演算法 (解決隨機選項不均勻的問題)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startQuiz(mode) {
  currentQuizMode = mode;
  
  // 修正：強制優先使用今天抽出來的 30 個單字
  let basePool = [];
  if (typeof today30Words !== 'undefined' && today30Words.length > 0) {
    basePool = today30Words;
  } else if (typeof VOCABULARY_DATA !== 'undefined') {
    basePool = VOCABULARY_DATA;
  } else if (typeof vocabularyList !== 'undefined') {
    basePool = vocabularyList;
  }

  let pool = basePool;

  if (mode === 'starred' || mode === 'starred_spelling') {
    // 修正：直接從我們剛寫好的全域難字庫 (starredWordsMap) 抓出完整的難字，保證跨日測驗不會報錯
    const starredPool = typeof starredWordsMap !== 'undefined' ? [...starredWordsMap.values()] : pool.filter(i => starredIds.has(i.id));
    
    if (starredPool.length === 0) {
      showToast("難字本目前沒有單字喔！", "fa-star");
      return;
    }
    pool = starredPool;
  }

  // 修正 3：使用 Fisher-Yates 洗牌，並取前 10 題
  quizQuestions = shuffleArray(pool).slice(0, Math.min(10, pool.length));
  currentQuizIndex = 0;
  quizScore = 0;

  document.getElementById('quiz-screen-start').classList.add('hidden');
  document.getElementById('quiz-screen-active').classList.remove('hidden');
  showQuizQuestion();
}

function showQuizQuestion() {
  const q = quizQuestions[currentQuizIndex];
  document.getElementById('quiz-progress-num').textContent = `第 ${currentQuizIndex + 1} / ${quizQuestions.length} 題`;
  
  // 修正 2：相容資料庫的 chinese 或舊版的 translation
  document.getElementById('quiz-question-chinese').textContent = `「${q.chinese || q.translation}」`; 
  
  document.getElementById('quiz-feedback').textContent = '';
  document.getElementById('quiz-next-btn').classList.add('hidden');

  const optionsGrid = document.getElementById('quiz-options-grid');
  const spellingContainer = document.getElementById('quiz-spelling-container');

  if (currentQuizMode === 'choice' || currentQuizMode === 'starred') {
    optionsGrid.classList.remove('hidden');
    spellingContainer.classList.add('hidden');
    
    // 動態取得基礎題庫用來抓干擾選項
    let basePool = [];
    if (typeof VOCABULARY_DATA !== 'undefined') basePool = VOCABULARY_DATA;
    else if (typeof vocabularyList !== 'undefined') basePool = vocabularyList;
    else if (typeof today30Words !== 'undefined') basePool = today30Words;

    // 隨機抽取 3 個錯誤選項 (過濾掉正確答案)
    const distractors = shuffleArray(basePool.filter(v => v.id !== q.id)).slice(0, 3);
    const options = shuffleArray([q, ...distractors]);

    optionsGrid.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = "w-full py-3 px-4 bg-white border-2 rounded-2xl font-bold text-slate-700 text-left flex justify-between";
      
      // 修正 2：相容資料庫的 vocabulary 或舊版的 word
      const wordText = opt.vocabulary || opt.word;
      
      btn.innerHTML = `<span>${wordText}</span> <span class="text-xs text-slate-300">${opt.phonetic}</span>`;
      btn.onclick = () => {
        if (opt.id === q.id) {
          quizScore++;
          btn.className = "w-full py-3 px-4 bg-emerald-50 border-emerald-500 text-emerald-700 border-2 rounded-2xl font-bold text-left flex justify-between";
          speakText(wordText);
        } else {
          btn.className = "w-full py-3 px-4 bg-rose-50 border-rose-500 text-rose-700 border-2 rounded-2xl font-bold text-left flex justify-between";
        }
        document.getElementById('quiz-next-btn').classList.remove('hidden');
        
        // 點擊後停用其他按鈕，防止重複計分
        Array.from(optionsGrid.children).forEach(child => child.onclick = null);
      };
      optionsGrid.appendChild(btn);
    });
  } else {
    optionsGrid.classList.add('hidden');
    spellingContainer.classList.remove('hidden');
    const input = document.getElementById('quiz-spelling-input');
    input.value = '';
    input.focus();
  }
}

function submitSpellingAnswer() {
  const input = document.getElementById('quiz-spelling-input');
  const q = quizQuestions[currentQuizIndex];
  
  // 修正 2：相容欄位名稱
  const correctWord = q.vocabulary || q.word; 

  if (input.value.trim().toLowerCase() === correctWord.toLowerCase()) {
    quizScore++;
    if (currentQuizMode === 'starred_spelling') {
      starredSpellingCounts[q.id] = (starredSpellingCounts[q.id] || 0) + 1;
      if (starredSpellingCounts[q.id] >= 3) {
        starredIds.delete(q.id);
        if (typeof starredWordsMap !== 'undefined') starredWordsMap.delete(q.id); // 新增這行：同步消除
        delete starredSpellingCounts[q.id];
      }
      saveStudentAppData();
    }
    speakText(correctWord);
    document.getElementById('quiz-feedback').textContent = '✅ 答對了！';
    document.getElementById('quiz-feedback').className = 'text-center font-bold text-sm min-h-[24px] my-2 text-emerald-600';
  } else {
    document.getElementById('quiz-feedback').textContent = `❌ 答錯了，正確答案是：${correctWord}`;
    document.getElementById('quiz-feedback').className = 'text-center font-bold text-sm min-h-[24px] my-2 text-rose-600';
  }
  
  document.getElementById('quiz-next-btn').classList.remove('hidden');
  document.getElementById('quiz-submit-spelling-btn').classList.add('hidden'); // 隱藏送出按鈕避免重複點擊
}

function nextQuizQuestion() {
  document.getElementById('quiz-submit-spelling-btn').classList.remove('hidden'); // 恢復送出按鈕
  currentQuizIndex++;
  if (currentQuizIndex < quizQuestions.length) showQuizQuestion();
  else {
    document.getElementById('quiz-screen-active').classList.add('hidden');
    document.getElementById('quiz-screen-results').classList.remove('hidden');
    const finalScore = Math.round((quizScore / quizQuestions.length) * 100);
    document.getElementById('quiz-final-score').textContent = `${finalScore} / 100 分`;

    if (currentUser && !currentUser.isAdmin) {
      const historyKey = `g6_vocab_quiz_history_${currentUser.seatNo}`;
      const history = JSON.parse(localStorage.getItem(historyKey)) || [];
      history.unshift({ modeName: currentQuizMode, score: finalScore, timestamp: new Date().toLocaleString() });
      localStorage.setItem(historyKey, JSON.stringify(history));
      saveQuizResultToCloud(currentQuizMode, finalScore);
    }
  }
}

async function saveQuizResultToCloud(mode, score) {
  try {
    const response = await apiFetch('/quiz-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatNo: currentUser.seatNo, mode, score }),
      keepalive: true
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.error('測驗紀錄同步失敗，紀錄仍保留於本機', error);
  }
}
