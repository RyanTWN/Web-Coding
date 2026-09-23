/**
 * 酷學習 Cool Learning - 邊玩邊學遊戲引擎
 * 核心遊戲：搶救字母大作戰 (Word Rescue)
 * 支援：滑鼠靈敏跟隨、手機/平板觸控拖曳、三滴血扣血機制、即時音效與英文發音
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

  // 嘗試載入學生當日英語學習單字進行擴充
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
  }

  const sounds = new SoundEngine();

  // 語音朗讀單字 (Web Speech Synthesis)
  function speakWord(text) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (_) {}
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

      // 畫布縮放比
      this.scale = 1;
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
      const container = this.canvas.parentElement;
      if (!container) return;
      const w = Math.min(container.clientWidth || 640, 680);
      const h = Math.min(window.innerHeight * 0.65, 680);
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

      // 自動朗讀單字，加深記憶
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

    // 掉落物生成
    spawnBubble() {
      // 確保一定機率出現當前需要的字母
      const targetChar = this.currentWord[this.targetLetterIndex];
      const isTarget = Math.random() < 0.45; // 45% 機率產生目前所需字母
      let char = targetChar;

      if (!isTarget || !targetChar) {
        // 隨機干擾字母
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        char = alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      const radius = 26;
      const x = radius + Math.random() * (this.width - radius * 2);
      const speed = 2.2 + Math.min(this.rescuedCount * 0.15, 2.5); // 隨過關數平緩微幅提速

      // 多彩活潑泡泡顏色
      const colors = [
        { bg: '#38bdf8', border: '#0284c7', text: '#ffffff' }, // 天藍
        { bg: '#fb923c', border: '#ea580c', text: '#ffffff' }, // 活力橙
        { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' }, // 夢幻紫
        { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // 亮桃紅
        { bg: '#10b981', border: '#059669', text: '#ffffff' }, // 翠綠
        { bg: '#facc15', border: '#ca8a04', text: '#713f12' }  // 金黃
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

    // 主渲染循環
    loop() {
      if (!this.isRunning) return;
      if (!this.isPaused) {
        this.update();
        this.render();
      }
      requestAnimationFrame(() => this.loop());
    }

    update() {
      // 角色平滑插值跟隨目標 X
      this.player.x += (this.player.targetX - this.player.x) * 0.28;

      // 表情恢復
      if (this.player.moodTimer > 0) {
        this.player.moodTimer--;
        if (this.player.moodTimer <= 0) {
          this.player.faceMood = 'normal';
        }
      }

      // 震動衰減
      if (this.shakeIntensity > 0) {
        this.shakeIntensity *= 0.88;
        if (this.shakeIntensity < 0.2) this.shakeIntensity = 0;
      }

      // 生成掉落物
      this.spawnTimer++;
      if (this.spawnTimer >= this.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnBubble();
      }

      // 菜籃接物判定區
      const basketY = this.player.y - 10;
      const basketLeft = this.player.x - this.player.basketWidth / 2;
      const basketRight = this.player.x + this.player.basketWidth / 2;

      // 更新泡泡物理與碰撞
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.y += b.speed;
        b.wobble += b.wobbleSpeed;
        const currentX = b.x + Math.sin(b.wobble) * 1.5;

        // 碰撞檢測：進入菜籃上方區域
        if (
          b.y + b.radius >= basketY &&
          b.y - b.radius <= basketY + this.player.basketHeight &&
          currentX >= basketLeft &&
          currentX <= basketRight
        ) {
          // 接到了！
          this.handleCatchLetter(b, currentX, basketY);
          this.bubbles.splice(i, 1);
          continue;
        }

        // 掉落地面破裂移除
        if (b.y - b.radius > this.height) {
          this.bubbles.splice(i, 1);
        }
      }

      // 更新粒子特效
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // 重力
        p.life -= 0.025;
        if (p.life <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // 更新漂浮文字
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

        // 噴發金色星星粒子
        this.createParticles(catchX, catchY, '#fbbf24', 18);
        this.addFloatingText(`+25 ${bubble.char}!`, catchX, catchY - 15, '#10b981');

        this.renderWordSlots();
        this.updateHud();

        // 檢查單字是否全部完成
        if (this.targetLetterIndex >= this.currentWord.length) {
          this.handleWordCompleted();
        }
      } else {
        // =====================
        // 接錯字母！扣一滴血
        // =====================
        sounds.playHurt();
        this.lives--;
        this.shakeIntensity = 12; // 畫面震動
        this.player.faceMood = 'hurt';
        this.player.moodTimer = 45;

        // 噴發紅色警戒粒子
        this.createParticles(catchX, catchY, '#f43f5e', 22);
        this.addFloatingText(`-1 ❤️ 錯了!`, catchX, catchY - 15, '#f43f5e');

        this.updateHud();

        // 檢查是否血量扣完
        if (this.lives <= 0) {
          this.gameOver();
        }
      }
    }

    // 單字拼寫完成
    handleWordCompleted() {
      sounds.playWordComplete();
      this.score += 100;
      this.rescuedCount++;
      this.updateHud();

      // 產生慶祝粒子雨
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

      this.addFloatingText("PERFECT! +100", this.width / 2, 220, '#f59e0b', 28);

      // 稍作停頓展示並發音，接著前往下一題
      setTimeout(() => {
        if (this.isRunning && this.lives > 0) {
          this.pickNextWord();
        }
      }, 1400);
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

    // 粒子生成器
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

    // 漂浮提示文字
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

    // 繪製全畫面
    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;

      ctx.save();

      // 震動效果
      if (this.shakeIntensity > 0) {
        const ox = (Math.random() - 0.5) * this.shakeIntensity;
        const oy = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(ox, oy);
      }

      // 1. 清空畫布並繪製童趣天空與草地背景
      this.drawBackground(ctx);

      // 2. 繪製掉落中的字母泡泡
      this.drawBubbles(ctx);

      // 3. 繪製頂著菜籃的小人
      this.drawPlayer(ctx);

      // 4. 繪製粒子特效
      this.drawParticles(ctx);

      // 5. 繪製漂浮提示字
      this.drawFloatingTexts(ctx);

      ctx.restore();
    }

    drawBackground(ctx) {
      // 漸層天空
      const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      skyGrad.addColorStop(0, '#e0f2fe'); // 柔和天藍
      skyGrad.addColorStop(0.7, '#f0fdf4'); // 淡淡草綠
      skyGrad.addColorStop(1, '#dcfce7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, this.height);

      // 飄動白雲 (背景點綴)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.drawCloud(ctx, 90, 80, 48);
      this.drawCloud(ctx, 420, 110, 60);
      this.drawCloud(ctx, 260, 60, 36);

      // 地面綠地弧形
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

        // 泡泡陰影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // 圓形主體
        ctx.fillStyle = b.color.bg;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // 邊框
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = b.color.border;
        ctx.stroke();

        // 高光亮點
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-b.radius * 0.3, -b.radius * 0.35, b.radius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // 字母本體
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

      // 1. 菜籃 (位於小人頭頂)
      const bW = p.basketWidth;
      const bH = p.basketHeight;
      const bY = -35;

      // 菜籃本體 (編織質感褐黃色)
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

      // 菜籃紅白野餐格子布內襯
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.moveTo(-bW / 2 + 4, bY);
      ctx.quadraticCurveTo(0, bY - 8, bW / 2 - 4, bY);
      ctx.lineTo(bW / 2 - 8, bY + 8);
      ctx.quadraticCurveTo(0, bY + 12, -bW / 2 + 8, bY + 8);
      ctx.closePath();
      ctx.fill();

      // 菜籃編織條紋
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.5)';
      ctx.lineWidth = 2;
      for (let i = -bW / 2 + 16; i < bW / 2 - 10; i += 14) {
        ctx.beginPath();
        ctx.moveTo(i, bY + 2);
        ctx.lineTo(i - 4, bY + bH - 2);
        ctx.stroke();
      }

      // 2. 雙手向上舉托著菜籃
      ctx.strokeStyle = '#fbcfe8'; // 手臂膚色
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      // 左手臂
      ctx.beginPath();
      ctx.moveTo(-16, 12);
      ctx.lineTo(-28, -6);
      ctx.lineTo(-bW / 2 + 14, bY + bH - 4);
      ctx.stroke();
      // 右手臂
      ctx.beginPath();
      ctx.moveTo(16, 12);
      ctx.lineTo(28, -6);
      ctx.lineTo(bW / 2 - 14, bY + bH - 4);
      ctx.stroke();

      // 3. 小人頭部 (可愛圓臉)
      ctx.fillStyle = '#fde047'; // 亮麗俏皮小黃帽
      ctx.beginPath();
      ctx.arc(0, -6, 26, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = '#fed7aa'; // 膚色臉蛋
      ctx.beginPath();
      ctx.arc(0, 4, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#c2410c';
      ctx.stroke();

      // 腮紅
      ctx.fillStyle = 'rgba(244, 63, 94, 0.4)';
      ctx.beginPath();
      ctx.arc(-13, 8, 4.5, 0, Math.PI * 2);
      ctx.arc(13, 8, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 表情繪製
      if (p.faceMood === 'happy') {
        // 開心瞇瞇眼 ^ ^
        ctx.strokeStyle = '#431407';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(-7, 2, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, 2, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
        // 開懷大笑
        ctx.fillStyle = '#e11d48';
        ctx.beginPath();
        ctx.arc(0, 10, 6, 0, Math.PI);
        ctx.fill();
      } else if (p.faceMood === 'hurt') {
        // 暈眩圈圈眼 @ @
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.5;
        // 左眼 X
        ctx.beginPath();
        ctx.moveTo(-10, -1); ctx.lineTo(-4, 5);
        ctx.moveTo(-4, -1); ctx.lineTo(-10, 5);
        ctx.stroke();
        // 右眼 X
        ctx.beginPath();
        ctx.moveTo(4, -1); ctx.lineTo(10, 5);
        ctx.moveTo(10, -1); ctx.lineTo(4, 5);
        ctx.stroke();
        // 苦惱波浪嘴
        ctx.beginPath();
        ctx.moveTo(-6, 14);
        ctx.quadraticCurveTo(0, 10, 6, 14);
        ctx.stroke();
      } else {
        // 正常專注大眼 • •
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(-7, 2, 3.5, 0, Math.PI * 2);
        ctx.arc(7, 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // 眼神高光
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-8, 1, 1.2, 0, Math.PI * 2);
        ctx.arc(6, 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // 認真微張小嘴
        ctx.fillStyle = '#be123c';
        ctx.beginPath();
        ctx.arc(0, 11, 3.5, 0, Math.PI);
        ctx.fill();
      }

      // 4. 小人身體與衣服 (活力橘色連身吊帶褲)
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(-16, 24, 32, 36, 10);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7c2d12';
      ctx.stroke();

      // 吊帶金黃扣子
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(-8, 30, 2.5, 0, Math.PI * 2);
      ctx.arc(8, 30, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. 小腳小鞋
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
  // 4. 模組導出與全域初始化
  // =========================================================================
  window.coolGameRescue = new WordRescueGame();
  window.coolGameSounds = sounds;
  window.speakCurrentWord = () => {
    if (window.coolGameRescue && window.coolGameRescue.currentWord) {
      speakWord(window.coolGameRescue.currentWord);
    }
  };
})();
