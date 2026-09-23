/**
 * 酷學習 Cool Learning - 邊玩邊學遊戲引擎
 * 1. 搶救字母大作戰 (Word Rescue) - 頂菜籃接字母、三滴血、關卡提速 30%、單字語音朗讀、手機震動
 * 2. 光速小鼠 (Speedy Mouse) - 六動物賽跑 (倉鼠/貓/狗/龜/兔/水豚)、數學心算極速答題、答題秒數連動衝刺、每10秒提速10%、距離排名
 */

(function() {
  'use strict';

  // =========================================================================
  // 1. 國小英語精選核心單字庫 (精選常見生活、動植物、日常學習單字)
  // =========================================================================
  const DEFAULT_WORD_BANK = [
    { word: "APPLE", meaning: "蘋果", pos: "n.", phonetic: "/ˈæpl/" },
    { word: "BANANA", meaning: "香蕉", pos: "n.", phonetic: "/bəˈnænə/" },
    { word: "CAT", meaning: "貓咪", pos: "n.", phonetic: "/kæt/" },
    { word: "DOG", meaning: "狗狗", pos: "n.", phonetic: "/dɔːɡ/" },
    { word: "BIRD", meaning: "小鳥", pos: "n.", phonetic: "/bɜːrd/" },
    { word: "FISH", meaning: "魚", pos: "n.", phonetic: "/fɪʃ/" },
    { word: "BOOK", meaning: "書籍", pos: "n.", phonetic: "/bʊk/" },
    { word: "DESK", meaning: "書桌", pos: "n.", phonetic: "/desk/" },
    { word: "CHAIR", meaning: "椅子", pos: "n.", phonetic: "/tʃer/" },
    { word: "PEN", meaning: "原子筆", pos: "n.", phonetic: "/pen/" },
    { word: "PENCIL", meaning: "鉛筆", pos: "n.", phonetic: "/ˈpensl/" },
    { word: "SCHOOL", meaning: "學校", pos: "n.", phonetic: "/skuːl/" },
    { word: "FRIEND", meaning: "朋友", pos: "n.", phonetic: "/frend/" },
    { word: "HAPPY", meaning: "快樂的", pos: "adj.", phonetic: "/ˈhæpi/" },
    { word: "SMILE", meaning: "微笑", pos: "v./n.", phonetic: "/smaɪl/" },
    { word: "WATER", meaning: "水", pos: "n.", phonetic: "/ˈwɔːtər/" },
    { word: "MILK", meaning: "牛奶", pos: "n.", phonetic: "/mɪlk/" },
    { word: "BREAD", meaning: "麵包", pos: "n.", phonetic: "/bred/" },
    { word: "RABBIT", meaning: "兔子", pos: "n.", phonetic: "/ˈræbɪt/" },
    { word: "TIGER", meaning: "老虎", pos: "n.", phonetic: "/ˈtaɪɡər/" },
    { word: "LION", meaning: "獅子", pos: "n.", phonetic: "/ˈlaɪən/" },
    { word: "BEAR", meaning: "熊", pos: "n.", phonetic: "/ber/" },
    { word: "MONKEY", meaning: "猴子", pos: "n.", phonetic: "/ˈmʌŋki/" },
    { word: "PANDA", meaning: "熊貓", pos: "n.", phonetic: "/ˈpændə/" },
    { word: "FLOWER", meaning: "花朵", pos: "n.", phonetic: "/ˈflaʊər/" },
    { word: "TREE", meaning: "大樹", pos: "n.", phonetic: "/triː/" },
    { word: "SUNNY", meaning: "晴朗的", pos: "adj.", phonetic: "/ˈsʌni/" },
    { word: "RAINY", meaning: "下雨的", pos: "adj.", phonetic: "/ˈreɪni/" },
    { word: "STAR", meaning: "星星", pos: "n.", phonetic: "/stɑːr/" },
    { word: "MOON", meaning: "月亮", pos: "n.", phonetic: "/muːn/" },
    { word: "CLOUD", meaning: "雲朵", pos: "n.", phonetic: "/klaʊd/" },
    { word: "GREEN", meaning: "綠色", pos: "n./adj.", phonetic: "/ɡriːn/" },
    { word: "ORANGE", meaning: "柳橙/橘色", pos: "n.", phonetic: "/ˈɔːrɪndʒ/" },
    { word: "YELLOW", meaning: "黃色", pos: "n./adj.", phonetic: "/ˈjeloʊ/" },
    { word: "PURPLE", meaning: "紫色", pos: "n./adj.", phonetic: "/ˈpɜːrpl/" },
    { word: "SUMMER", meaning: "夏天", pos: "n.", phonetic: "/ˈsʌmər/" },
    { word: "WINTER", meaning: "冬天", pos: "n.", phonetic: "/ˈwɪntər/" },
    { word: "SPRING", meaning: "春天", pos: "n.", phonetic: "/sprɪŋ/" },
    { word: "MUSIC", meaning: "音樂", pos: "n.", phonetic: "/ˈmjuːzɪk/" },
    { word: "ROBOT", meaning: "機器人", pos: "n.", phonetic: "/ˈroʊbɑːt/" },
    { word: "ROCKET", meaning: "火箭", pos: "n.", phonetic: "/ˈrɑːkɪt/" },
    { word: "MAGIC", meaning: "魔法", pos: "n.", phonetic: "/ˈmædʒɪk/" },
    { word: "DOCTOR", meaning: "醫生", pos: "n.", phonetic: "/ˈdɑːktər/" },
    { word: "TEACHER", meaning: "老師", pos: "n.", phonetic: "/ˈtiːtʃər/" },
    { word: "FATHER", meaning: "爸爸", pos: "n.", phonetic: "/ˈfɑːðər/" },
    { word: "MOTHER", meaning: "媽媽", pos: "n.", phonetic: "/ˈmʌðər/" },
    { word: "BROTHER", meaning: "兄弟", pos: "n.", phonetic: "/ˈbrʌðər/" },
    { word: "SISTER", meaning: "姊妹", pos: "n.", phonetic: "/ˈsɪstər/" }
  ];

  function getActiveWordBank() {
    let list = [...DEFAULT_WORD_BANK];
    try {
      const user = JSON.parse(sessionStorage.getItem('g6_portal_user'));
      if (user && user.seatNo) {
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
        const saved = JSON.parse(localStorage.getItem(`g6_daily_words_${user.seatNo}_${todayStr}`));
        if (Array.isArray(saved) && saved.length > 0) {
          saved.forEach(item => {
            const w = (item.word || '').toUpperCase().trim();
            if (w && /^[A-Z]{3,10}$/.test(w) && !list.some(x => x.word === w)) {
              list.unshift({
                word: w,
                meaning: item.chinese || item.meaning || '精選單字',
                pos: item.pos || 'n.',
                phonetic: item.phonetic || ''
              });
            }
          });
        }
      }
    } catch (_) {}
    return list;
  }

  // =========================================================================
  // 2. Web Audio API 音效生成引擎 (零依賴、純代碼即時合成)
  // =========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.muted = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    // 正確接中字母音：清脆雙諧波 Ding
    playCatch() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.12); // G5
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    // 接錯扣血音：低頻 Buzz 警告
    playHurt() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(80, t + 0.28);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    // 單字拼寫完成音：歡樂大三和弦琶音
    playWordComplete() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }

    // 遊戲結束音：哀傷降調三連音
    playGameOver() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.16;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    }

    // 賽跑倒計時嗶聲
    playBeep(isHigh = false) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    }

    // 賽跑衝刺風嘯 / 氮氣加速音
    playTurbo() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(960, t + 0.35);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    }

    // 終點哨聲
    playWhistle() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.linearRampToValueAtTime(1550, t + 0.2);
      osc.frequency.linearRampToValueAtTime(1380, t + 0.45);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    }

    // 成語積木放置/咬合音：厚實木質啪搭聲 (Woodblock Snap)
    playBlockSnap() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    }

    // 成語通關勝利號角音 (Victory Fanfare)
    playFanfare() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const t = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.32, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
      });
    }
  }

  const sounds = new SoundEngine();

  // 語音朗讀單字 (Web Speech Synthesis)，支援朗讀完畢回調
  function speakWord(text, onComplete) {
    if (!window.speechSynthesis) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      let finished = false;
      const done = () => {
        if (!finished) {
          finished = true;
          if (typeof onComplete === 'function') onComplete();
        }
      };
      u.onend = done;
      u.onerror = done;
      // 容錯防禦：若瀏覽器未觸發 onend，1.6 秒後自動前進
      setTimeout(done, 1600);
      window.speechSynthesis.speak(u);
    } catch (_) {
      if (typeof onComplete === 'function') onComplete();
    }
  }

  // =========================================================================
  // 3. 搶救字母大作戰 - 遊戲主邏輯控制器
  // =========================================================================
  class WordRescueGame {
    constructor() {
      this.canvas = document.getElementById('rescue-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

      // 遊戲狀態
      this.isRunning = false;
      this.isPaused = false;
      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3; // 三滴血
      this.wordBank = [];
      this.currentWordObj = null;
      this.currentWord = "";
      this.targetLetterIndex = 0; // 目前需要接的字母索引

      // 小人角色與菜籃
      this.player = {
        x: 0,
        y: 0,
        targetX: 0,
        width: 84,
        height: 95,
        basketWidth: 92,
        basketHeight: 28,
        faceMood: 'normal', // 'normal' | 'happy' | 'hurt'
        moodTimer: 0
      };

      // 掉落字母泡泡與特效粒子
      this.bubbles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.spawnTimer = 0;
      this.spawnInterval = 75; // 掉落頻率 (幀數)
      this.shakeIntensity = 0;

      // 畫布尺寸
      this.width = 640;
      this.height = 700;

      this.initEvents();
    }

    initEvents() {
      if (!this.canvas) return;

      // 滑鼠移動事件 (電腦版)
      const onMouseMove = (e) => {
        if (!this.isRunning || this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX;
        const canvasX = (clientX - rect.left) * (this.width / rect.width);
        this.player.targetX = Math.max(this.player.basketWidth / 2, Math.min(this.width - this.player.basketWidth / 2, canvasX));
      };

      // 觸控移動事件 (手機/平板)
      const onTouchMove = (e) => {
        if (!this.isRunning || this.isPaused) return;
        if (e.touches && e.touches.length > 0) {
          e.preventDefault(); // 避免手機滑動捲頁
          const touch = e.touches[0];
          const rect = this.canvas.getBoundingClientRect();
          const canvasX = (touch.clientX - rect.left) * (this.width / rect.width);
          this.player.targetX = Math.max(this.player.basketWidth / 2, Math.min(this.width - this.player.basketWidth / 2, canvasX));
        }
      };

      this.canvas.addEventListener('mousemove', onMouseMove);
      this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      this.canvas.addEventListener('touchstart', onTouchMove, { passive: false });

      // 鍵盤左右鍵相容支援
      window.addEventListener('keydown', (e) => {
        if (!this.isRunning || this.isPaused) return;
        const step = 45;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          this.player.targetX = Math.max(this.player.basketWidth / 2, this.player.targetX - step);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          this.player.targetX = Math.min(this.width - this.player.basketWidth / 2, this.player.targetX + step);
        }
      });

      // 視窗自適應
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
      if (!this.canvas) return;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.player.y = this.height - 110;
    }

    // 啟動新一局遊戲
    start() {
      sounds.init();
      this.wordBank = getActiveWordBank();
      this.shuffleArray(this.wordBank);
      this.score = 0;
      this.rescuedCount = 0;
      this.lives = 3;
      this.bubbles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.isRunning = true;
      this.isPaused = false;
      this.spawnTimer = 0;

      this.resizeCanvas();
      this.player.x = this.width / 2;
      this.player.targetX = this.width / 2;
      this.player.y = this.height - 110;

      this.updateHud();
      this.pickNextWord();

      // 啟動循環
      requestAnimationFrame(() => this.loop());
    }

    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    // 挑選下一個要拼的題目
    pickNextWord() {
      if (this.wordBank.length === 0) {
        this.wordBank = getActiveWordBank();
        this.shuffleArray(this.wordBank);
      }
      this.currentWordObj = this.wordBank.pop();
      this.currentWord = (this.currentWordObj.word || "COOL").toUpperCase();
      this.targetLetterIndex = 0;
      this.renderWordSlots();

      // 開局題目自動朗讀單字，加深記憶
      speakWord(this.currentWord);
    }

    // 更新介面上的單字拼字槽
    renderWordSlots() {
      const container = document.getElementById('rescue-word-slots');
      const meaningEl = document.getElementById('rescue-word-meaning');
      const phoneticEl = document.getElementById('rescue-word-phonetic');
      if (meaningEl) meaningEl.textContent = `${this.currentWordObj.meaning} (${this.currentWordObj.pos})`;
      if (phoneticEl) phoneticEl.textContent = this.currentWordObj.phonetic || '';

      if (!container) return;
      container.innerHTML = '';

      for (let i = 0; i < this.currentWord.length; i++) {
        const char = this.currentWord[i];
        const slot = document.createElement('div');
        slot.className = `w-10 h-12 sm:w-12 sm:h-14 rounded-xl border-3 flex items-center justify-center font-black text-xl sm:text-2xl transition-all duration-300 shadow-sm ${
          i < this.targetLetterIndex
            ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/30 scale-105'
            : i === this.targetLetterIndex
            ? 'bg-amber-100 border-amber-400 text-amber-700 animate-pulse ring-2 ring-amber-300'
            : 'bg-white/90 border-slate-200 text-slate-300'
        }`;
        slot.textContent = i < this.targetLetterIndex ? char : (i === this.targetLetterIndex ? '?' : '_');
        container.appendChild(slot);
      }
    }

    // 更新抬頭顯示 (血量與分數)
    updateHud() {
      const scoreEl = document.getElementById('rescue-score');
      const countEl = document.getElementById('rescue-count');
      const heartsContainer = document.getElementById('rescue-hearts');

      if (scoreEl) scoreEl.textContent = this.score;
      if (countEl) countEl.textContent = this.rescuedCount;
      const levelEl = document.getElementById('rescue-level');
      if (levelEl) levelEl.textContent = `第 ${this.rescuedCount + 1} 關`;

      if (heartsContainer) {
        heartsContainer.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
          const heart = document.createElement('span');
          heart.className = `text-2xl sm:text-3xl transition-all duration-300 ${
            i <= this.lives ? 'text-rose-500 scale-100 drop-shadow' : 'text-slate-300 scale-90 opacity-40'
          }`;
          heart.innerHTML = i <= this.lives ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-solid fa-heart-crack"></i>';
          heartsContainer.appendChild(heart);
        }
      }
    }

    // 掉落物生成：每過一關(rescuedCount)，速度提升 30%
    spawnBubble() {
      const targetChar = this.currentWord[this.targetLetterIndex];
      const isTarget = Math.random() < 0.45;
      let char = targetChar;

      if (!isTarget || !targetChar) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        char = alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      const radius = 26;
      const x = radius + Math.random() * (this.width - radius * 2);

      // 速度計算：進入第九關後不再提速 (前 8 關每關提速 30%，第 9 關及以後速度固定)
      const baseSpeed = 2.0;
      const speedTier = Math.min(this.rescuedCount, 8);
      const speed = baseSpeed * Math.pow(1.30, speedTier);

      const colors = [
        { bg: '#38bdf8', border: '#0284c7', text: '#ffffff' },
        { bg: '#fb923c', border: '#ea580c', text: '#ffffff' },
        { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' },
        { bg: '#ec4899', border: '#db2777', text: '#ffffff' },
        { bg: '#10b981', border: '#059669', text: '#ffffff' },
        { bg: '#facc15', border: '#ca8a04', text: '#713f12' }
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.bubbles.push({
        char,
        x,
        y: -radius,
        radius,
        speed,
        color,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.04 + Math.random() * 0.03
      });
    }

    loop() {
      if (!this.isRunning) return;
      if (!this.isPaused) {
        this.update();
        this.render();
      }
      requestAnimationFrame(() => this.loop());
    }

    update() {
      this.player.x += (this.player.targetX - this.player.x) * 0.28;

      if (this.player.moodTimer > 0) {
        this.player.moodTimer--;
        if (this.player.moodTimer <= 0) {
          this.player.faceMood = 'normal';
        }
      }

      if (this.shakeIntensity > 0) {
        this.shakeIntensity *= 0.88;
        if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
      }

      this.spawnTimer++;
      // 字母數量：進入第九關後不再提速，改為增加字母數量，每過一關增加 10% 的字母數量，直到第 19 關後不再變化
      let densityMultiplier = 1.0;
      if (this.rescuedCount > 8) {
        // 從第 9 關完成後開始增加，第 10 關 ~ 第 19 關最多增加 10 關
        const densitySteps = Math.min(this.rescuedCount - 8, 10);
        densityMultiplier = Math.pow(1.10, densitySteps);
      }
      const currentInterval = Math.max(20, Math.round(this.spawnInterval / densityMultiplier));

      if (this.spawnTimer >= currentInterval) {
        this.spawnTimer = 0;
        this.spawnBubble();
      }

      const basketY = this.player.y - 10;
      const basketLeft = this.player.x - this.player.basketWidth / 2;
      const basketRight = this.player.x + this.player.basketWidth / 2;

      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y += b.speed;
        b.wobble += b.wobbleSpeed;
        const currentX = b.x + Math.sin(b.wobble) * 1.5;

        if (
          b.y + b.radius >= basketY &&
          b.y - b.radius <= basketY + this.player.basketHeight &&
          currentX >= basketLeft &&
          currentX <= basketRight
        ) {
          this.handleCatchLetter(b, currentX, basketY);
          this.bubbles.splice(i, 1);
          continue;
        }

        if (b.y - b.radius > this.height) {
          this.bubbles.splice(i, 1);
        }
      }

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.025;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y -= 1.2;
        ft.life -= 0.02;
        if (ft.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }
    }

    // 接住字母時的判定
    handleCatchLetter(bubble, catchX, catchY) {
      const targetChar = this.currentWord[this.targetLetterIndex];

      if (bubble.char === targetChar) {
        // =====================
        // 接對字母！
        // =====================
        sounds.playCatch();
        this.score += 25;
        this.targetLetterIndex++;
        this.player.faceMood = 'happy';
        this.player.moodTimer = 35;

        this.createParticles(catchX, catchY, '#fbbf24', 18);
        this.addFloatingText(`+25 ${bubble.char}!`, catchX, catchY - 15, '#10b981');

        this.renderWordSlots();
        this.updateHud();

        if (this.targetLetterIndex >= this.currentWord.length) {
          this.handleWordCompleted();
        }
      } else {
        // =====================
        // 接錯字母！扣一滴血 + 手機震動 0.5 秒 (500ms)
        // =====================
        sounds.playHurt();
        this.lives--;
        this.shakeIntensity = 14;
        this.player.faceMood = 'hurt';
        this.player.moodTimer = 45;

        // 手機震動 0.5 秒 (500ms)
        if (navigator.vibrate) {
          try { navigator.vibrate(500); } catch (_) {}
        }

        this.createParticles(catchX, catchY, '#f43f5e', 22);
        this.addFloatingText(`-1 ❤️ 錯了!`, catchX, catchY - 15, '#f43f5e');

        this.updateHud();

        if (this.lives <= 0) {
          this.gameOver();
        }
      }
    }

    // 單字拼寫完成：同時發音讀出該單字，朗讀結束後再進入下一關
    handleWordCompleted() {
      sounds.playWordComplete();
      this.score += 100;
      this.rescuedCount++;
      this.updateHud();

      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x: this.width / 2 + (Math.random() - 0.5) * 300,
          y: 120 + Math.random() * 50,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 6,
          color: ['#f43f5e', '#fbbf24', '#38bdf8', '#10b981', '#a855f7'][Math.floor(Math.random() * 5)],
          size: 6 + Math.random() * 4,
          life: 1.2
        });
      }

      const completedCount = this.rescuedCount;
      let bonusMsg = "PERFECT! +100";
      if (completedCount < 8) {
        bonusMsg = `PERFECT! +100 (第 ${completedCount + 1} 關: 速度+30%)`;
      } else if (completedCount < 18) {
        bonusMsg = `PERFECT! +100 (第 ${completedCount + 1} 關: 字母數量+10%)`;
      } else {
        bonusMsg = `PERFECT! +100 (第 ${completedCount + 1} 關: 極限挑戰!)`;
      }
      this.addFloatingText(bonusMsg, this.width / 2, 220, '#f59e0b', 22);

      // 同時發音讀出該單字，朗讀結束後再進入下一關
      speakWord(this.currentWord, () => {
        if (this.isRunning && this.lives > 0) {
          this.pickNextWord();
        }
      });
    }

    // 遊戲結束
    gameOver() {
      this.isRunning = false;
      sounds.playGameOver();

      const modal = document.getElementById('rescue-gameover-modal');
      const finalScoreEl = document.getElementById('rescue-final-score');
      const finalCountEl = document.getElementById('rescue-final-count');

      if (finalScoreEl) finalScoreEl.textContent = this.score;
      if (finalCountEl) finalCountEl.textContent = this.rescuedCount;

      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    createParticles(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          color,
          size: 3 + Math.random() * 4,
          life: 0.8 + Math.random() * 0.4
        });
      }
    }

    addFloatingText(text, x, y, color, size = 20) {
      this.floatingTexts.push({
        text,
        x,
        y,
        color,
        size,
        life: 1.0
      });
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      ctx.save();
      if (this.shakeIntensity > 0) {
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(ox, oy);
      }

      this.drawBackground(ctx);
      this.drawBubbles(ctx);
      this.drawPlayer(ctx);
      this.drawParticles(ctx);
      this.drawFloatingTexts(ctx);

      ctx.restore();
    }

    drawBackground(ctx) {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#e0f2fe');
      skyGrad.addColorStop(0.7, '#f0fdf4');
      skyGrad.addColorStop(1, '#dcfce7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.drawCloud(ctx, 90, 80, 48);
      this.drawCloud(ctx, 420, 110, 60);
      this.drawCloud(ctx, 260, 60, 36);

      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.ellipse(this.width / 2, this.height + 40, this.width * 0.65, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.ellipse(this.width / 2, this.height + 30, this.width * 0.55, 80, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCloud(ctx, x, y, size) {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
      ctx.arc(x + size * 0.35, y - size * 0.2, size * 0.45, 0, Math.PI * 2);
      ctx.arc(x + size * 0.7, y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBubbles(ctx) {
      for (const b of this.bubbles) {
        const currentX = b.x + Math.sin(b.wobble) * 2;
        ctx.save();
        ctx.translate(currentX, b.y);

        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = b.color.bg;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3.5;
        ctx.strokeStyle = b.color.border;
        ctx.stroke();

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-b.radius * 0.3, -b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = b.color.text;
        ctx.font = '900 24px "Fredoka", "Noto Sans TC", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.char, 0, 2);

        ctx.restore();
      }
    }

    drawPlayer(ctx) {
      const p = this.player;
      ctx.save();
      ctx.translate(p.x, p.y);

      const bW = p.basketWidth;
      const bH = p.basketHeight;
      const bY = -35;

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.moveTo(-bW / 2, bY);
      ctx.lineTo(bW / 2, bY);
      ctx.lineTo(bW / 2 - 12, bY + bH);
      ctx.lineTo(-bW / 2 + 12, bY + bH);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#78350f';
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-bW / 2 + 4, bY);
      ctx.quadraticCurveTo(0, bY - 8, bW / 2 - 4, bY);
      ctx.lineTo(bW / 2 - 8, bY + 8);
      ctx.quadraticCurveTo(0, bY + 12, -bW / 2 + 8, bY + 8);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(254, 243, 199, 0.5)';
      ctx.lineWidth = 2;
      for (let i = -bW / 2 + 16; i < bW / 2 - 10; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, bY + 2);
        ctx.lineTo(i - 4, bY + bH - 2);
        ctx.stroke();
      }

      ctx.strokeStyle = '#fbcfe8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, 12);
      ctx.lineTo(-28, -6);
      ctx.lineTo(-bW / 2 + 14, bY + bH - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, 12);
      ctx.lineTo(28, -6);
      ctx.lineTo(bW / 2 - 14, bY + bH - 4);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, -6, 26, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(0, 4, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#c2410c';
      ctx.stroke();

      ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(-13, 8, 4.5, 0, Math.PI * 2);
      ctx.arc(13, 8, 4.5, 0, Math.PI * 2);
      ctx.fill();

      if (p.faceMood === 'happy') {
        ctx.strokeStyle = '#431407';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-7, 2, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, 2, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 10, 6, 0, Math.PI);
        ctx.fill();
      } else if (p.faceMood === 'hurt') {
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-10, -1); ctx.lineTo(-4, 5);
        ctx.moveTo(-4, -1); ctx.lineTo(-10, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, -1); ctx.lineTo(10, 5);
        ctx.moveTo(10, -1); ctx.lineTo(4, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, 14);
        ctx.quadraticCurveTo(0, 10, 6, 14);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-7, 2, 3.5, 0, Math.PI * 2);
        ctx.arc(7, 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, 1, 1.2, 0, Math.PI * 2);
        ctx.arc(6, 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.arc(0, 11, 3.5, 0, Math.PI);
        ctx.fill();
      }

      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-16, 24, 32, 36, 10);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7c2d12';
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(-8, 30, 2.5, 0, Math.PI * 2);
      ctx.arc(8, 30, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(-9, 63, 6, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(9, 63, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawParticles(ctx) {
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawFloatingTexts(ctx) {
      for (const ft of this.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.font = `900 ${ft.size}px "Fredoka", "Noto Sans TC", sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 6;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
    }
  }

  // =========================================================================
  // 4. 光速小鼠 (Speedy Mouse) - 六動物賽跑與數學速算引擎
  // =========================================================================
  class SpeedyMouseGame {
    constructor() {
      this.canvas = document.getElementById('mouse-canvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

      this.isRunning = false;
      this.isPaused = false;
      this.timeLeft = 60; // 倒計時 60 秒 (1 分鐘)
      this.timerInterval = null;
      this.questionStartTime = 0;
      this.currentQuestion = null;
      this.stats = { totalAnswered: 0, correctCount: 0 };

      // 6 隻小動物參賽選手
      this.racers = [
        { id: 'hamster', name: '小倉鼠', icon: '🐹', isPlayer: true, color: '#f59e0b', trackY: 0, distance: 0, speedMultiplier: 1.0, boostTimer: 0, stunTimer: 0, bounceAngle: 0 },
        { id: 'cat', name: '小貓咪', icon: '🐱', isPlayer: false, color: '#f43f5e', trackY: 0, distance: 0, speedMultiplier: 1.0, aiType: 'agile', boostTimer: 0, nextAiAction: 3, bounceAngle: 0 },
        { id: 'dog', name: '小狗', icon: '🐶', isPlayer: false, color: '#eab308', trackY: 0, distance: 0, speedMultiplier: 1.0, aiType: 'chaser', boostTimer: 0, nextAiAction: 4, bounceAngle: 0 },
        { id: 'turtle', name: '烏龜', icon: '🐢', isPlayer: false, color: '#10b981', trackY: 0, distance: 0, speedMultiplier: 0.92, aiType: 'rocket_finish', boostTimer: 0, nextAiAction: 5, bounceAngle: 0 },
        { id: 'rabbit', name: '兔子', icon: '🐰', isPlayer: false, color: '#ec4899', trackY: 0, distance: 0, speedMultiplier: 1.08, aiType: 'bursty', boostTimer: 0, nextAiAction: 2.5, bounceAngle: 0 },
        { id: 'capybara', name: '小水豚', icon: '🥔', isPlayer: false, color: '#8b5cf6', trackY: 0, distance: 0, speedMultiplier: 0.98, aiType: 'chill', boostTimer: 0, nextAiAction: 4.5, bounceAngle: 0 }
      ];

      this.trackScroll = 0;
      this.particles = [];
      this.width = 680;
      this.height = 420;
      this.lastFrameTime = performance.now();

      this.initEvents();
    }

    initEvents() {
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
      if (!this.canvas) return;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      const trackHeight = this.height / 6;
      this.racers.forEach((r, idx) => {
        r.trackY = trackHeight * idx + trackHeight / 2;
      });
    }

    // 啟動賽事
    start() {
      sounds.init();
      this.isRunning = true;
      this.isPaused = false;
      this.timeLeft = 60;
      this.trackScroll = 0;
      this.particles = [];
      this.stats = { totalAnswered: 0, correctCount: 0 };
      this.lastFrameTime = performance.now();

      this.resizeCanvas();

      // 重置選手狀態
      this.racers.forEach((r) => {
        r.distance = 0;
        r.speedMultiplier = 1.0;
        r.boostTimer = 0;
        r.stunTimer = 0;
        r.bounceAngle = Math.random() * Math.PI;
      });

      this.updateHud();
      this.generateQuestion();

      // 啟動 60 秒倒數計時器
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (!this.isRunning || this.isPaused) return;
        this.timeLeft--;

        // 倒數 3, 2, 1 提示音
        if (this.timeLeft === 3 || this.timeLeft === 2 || this.timeLeft === 1) {
          sounds.playBeep(false);
        }

        this.updateHud();

        if (this.timeLeft <= 0) {
          this.endGame();
        }
      }, 1000);

      sounds.playBeep(true);
      requestAnimationFrame(() => this.loop());
    }

    // 數學心算題目生成器 (加、減、乘、除、補數題)
    generateQuestion() {
      const types = ['add', 'sub', 'mul', 'comp100', 'div'];
      const type = types[Math.floor(Math.random() * types.length)];
      let questionText = "";
      let answer = 0;

      if (type === 'add') {
        const a = 12 + Math.floor(Math.random() * 45);
        const b = 15 + Math.floor(Math.random() * 45);
        questionText = `${a} + ${b} = ?`;
        answer = a + b;
      } else if (type === 'sub') {
        const a = 35 + Math.floor(Math.random() * 60);
        const b = 12 + Math.floor(Math.random() * (a - 15));
        questionText = `${a} - ${b} = ?`;
        answer = a - b;
      } else if (type === 'mul') {
        const a = 3 + Math.floor(Math.random() * 7); // 3 ~ 9
        const b = 3 + Math.floor(Math.random() * 7); // 3 ~ 9
        questionText = `${a} × ${b} = ?`;
        answer = a * b;
      } else if (type === 'div') {
        const b = 2 + Math.floor(Math.random() * 8); // 2 ~ 9
        const ans = 3 + Math.floor(Math.random() * 8);
        const a = b * ans;
        questionText = `${a} ÷ ${b} = ?`;
        answer = ans;
      } else {
        // 100 補數
        const b = 15 + Math.floor(Math.random() * 75);
        questionText = `100 - ${b} = ?`;
        answer = 100 - b;
      }

      // 產生 3 個具有迷惑性的小干擾項
      const optionsSet = new Set([answer]);
      const deltaPool = [-10, 10, -1, 1, -2, 2, -5, 5];
      while (optionsSet.size < 4) {
        const delta = deltaPool[Math.floor(Math.random() * deltaPool.length)];
        const fake = answer + delta;
        if (fake > 0 && fake !== answer) {
          optionsSet.add(fake);
        } else {
          optionsSet.add(answer + Math.floor(Math.random() * 15) - 7);
        }
      }

      const options = Array.from(optionsSet);
      // 亂序排列
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      this.currentQuestion = { text: questionText, answer, options };
      this.questionStartTime = performance.now();
      this.renderQuestion();
    }

    // 渲染數學題目與四個選項按鈕
    renderQuestion() {
      const qTextEl = document.getElementById('mouse-question-text');
      const optionsContainer = document.getElementById('mouse-options-grid');
      if (qTextEl) qTextEl.textContent = this.currentQuestion.text;
      if (!optionsContainer) return;

      optionsContainer.innerHTML = '';
      this.currentQuestion.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = "py-3 px-4 rounded-xl border-2 border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-400 active:scale-95 text-slate-800 font-black text-xl sm:text-2xl shadow-sm transition-all";
        btn.textContent = opt;
        btn.onclick = () => this.handleAnswer(opt, btn);
        optionsContainer.appendChild(btn);
      });
    }

    // 答題反饋與衝刺計算
    handleAnswer(selected, btnEl) {
      if (!this.isRunning || this.isPaused || !this.currentQuestion) return;

      this.stats.totalAnswered++;
      const isCorrect = selected === this.currentQuestion.answer;
      const hamster = this.racers[0]; // 小倉鼠

      if (isCorrect) {
        this.stats.correctCount++;
        sounds.playTurbo();

        // 答題秒數判定
        const elapsedSec = (performance.now() - this.questionStartTime) / 1000;
        let boostMult = 1.4;
        let boostDuration = 1.2;
        let badgeText = "👍 加速前進!";

        if (elapsedSec < 1.0) {
          // 神速衝刺！
          boostMult = 2.8;
          boostDuration = 3.5;
          badgeText = "⚡ 神速衝刺 (HYPER DASH) +3.5s!";
        } else if (elapsedSec < 2.0) {
          // 光速衝刺！
          boostMult = 2.2;
          boostDuration = 2.5;
          badgeText = "🔥 光速衝刺 (SUPER DASH) +2.5s!";
        } else if (elapsedSec < 3.5) {
          // 強力加速！
          boostMult = 1.7;
          boostDuration = 1.8;
          badgeText = "✨ 強力加速 (FAST DASH) +1.8s!";
        }

        hamster.boostTimer = Math.max(hamster.boostTimer, boostDuration);
        hamster.speedMultiplier = boostMult;
        hamster.stunTimer = 0;

        // 噴發衝刺火焰粒子
        for (let i = 0; i < 24; i++) {
          this.particles.push({
            x: 80,
            y: hamster.trackY,
            vx: -2 - Math.random() * 6,
            vy: (Math.random() - 0.5) * 3,
            color: ['#fbbf24', '#f59e0b', '#f97316', '#ef4444'][Math.floor(Math.random() * 4)],
            size: 4 + Math.random() * 4,
            life: 0.6
          });
        }

        this.showDashFeedback(badgeText, '#10b981');
      } else {
        // 答錯：小倉鼠跌倒微減速 0.8s
        sounds.playHurt();
        hamster.stunTimer = 0.8;
        hamster.boostTimer = 0;
        hamster.speedMultiplier = 0.5;

        if (navigator.vibrate) {
          try { navigator.vibrate(100); } catch (_) {}
        }

        this.showDashFeedback("💫 算錯了！絆了一下~", '#ef4444');
      }

      this.generateQuestion();
    }

    showDashFeedback(text, color) {
      const fb = document.getElementById('mouse-dash-feedback');
      if (fb) {
        fb.textContent = text;
        fb.style.color = color;
        fb.classList.remove('opacity-0');
        clearTimeout(this._fbTimer);
        this._fbTimer = setTimeout(() => fb.classList.add('opacity-0'), 1500);
      }
    }

    // 核心循環
    loop() {
      if (!this.isRunning) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      if (!this.isPaused) {
        this.update(dt);
        this.render();
      }

      requestAnimationFrame(() => this.loop());
    }

    update(dt) {
      // 1. 基礎速度計算：初始速度 1.0 m/s，每 10 秒提速 10%
      const elapsed = 60 - this.timeLeft;
      const tier = Math.min(5, Math.floor(elapsed / 10)); // 0~5 段提速
      const baseGlobalSpeed = 1.0 * Math.pow(1.10, tier); // 1.0 -> 1.1 -> 1.21 -> 1.33 -> 1.46 -> 1.61 m/s

      // 2. 更新小動物 AI 隨機加速與推進
      this.racers.forEach((r) => {
        r.bounceAngle += dt * 12;

        if (r.isPlayer) {
          // 玩家小倉鼠
          if (r.boostTimer > 0) {
            r.boostTimer -= dt;
            if (r.boostTimer <= 0) r.speedMultiplier = 1.0;
          }
          if (r.stunTimer > 0) {
            r.stunTimer -= dt;
            if (r.stunTimer <= 0) r.speedMultiplier = 1.0;
          }
        } else {
          // AI 對手動物特色隨機加速
          r.nextAiAction -= dt;
          if (r.nextAiAction <= 0) {
            this.handleAiAction(r);
          }
        }

        // 實際速度與距離推進
        const currentSpeed = baseGlobalSpeed * (r.speedMultiplier || 1.0);
        r.distance += currentSpeed * dt * 4.5; // 適度放大視覺跑動米數感
      });

      // 3. 跑道背景滾動速度 (以小倉鼠速度為基準)
      const playerSpeed = baseGlobalSpeed * (this.racers[0].speedMultiplier || 1.0);
      this.trackScroll += playerSpeed * dt * 80;

      // 4. 更新粒子
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 1.5;
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      this.updateHud();
    }

    // AI 動物隨機加速邏輯
    handleAiAction(racer) {
      if (racer.id === 'rabbit') {
        // 兔子：爆發衝刺或稍稍停頓
        if (Math.random() < 0.65) {
          racer.speedMultiplier = 1.8 + Math.random() * 0.5;
          racer.nextAiAction = 1.5 + Math.random() * 1.2;
        } else {
          racer.speedMultiplier = 0.85; // 打瞌睡
          racer.nextAiAction = 0.8;
        }
      } else if (racer.id === 'turtle') {
        // 烏龜：最後 15 秒大爆發火箭衝刺，平時沉穩
        if (this.timeLeft <= 15) {
          racer.speedMultiplier = 2.2 + Math.random() * 0.4;
          racer.nextAiAction = 3;
        } else {
          racer.speedMultiplier = 0.95 + Math.random() * 0.15;
          racer.nextAiAction = 4;
        }
      } else if (racer.id === 'cat') {
        // 貓咪：頻繁敏捷小衝刺
        racer.speedMultiplier = 1.3 + Math.random() * 0.45;
        racer.nextAiAction = 1.8 + Math.random() * 2.0;
      } else if (racer.id === 'dog') {
        // 狗狗：追隨前鋒，前方有人越衝刺
        racer.speedMultiplier = 1.25 + Math.random() * 0.5;
        racer.nextAiAction = 2.0 + Math.random() * 2.5;
      } else if (racer.id === 'capybara') {
        // 水豚：佛系穩定
        racer.speedMultiplier = 1.05 + Math.random() * 0.25;
        racer.nextAiAction = 3.5 + Math.random() * 2.0;
      }
    }

    // 更新抬頭顯示 (中央已跑距離、倒計時、即時排名)
    updateHud() {
      const timeEl = document.getElementById('mouse-time-left');
      const distEl = document.getElementById('mouse-player-dist');
      const rankEl = document.getElementById('mouse-player-rank');

      if (timeEl) timeEl.textContent = `${this.timeLeft}s`;

      const hamster = this.racers[0];
      if (distEl) distEl.textContent = `${hamster.distance.toFixed(1)} m`;

      // 計算即時名次
      const sorted = [...this.racers].sort((a, b) => b.distance - a.distance);
      const playerRank = sorted.findIndex(r => r.isPlayer) + 1;
      if (rankEl) {
        rankEl.textContent = `第 ${playerRank} 名`;
        rankEl.className = `px-2.5 py-0.5 rounded-full text-xs font-black shadow-xs ${
          playerRank === 1 ? 'bg-amber-400 text-amber-950 animate-bounce' : playerRank <= 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-700'
        }`;
      }
    }

    // 比賽結束結算
    endGame() {
      this.isRunning = false;
      if (this.timerInterval) clearInterval(this.timerInterval);
      sounds.playWhistle();

      const modal = document.getElementById('mouse-result-modal');
      const listContainer = document.getElementById('mouse-podium-list');
      const accuracyEl = document.getElementById('mouse-stat-accuracy');
      const totalAnsEl = document.getElementById('mouse-stat-total');

      if (accuracyEl) {
        const rate = this.stats.totalAnswered > 0 ? Math.round((this.stats.correctCount / this.stats.totalAnswered) * 100) : 0;
        accuracyEl.textContent = `${rate}%`;
      }
      if (totalAnsEl) totalAnsEl.textContent = `${this.stats.correctCount} / ${this.stats.totalAnswered} 題`;

      // 依距離由遠到近排序
      const sorted = [...this.racers].sort((a, b) => b.distance - a.distance);

      if (listContainer) {
        listContainer.innerHTML = '';
        sorted.forEach((r, idx) => {
          const rank = idx + 1;
          const row = document.createElement('div');
          row.className = `flex items-center justify-between p-2.5 rounded-xl border ${
            r.isPlayer ? 'bg-amber-100/90 border-amber-400 font-black shadow-sm ring-2 ring-amber-300' : 'bg-white border-slate-200 font-bold'
          }`;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
          row.innerHTML = `
            <div class="flex items-center gap-2.5">
              <span class="w-6 text-center text-base">${medal}</span>
              <span class="text-xl">${r.icon}</span>
              <span class="text-sm text-slate-800">${r.name} ${r.isPlayer ? '<span class="text-xs text-amber-700">(你)</span>' : ''}</span>
            </div>
            <span class="font-black text-sm text-slate-700">${r.distance.toFixed(1)} 公尺</span>
          `;
          listContainer.appendChild(row);
        });
      }

      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }

    // 繪製賽跑主畫面
    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, this.width, this.height);

      const trackHeight = this.height / 6;

      // 1. 繪製 6 條跑道
      for (let i = 0; i < 6; i++) {
        const y = i * trackHeight;
        // 跑道紅土/草坪漸層
        ctx.fillStyle = i % 2 === 0 ? '#fed7aa' : '#ffedd5';
        ctx.fillRect(0, y, this.width, trackHeight);

        // 跑道白色分隔虛線
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([16, 14]);
        ctx.beginPath();
        ctx.moveTo(0, y + trackHeight);
        ctx.lineTo(this.width, y + trackHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // 跑道號碼
        ctx.fillStyle = 'rgba(154, 52, 18, 0.35)';
        ctx.font = '900 16px "Fredoka", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`R${i + 1}`, 12, y + 24);
      }

      // 2. 跑道動態標線 (隨滾動向左流動)
      const offset = (this.trackScroll % 60);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      for (let x = -offset; x < this.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }

      // 3. 繪製粒子特效 (火焰氣流)
      for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 4. 繪製 6 隻小動物跑者 (根據相對小倉鼠的距離決定橫向螢幕位置)
      const playerDist = this.racers[0].distance;
      const baseScreenX = 140; // 小倉鼠基準螢幕 X 座標

      this.racers.forEach((r) => {
        // 相對距離差映射為畫布 X
        const relativeDiff = (r.distance - playerDist) * 8;
        const screenX = Math.max(45, Math.min(this.width - 55, baseScreenX + relativeDiff));
        const bounce = Math.sin(r.bounceAngle) * 4;

        ctx.save();
        ctx.translate(screenX, r.trackY + bounce);

        // 若正在衝刺，繪製身後光暈火焰
        if (r.boostTimer > 0) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
          ctx.beginPath();
          ctx.ellipse(-15, 0, 22, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-20, -6);
          ctx.lineTo(-38, 0);
          ctx.lineTo(-20, 6);
          ctx.fill();
        }

        // 動物圓形頭像底色
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 6;
        ctx.fillStyle = r.isPlayer ? '#fef08a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // 邊框
        ctx.lineWidth = r.isPlayer ? 3 : 2;
        ctx.strokeStyle = r.isPlayer ? '#d97706' : '#cbd5e1';
        ctx.stroke();

        // Emoji 圖示
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(r.icon, 0, 2);

        // 選手名字浮標
        ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
        ctx.fillStyle = r.isPlayer ? '#9a3412' : '#475569';
        ctx.fillText(`${r.name} (${r.distance.toFixed(0)}m)`, 0, -26);

        ctx.restore();
      });
    }
  }

  // =========================================================================
  // 4. 成語疊疊樂 (Idiom Stacker) - 縱橫交錯・洞築機先 (公視《一字千金》題型)
  // =========================================================================
  class IdiomStackerGame {
    constructor() {
      this.isRunning = false;
      this.level = 1;
      this.score = 0;
      this.lives = 3;
      this.currentPuzzle = null;
      this.selectedSlotKey = null; // 當前聚焦等待填入的空格 key
      this.userFilled = {}; // slotKey -> character
      this.solved = false;
      this.idiomsBank = [];
      this.pairsList = [];
      this.laddersList = [];
    }

    // 初始化與關聯 200 核心成語題庫
    initData() {
      if (typeof IDIOMS_200 !== 'undefined' && Array.isArray(IDIOMS_200) && IDIOMS_200.length > 0) {
        this.idiomsBank = IDIOMS_200;
      } else {
        // 內建兜底高頻成語
        this.idiomsBank = [
          { name: "口若懸河", bopomofo: "ㄎㄡˇ ㄖㄨㄛˋ ㄒㄩㄢˊ ㄏㄜˊ", meaning: "形容說話像瀑布一樣滔滔不絕，比喻能言善辯。", example: "他辯才無礙，在辯論比賽中口若懸河。" },
          { name: "信口開河", bopomofo: "ㄒㄧㄣˋ ㄎㄡˇ ㄎㄞ ㄏㄜˊ", meaning: "不加思索隨意亂說，毫無根據。", example: "做人要誠實可靠，不可信口開河。" },
          { name: "河清海晏", bopomofo: "ㄏㄜˊ ㄑㄧㄥ ㄏㄞˇ ㄧㄢˋ", meaning: "比喻天下太平。", example: "國泰民安，四海河清海晏。" },
          { name: "開門見山", bopomofo: "ㄎㄞ ㄇㄣˊ ㄐㄧㄢˋ ㄕㄢ", meaning: "說話或寫文章直截了當切入主題。", example: "演講時開門見山，才能吸引聽眾。" },
          { name: "山明水秀", bopomofo: "ㄕㄢ ㄇㄧㄥˊ ㄕㄨㄟˇ ㄒㄧㄡˋ", meaning: "山水風景秀美明麗。", example: "花蓮依山傍海，風景山明水秀。" },
          { name: "水落石出", bopomofo: "ㄕㄨㄟˇ ㄌㄨㄛˋ ㄕˊ ㄔㄨ", meaning: "比喻事情真相大白。", example: "經過警方調查，案情終於水落石出。" },
          { name: "出神入化", bopomofo: "ㄔㄨ ㄕㄣˊ ㄖㄨˋ ㄏㄨㄚˋ", meaning: "形容技藝高超精妙，達到化境。", example: "他彈鋼琴的技巧已達出神入化的境界。" }
        ];
      }

      // 預先計算成語交錯配對
      this.pairsList = [];
      for (let i = 0; i < this.idiomsBank.length; i++) {
        for (let j = 0; j < this.idiomsBank.length; j++) {
          if (i === j) continue;
          const h = this.idiomsBank[i].name;
          const v = this.idiomsBank[j].name;
          for (let pH = 0; pH < h.length; pH++) {
            for (let pV = 0; pV < v.length; pV++) {
              if (h[pH] === v[pV]) {
                this.pairsList.push({
                  nameH: h, posH: pH,
                  nameV: v, posV: pV,
                  char: h[pH]
                });
              }
            }
          }
        }
      }

      // 預先計算 3 條成語雙十字階梯 (Ladder: 1 縱貫條 × 2 橫排條)
      this.laddersList = [];
      for (let i = 0; i < this.pairsList.length; i++) {
        const p1 = this.pairsList[i];
        for (let j = i + 1; j < this.pairsList.length; j++) {
          const p2 = this.pairsList[j];
          if (p1.nameV === p2.nameV && p1.nameH !== p2.nameH && p1.posV < p2.posV) {
            this.laddersList.push({ p1, p2 });
          }
        }
      }
    }

    start() {
      this.isRunning = true;
      this.level = 1;
      this.score = 0;
      this.lives = 3;
      this.initData();
      this.updateLivesUI();
      this.loadLevel(this.level);
    }

    updateLivesUI() {
      for (let i = 1; i <= 3; i++) {
        const heart = document.getElementById(`idiom-life-${i}`);
        if (heart) {
          if (i <= this.lives) {
            heart.className = 'fa-solid fa-heart text-rose-500 scale-100 transition-transform';
          } else {
            heart.className = 'fa-regular fa-heart text-slate-300 scale-90 transition-transform';
          }
        }
      }
    }

    // 依關卡難度生成縱橫謎題
    generatePuzzle(level) {
      // 關卡 1~5: 經典雙成語十字交叉 (2 Idioms, 1 Intersection, 1~2 Blanks)
      // 關卡 6 以上: 進階三成語立體縱橫階梯 (3 Idioms, 2 Intersections, 2~3 Blanks)
      const isAdvanced = level >= 6 && this.laddersList.length > 0;

      if (!isAdvanced) {
        // 隨機選取一組雙成語十字
        const pick = this.pairsList[Math.floor(Math.random() * this.pairsList.length)];
        const posH = pick.posH;
        const posV = pick.posV;

        const cells = {};
        // 放置垂直成語 (V): 列 0..3, 行 posH
        for (let r = 0; r < 4; r++) {
          const k = `${r},${posH}`;
          cells[k] = {
            r, c: posH,
            char: pick.nameV[r],
            isCross: false,
            idioms: [pick.nameV]
          };
        }
        // 放置水平成語 (H): 列 posV, 行 0..3
        for (let c = 0; c < 4; c++) {
          const k = `${posV},${c}`;
          if (cells[k]) {
            cells[k].isCross = true;
            cells[k].idioms.push(pick.nameH);
          } else {
            cells[k] = {
              r: posV, c,
              char: pick.nameH[c],
              isCross: false,
              idioms: [pick.nameH]
            };
          }
        }

        // 決定哪些格子留白成「空格洞」(洞築機先)
        // 必空交會字！如果關卡 >= 3，再隨機空 1 個周邊字
        const blankKeys = [`${posV},${posH}`];
        if (level >= 3) {
          const otherKeys = Object.keys(cells).filter(k => k !== `${posV},${posH}`);
          const extraKey = otherKeys[Math.floor(Math.random() * otherKeys.length)];
          blankKeys.push(extraKey);
        }

        return {
          type: '2_cross',
          modeName: '十字交叉',
          idiomNames: [pick.nameH, pick.nameV],
          cells,
          blankKeys,
          minR: 0, maxR: 3,
          minC: 0, maxC: 3
        };
      } else {
        // 三成語雙十字階梯
        const ladder = this.laddersList[Math.floor(Math.random() * this.laddersList.length)];
        const p1 = ladder.p1;
        const p2 = ladder.p2;

        const pV1 = p1.posV, pH1 = p1.posH;
        const pV2 = p2.posV, pH2 = p2.posH;
        let c_V = Math.max(pH1, pH2);
        const min_c = Math.min(c_V - pH1, c_V - pH2);
        c_V = c_V - min_c; // 正規化至左側緊貼

        const cells = {};
        // 放置貫穿縱線成語 (V)
        for (let r = 0; r < 4; r++) {
          const k = `${r},${c_V}`;
          cells[k] = {
            r, c: c_V,
            char: p1.nameV[r],
            isCross: false,
            idioms: [p1.nameV]
          };
        }
        // 放置水平成語 1 (H1)
        const start_c1 = c_V - pH1;
        for (let i = 0; i < 4; i++) {
          const c = start_c1 + i;
          const k = `${pV1},${c}`;
          if (cells[k]) {
            cells[k].isCross = true;
            cells[k].idioms.push(p1.nameH);
          } else {
            cells[k] = {
              r: pV1, c,
              char: p1.nameH[i],
              isCross: false,
              idioms: [p1.nameH]
            };
          }
        }
        // 放置水平成語 2 (H2)
        const start_c2 = c_V - pH2;
        for (let i = 0; i < 4; i++) {
          const c = start_c2 + i;
          const k = `${pV2},${c}`;
          if (cells[k]) {
            cells[k].isCross = true;
            cells[k].idioms.push(p2.nameH);
          } else {
            cells[k] = {
              r: pV2, c,
              char: p2.nameH[i],
              isCross: false,
              idioms: [p2.nameH]
            };
          }
        }

        // 計算整體邊界
        const allR = Object.values(cells).map(x => x.r);
        const allC = Object.values(cells).map(x => x.c);
        const minR = Math.min(...allR), maxR = Math.max(...allR);
        const minC = Math.min(...allC), maxC = Math.max(...allC);

        // 兩個交會點必為空格洞
        const cross1 = `${pV1},${c_V}`;
        const cross2 = `${pV2},${c_V}`;
        const blankKeys = [cross1, cross2];

        // 關卡 >= 9 再加空 1 格
        if (level >= 9) {
          const others = Object.keys(cells).filter(k => !blankKeys.includes(k));
          const extra = others[Math.floor(Math.random() * others.length)];
          blankKeys.push(extra);
        }

        return {
          type: '3_ladder',
          modeName: '立體雙縱橫',
          idiomNames: [p1.nameV, p1.nameH, p2.nameH],
          cells,
          blankKeys,
          minR, maxR,
          minC, maxC
        };
      }
    }

    loadLevel(level) {
      this.solved = false;
      this.userFilled = {};
      this.currentPuzzle = this.generatePuzzle(level);

      // 預設將第一個空格選取為活躍焦點
      this.selectedSlotKey = this.currentPuzzle.blankKeys[0];

      // 更新關卡徽章
      const lvlBadge = document.getElementById('idiom-level-badge');
      if (lvlBadge) lvlBadge.textContent = `第 ${level} 關`;
      const modeBadge = document.getElementById('idiom-mode-badge');
      if (modeBadge) modeBadge.textContent = this.currentPuzzle.modeName;
      const scoreBadge = document.getElementById('idiom-score-count');
      if (scoreBadge) scoreBadge.textContent = this.score;

      // 渲染棋盤
      this.renderBoard();
      // 渲染候選積木池
      this.renderBlockPool();
    }

    renderBoard() {
      const boardEl = document.getElementById('idiom-grid-board');
      if (!boardEl || !this.currentPuzzle) return;

      const p = this.currentPuzzle;
      const numRows = p.maxR - p.minR + 1;
      const numCols = p.maxC - p.minC + 1;

      boardEl.style.gridTemplateRows = `repeat(${numRows}, minmax(0, 1fr))`;
      boardEl.style.gridTemplateColumns = `repeat(${numCols}, minmax(0, 1fr))`;
      boardEl.innerHTML = '';

      for (let r = p.minR; r <= p.maxR; r++) {
        for (let c = p.minC; c <= p.maxC; c++) {
          const key = `${r},${c}`;
          const cellData = p.cells[key];

          const cellDiv = document.createElement('div');
          // 尺寸響應式 (手機 46px, 平板/電腦 56px)
          cellDiv.className = 'w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl transition-all relative idiom-grid-cell';

          if (!cellData) {
            // 空白佔位格 (維持棋盤網格對齊)
            cellDiv.classList.add('opacity-0', 'pointer-events-none');
            boardEl.appendChild(cellDiv);
            continue;
          }

          const isBlank = p.blankKeys.includes(key);

          if (isBlank) {
            // 空白孔洞 (洞築機先)
            cellDiv.dataset.key = key;
            cellDiv.onclick = () => this.selectSlot(key);

            const filledChar = this.userFilled[key];
            if (filledChar) {
              // 玩家已填入字 (果凍積木立體效果)
              cellDiv.classList.add(
                'bg-emerald-500', 'text-white', 'border-2', 'border-emerald-600',
                'shadow-md', 'cursor-pointer', 'animate-block-pop'
              );
              cellDiv.innerHTML = `
                <span>${filledChar}</span>
                <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-700 hover:bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold shadow-xs">
                  <i class="fa-solid fa-xmark"></i>
                </span>
              `;
            } else {
              // 待填空格洞 (凹槽孔洞視覺)
              cellDiv.classList.add(
                'bg-amber-100/90', 'border-2', 'border-dashed', 'border-amber-400',
                'text-amber-600', 'cursor-pointer', 'hover:bg-amber-200/80', 'hover:border-amber-500'
              );
              if (key === this.selectedSlotKey) {
                cellDiv.classList.add('idiom-slot-active');
              }
              // 凹槽符號
              cellDiv.innerHTML = `<i class="fa-solid fa-plus text-xs sm:text-sm opacity-40"></i>`;
            }

            // 若為交錯孔洞，右上角添加閃爍雙向小角標
            if (cellData.isCross) {
              const crossBadge = document.createElement('span');
              crossBadge.className = 'absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center font-black shadow-xs';
              crossBadge.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right text-[8px]"></i>';
              crossBadge.title = '縱橫關鍵交會字';
              cellDiv.appendChild(crossBadge);
            }
          } else {
            // 已知題目字 (木質金字立體積木)
            cellDiv.classList.add(
              'bg-gradient-to-b', 'from-white', 'to-slate-100', 'text-slate-800',
              'border-2', 'border-slate-300', 'shadow-xs', 'pointer-events-none'
            );
            cellDiv.textContent = cellData.char;

            // 若為交錯格
            if (cellData.isCross) {
              cellDiv.classList.add('border-emerald-400', 'bg-emerald-50/50');
            }
          }

          boardEl.appendChild(cellDiv);
        }
      }
    }

    renderBlockPool() {
      const container = document.getElementById('idiom-pool-container');
      if (!container || !this.currentPuzzle) return;

      container.innerHTML = '';

      // 提取本題空格正確字
      const correctChars = this.currentPuzzle.blankKeys.map(k => this.currentPuzzle.cells[k].char);

      // 收集干擾字 (從成語庫中隨機選取相似或常見字)
      const distractorPool = [];
      this.idiomsBank.forEach(item => {
        for (let c of item.name) {
          if (!correctChars.includes(c) && !distractorPool.includes(c)) {
            distractorPool.push(c);
          }
        }
      });
      // 隨機混淆 4~5 個干擾字
      distractorPool.sort(() => Math.random() - 0.5);
      const neededDistractors = Math.max(4, 7 - correctChars.length);
      const chosenDistractors = distractorPool.slice(0, neededDistractors);

      // 合併並洗牌
      const pool = [...correctChars, ...chosenDistractors].sort(() => Math.random() - 0.5);

      pool.forEach(char => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-b from-emerald-500 to-teal-700 text-white font-black text-xl sm:text-2xl idiom-block-btn flex items-center justify-center transition-all cursor-pointer border border-emerald-300/40 relative active:scale-95';
        btn.textContent = char;

        btn.onclick = () => this.handlePickBlock(char, btn);
        container.appendChild(btn);
      });
    }

    selectSlot(key) {
      if (this.solved) return;
      // 若點選已填格，則清空還原
      if (this.userFilled[key]) {
        delete this.userFilled[key];
        sounds.playBlockSnap();
        this.selectedSlotKey = key;
        this.renderBoard();
        return;
      }
      this.selectedSlotKey = key;
      sounds.playBlockSnap();
      this.renderBoard();
    }

    handlePickBlock(char, btnEl) {
      if (this.solved) return;

      // 如果尚未選定空格，自動定位到第一個尚未填寫的空格
      if (!this.selectedSlotKey || this.userFilled[this.selectedSlotKey]) {
        const emptyKey = this.currentPuzzle.blankKeys.find(k => !this.userFilled[k]);
        if (emptyKey) {
          this.selectedSlotKey = emptyKey;
        } else {
          // 全部空格都已填滿
          return;
        }
      }

      const targetKey = this.selectedSlotKey;
      this.userFilled[targetKey] = char;
      sounds.playBlockSnap();

      // 尋找下一個未填空格作為新焦點
      const nextEmpty = this.currentPuzzle.blankKeys.find(k => !this.userFilled[k]);
      this.selectedSlotKey = nextEmpty || null;

      this.renderBoard();

      // 檢查是否所有空格均已填入
      const allFilled = this.currentPuzzle.blankKeys.every(k => this.userFilled[k]);
      if (allFilled) {
        this.validateAnswers();
      }
    }

    validateAnswers() {
      const p = this.currentPuzzle;
      let allCorrect = true;

      for (let k of p.blankKeys) {
        const expected = p.cells[k].char;
        const actual = this.userFilled[k];
        if (expected !== actual) {
          allCorrect = false;
          break;
        }
      }

      if (allCorrect) {
        // 完全正確！通關！
        this.solved = true;
        this.score += 1;
        sounds.playFanfare();

        // 觸發手機震動 (成功雙響 0.1s + 0.1s)
        if (navigator.vibrate) {
          try { navigator.vibrate([100, 60, 100]); } catch (_) {}
        }

        // 彈出成語解析成功慶祝彈窗
        setTimeout(() => {
          this.showSuccessModal();
        }, 350);
      } else {
        // 答錯扣血
        this.lives -= 1;
        this.updateLivesUI();
        sounds.playHurt();

        // 觸發手機震動 0.5 秒 (同搶救字母大作戰規範)
        if (navigator.vibrate) {
          try { navigator.vibrate(500); } catch (_) {}
        }

        showGameToast('填入字有誤喔！仔細推敲縱橫上下文～', 'fa-circle-exclamation');

        // 清除錯誤的填空
        for (let k of p.blankKeys) {
          if (this.userFilled[k] !== p.cells[k].char) {
            delete this.userFilled[k];
          }
        }
        this.selectedSlotKey = p.blankKeys.find(k => !this.userFilled[k]);
        this.renderBoard();

        if (this.lives <= 0) {
          // 機會用盡，遊戲結束
          this.handleGameOver();
        }
      }
    }

    showSuccessModal() {
      const modal = document.getElementById('idiom-success-modal');
      const detailsEl = document.getElementById('idiom-success-details');
      if (!modal || !detailsEl) return;

      detailsEl.innerHTML = '';

      // 渲染本關成語解析卡片
      this.currentPuzzle.idiomNames.forEach(name => {
        const found = this.idiomsBank.find(x => x.name === name) || {
          name, bopomofo: '', meaning: '成語釋義', example: ''
        };

        const card = document.createElement('div');
        card.className = 'bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-xs';
        card.innerHTML = `
          <div class="flex items-center justify-between mb-1.5">
            <div class="flex items-baseline gap-2">
              <span class="text-base sm:text-lg font-black text-slate-800 tracking-wider">${found.name}</span>
              <span class="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">${found.bopomofo || ''}</span>
            </div>
            <button onclick="window.coolGameIdiom && window.coolGameIdiom.speakIdiom('${found.name}')" title="語音朗讀" class="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs transition-all">
              <i class="fa-solid fa-volume-high"></i>
            </button>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed mb-1.5"><strong class="text-slate-700">釋義：</strong>${found.meaning || '暫無釋義'}</p>
          ${found.example ? `<p class="text-xs text-slate-500 leading-relaxed bg-white p-2 rounded-lg border border-slate-100"><strong class="text-slate-600">例句：</strong>${found.example}</p>` : ''}
        `;
        detailsEl.appendChild(card);
      });

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    speakIdiom(text) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-TW';
        u.rate = 0.9;
        window.speechSynthesis.speak(u);
      }
    }

    nextLevel() {
      const modal = document.getElementById('idiom-success-modal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
      this.level += 1;
      this.loadLevel(this.level);
    }

    showHint() {
      if (this.solved || !this.currentPuzzle) return;
      // 提示一處未填空格的正確答案
      const emptyKey = this.currentPuzzle.blankKeys.find(k => !this.userFilled[k]);
      if (emptyKey) {
        const correctChar = this.currentPuzzle.cells[emptyKey].char;
        this.userFilled[emptyKey] = correctChar;
        sounds.playCatch();
        this.selectedSlotKey = this.currentPuzzle.blankKeys.find(k => !this.userFilled[k]) || null;
        this.renderBoard();
        showGameToast(`為您自動填入「${correctChar}」！`, 'fa-wand-magic-sparkles');

        if (this.currentPuzzle.blankKeys.every(k => this.userFilled[k])) {
          this.validateAnswers();
        }
      } else {
        showGameToast('所有空格均已填滿囉！', 'fa-check');
      }
    }

    handleGameOver() {
      this.isRunning = false;
      sounds.playGameOver();
      const modal = document.getElementById('idiom-gameover-modal');
      const scoreEl = document.getElementById('idiom-gameover-score');
      if (scoreEl) scoreEl.textContent = this.score;
      if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      }
    }
  }

  // =========================================================================
  // 5. 模組導出與全域初始化
  // =========================================================================
  window.coolGameRescue = new WordRescueGame();
  window.coolGameSpeedyMouse = new SpeedyMouseGame();
  window.coolGameIdiom = new IdiomStackerGame();
  window.coolGameSounds = sounds;
  window.speakCurrentWord = () => {
    if (window.coolGameRescue && window.coolGameRescue.currentWord) {
      speakWord(window.coolGameRescue.currentWord);
    }
  };
})();
