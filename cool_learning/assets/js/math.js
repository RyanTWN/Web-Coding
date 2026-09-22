// ==========================================================================
// 酷學習 (Cool Learning) - 數學天地 核心邏輯模組 (math.js)
// 包含：三大版本課綱、三等級分層題庫（簡單基礎、挑戰進階、情境素養）、
// 嚴格去重演算法、數值等價判定、兩次機會狀態機
// ==========================================================================

const MATH_CURRICULUM = {
  "康軒": [
    "[六上] 1. 最大公因數與最小公倍數", "[六上] 2. 分數除法", "[六上] 3. 數量關係",
    "[六上] 4. 小數除法", "[六上] 5. 比與比值", "[六上] 6. 圓周長與扇形周長",
    "[六上] 7. 圓面積與扇形面積", "[六上] 8. 認識速率", "[六上] 9. 放大圖、縮圖與比例尺",
    "[六下] 1. 小數與分數的計算", "[六下] 2. 速率的應用", "[六下] 3. 柱體體積與表面積",
    "[六下] 4. 基準量與比較量", "[六下] 5. 怎樣解題", "[六下] 6. 圓形圖"
  ],
  "翰林": [
    "[六上] 1. 最大公因數與最小公倍數", "[六上] 2. 分數除法", "[六上] 3. 小數除法",
    "[六上] 4. 比與比值", "[六上] 5. 兩量關係", "[六上] 6. 圓周長與扇形周長",
    "[六上] 7. 放大、縮小與比例尺", "[六上] 8. 怎樣解題",
    "[六下] 1. 分數與小數的四則運算", "[六下] 2. 圓面積與扇形面積", "[六下] 3. 速率",
    "[六下] 4. 統計圖表", "[六下] 5. 怎樣解題", "[六下] 6. 角柱與圓柱"
  ],
  "南一": [
    "[六上] 1. 質因數分解和短除法", "[六上] 2. 分數的除法", "[六上] 3. 小數的除法",
    "[六上] 4. 圓周長和圓面積", "[六上] 5. 比和比值", "[六上] 6. 扇形的弧長和面積",
    "[六上] 7. 速率", "[六上] 8. 數量關係",
    "[六下] 1. 四則混合運算", "[六下] 2. 柱體的體積和表面積", "[六下] 3. 基準量和比較量",
    "[六下] 4. 放大圖、縮圖和比例尺", "[六下] 5. 怎樣解題", "[六下] 6. 圓形圖"
  ]
};

// 數學輔助運算工具
function gcd(x, y) {
  x = Math.abs(Math.round(x));
  y = Math.abs(Math.round(y));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(x, y) {
  return Math.abs(x * y) / gcd(x, y);
}

function simplifyFraction(top, bottom) {
  if (bottom === 0) return { top: 0, bottom: 1, str: "0" };
  const d = gcd(top, bottom);
  top = Math.round(top / d);
  bottom = Math.round(bottom / d);
  if (bottom < 0) { top = -top; bottom = -bottom; }
  return {
    top,
    bottom,
    str: bottom === 1 ? String(top) : `${top}/${bottom}`
  };
}

// 數值等價容錯判斷（支援 1/2, 2/4, 0.5 等價判定）
function parseMathValue(str) {
  if (typeof str !== 'string') return null;
  const s = str.trim().replace(/[\s\uff0f]/g, '/').replace(/[\uff0e]/g, '.');
  if (!s) return null;

  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 2) {
      const top = Number(parts[0]);
      const bottom = Number(parts[1]);
      if (!isNaN(top) && !isNaN(bottom) && bottom !== 0) {
        return { val: top / bottom, isFraction: true, top, bottom };
      }
    }
    return null;
  }

  const num = Number(s);
  if (!isNaN(num)) {
    return { val: num, isFraction: false };
  }
  return null;
}

function isAnswerCorrect(userAns, targetAns) {
  if (userAns == null || targetAns == null) return false;
  const uStr = String(userAns).trim().toLowerCase();
  const tStr = String(targetAns).trim().toLowerCase();

  if (uStr === tStr) return true;

  const uVal = parseMathValue(uStr);
  const tVal = parseMathValue(tStr);

  if (uVal && tVal) {
    if (Math.abs(uVal.val - tVal.val) < 0.001) return true;
  }

  return false;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeId(prefix = 'm') {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

// ==========================================================================
// 分層題型輔助包裝函式 (保留陣列原生操作同時掛載 easy, challenge, competency 分級屬性)
// ==========================================================================
function createTieredTopic({ easy = [], challenge = [], competency = [] }) {
  const wrappedEasy = easy.map(fn => () => {
    const q = fn();
    q.level = 'easy';
    q.kind = '簡單基礎';
    return q;
  });
  const wrappedChallenge = challenge.map(fn => () => {
    const q = fn();
    q.level = 'challenge';
    q.kind = '挑戰進階';
    return q;
  });
  const wrappedCompetency = competency.map(fn => () => {
    const q = fn();
    q.level = 'competency';
    q.kind = '情境素養';
    return q;
  });
  const all = [...wrappedEasy, ...wrappedChallenge, ...wrappedCompetency];
  all.easy = wrappedEasy;
  all.challenge = wrappedChallenge;
  all.competency = wrappedCompetency;
  all.all = all;
  return all;
}

// ==========================================================================
// 各單元多樣化題目產生器註冊表 (涵蓋 11 大核心單元，每單元具備完整三大等級產生器)
// ==========================================================================
const TOPIC_GENERATORS = {
  // 1. 因數、倍數、質因數與短除法
  factors: createTieredTopic({
    easy: [
      // 1-1 最大公因數短除法
      () => {
        const base = randomInt(4, 9);
        const m1 = randomInt(2, 5);
        let m2 = randomInt(2, 5);
        while (gcd(m1, m2) !== 1) m2 = randomInt(2, 6);
        const n1 = base * m1, n2 = base * m2;
        return {
          id: makeId('gcd'),
          type: 'input',
          q: `求 ${n1} 和 ${n2} 的「最大公因數」是多少？`,
          a: String(base),
          hint: `💡 提示：可以用短除法，找出能同時整除 ${n1} 和 ${n2} 的所有質因數乘積。`,
          explanation: `📝 詳解：\n${n1} 與 ${n2} 同除以共同質因數後，商互質為 ${m1} 與 ${m2}，因此最大公因數為 ${base}。`
        };
      },
      // 1-2 最小公倍數短除法
      () => {
        const g = randomInt(2, 4);
        const m1 = randomInt(2, 4);
        let m2 = randomInt(3, 5);
        while (gcd(m1, m2) !== 1) m2 = randomInt(2, 6);
        const n1 = g * m1, n2 = g * m2;
        const ans = g * m1 * m2;
        return {
          id: makeId('lcm'),
          type: 'input',
          q: `求 ${n1} 和 ${n2} 的「最小公倍數」是多少？`,
          a: String(ans),
          hint: `💡 提示：短除法除到兩數互質後，把左邊所有的公因數與底下的商全部相乘。`,
          explanation: `📝 詳解：\n兩數最大公因數是 ${g}，最小公倍數 = (${n1} × ${n2}) ÷ ${g} = ${ans}。`
        };
      },
      // 1-3 互質觀念選擇題
      () => {
        const coprimeCandidates = [
          { a: 8, b: 9 }, { a: 15, b: 28 }, { a: 14, b: 25 }, { a: 21, b: 22 },
          { a: 9, b: 16 }, { a: 20, b: 21 }, { a: 25, b: 36 }, { a: 27, b: 35 },
          { a: 16, b: 33 }, { a: 18, b: 35 }, { a: 11, b: 24 }, { a: 13, b: 30 }
        ];
        const nonCoprimeCandidates = [
          { a: 12, b: 18 }, { a: 14, b: 21 }, { a: 15, b: 25 }, { a: 20, b: 30 },
          { a: 16, b: 24 }, { a: 18, b: 27 }, { a: 22, b: 33 }, { a: 26, b: 39 }
        ];
        const correctPair = randomChoice(coprimeCandidates);
        const wrongPool = [...nonCoprimeCandidates].sort(() => Math.random() - 0.5);
        const ans = `${correctPair.a} 和 ${correctPair.b}`;
        const options = [ans, `${wrongPool[0].a} 和 ${wrongPool[0].b}`, `${wrongPool[1].a} 和 ${wrongPool[1].b}`, `${wrongPool[2].a} 和 ${wrongPool[2].b}`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('coprime_c'),
          type: 'choice',
          q: `下列哪一組數的公因數「只有 1」（互質）？`,
          options,
          a: ans,
          hint: `💡 提示：互質的意思是兩數的最大公因數為 1，沒有其他大於 1 的公因數。`,
          explanation: `📝 詳解：\n${correctPair.a} 與 ${correctPair.b} 除了 1 以外沒有其他共同因數，gcd(${correctPair.a}, ${correctPair.b}) = 1，故兩數互質。`
        };
      },
      // 1-4 質因數分解
      () => {
        const primes1 = [2, 3, 5, 7, 11];
        const primes2 = [7, 11, 13, 17, 19];
        const p1 = randomChoice(primes1);
        let p2 = randomChoice(primes2);
        while (p1 === p2) p2 = randomChoice(primes2);
        const val = p1 * p2;
        const ans = `${Math.min(p1, p2)} × ${Math.max(p1, p2)}`;
        const wrongDistractors = [
          `${p1} + ${p2}`,
          `1 × ${val}`,
          `${p1 * 2} × ${p2}`
        ];
        const options = [ans, ...wrongDistractors].sort(() => Math.random() - 0.5);
        return {
          id: makeId('prime_fac'),
          type: 'choice',
          q: `將數字 ${val} 進行「質因數分解」，正確的式子是？`,
          options,
          a: ans,
          hint: `💡 提示：質因數分解必須都是「質數」相乘，且乘積必須等於原數。`,
          explanation: `📝 詳解：\n${p1} 與 ${p2} 均為質數，且 ${p1} × ${p2} = ${val}，故質因數分解為 ${ans}。`
        };
      },
      // 1-5 質數合數觀念
      () => {
        const variations = [
          {
            q: '關於「質數」的敘述，下列何者正確？',
            a: '2 是唯一的偶數質數',
            wrongs: ['所有奇數都是質數', '1 是質數也是合數', '9 是質數'],
            exp: '2 的因數只有 1 和 2，是質數且是唯一偶數質數。奇數 9 有因數 3 是合數，1 既不是質數也不是合數。'
          },
          {
            q: '下列哪一個數字是「質數」？',
            a: randomChoice(['29', '31', '37', '41', '43', '47']),
            wrongs: ['27', '33', '39', '49'],
            exp: '質數是指大於 1 的整數中，除了 1 和該整數本身以外無法被其他正整數整除的數。'
          }
        ];
        const item = randomChoice(variations);
        const options = [item.a, ...item.wrongs.slice(0, 3)].sort(() => Math.random() - 0.5);
        return {
          id: makeId('prime_concept'),
          type: 'choice',
          q: item.q,
          options,
          a: item.a,
          hint: `💡 提示：質數大於 1 且只有 1 和自己兩個因數；合數則有 3 個以上的因數。`,
          explanation: `📝 詳解：\n${item.exp}`
        };
      }
    ],
    challenge: [
      // 1-6 平分文具零食（求最大公因數）
      () => {
        const factor = randomInt(4, 8);
        const itemA = factor * randomInt(3, 6);
        const itemB = factor * randomInt(2, 5);
        const ans = gcd(itemA, itemB);
        return {
          id: makeId('gcd_candy'),
          type: 'input',
          q: `老師買了 ${itemA} 枝鉛筆和 ${itemB} 塊橡皮擦平分給學生，每人分到的鉛筆一樣多，橡皮擦也一樣多且剛好分完。請問最多可以平分給幾位學生？`,
          a: String(ans),
          hint: `💡 提示：每人拿到的數量一樣多且人數要「最多」，代表求 ${itemA} 與 ${itemB} 的最大公因數。`,
          explanation: `📝 詳解：\n最多可平分的學生人數 = gcd(${itemA}, ${itemB}) = ${ans} 人。`
        };
      },
      // 1-7 長方形鋪正方形磁磚
      () => {
        const side = randomInt(3, 7);
        const len = side * randomInt(4, 7);
        const width = side * randomInt(2, 5);
        const ans = gcd(len, width);
        return {
          id: makeId('tile'),
          type: 'input',
          q: `有一面長 ${len} 公尺、寬 ${width} 公尺的長方形牆壁，想全部鋪滿大小相同的「正方形」磁磚且磁磚不切割，請問正方形磁磚的最大邊長是幾公尺？`,
          a: String(ans),
          hint: `💡 提示：磁磚不切割且要最大邊長，需同時整除長度與寬度，即求長與寬的最大公因數。`,
          explanation: `📝 詳解：\n正方形磁磚的最大邊長 = gcd(${len}, ${width}) = ${ans} 公尺。`
        };
      },
      // 1-8 剪正方形紙片求張數
      () => {
        const g = randomInt(3, 8);
        const m1 = randomInt(3, 6);
        const m2 = randomInt(2, 4);
        const len = g * m1, width = g * m2;
        const count = m1 * m2;
        return {
          id: makeId('paper_cut'),
          type: 'input',
          q: `一張長 ${len} 公分、寬 ${width} 公分的長方形紙板，剪成最大且大小相同的正方形紙片，完全不浪費紙張，總共可以剪成幾張正方形紙片？`,
          a: String(count),
          hint: `💡 提示：先求正方形邊長（最大公因數），再算長邊可剪幾段、寬邊可剪幾段相乘。`,
          explanation: `📝 詳解：\n1. 最大正方形邊長 = gcd(${len}, ${width}) = ${g} 公分。\n2. 長邊 ${len} ÷ ${g} = ${m1} 段，寬邊 ${width} ÷ ${g} = ${m2} 段。\n3. 總張數 = ${m1} × ${m2} = ${count} 張。`
        };
      },
      // 1-9 積木排正方形
      () => {
        const a = randomInt(4, 6);
        const b = randomInt(7, 9);
        const ans = lcm(a, b);
        return {
          id: makeId('block_lcm'),
          type: 'input',
          q: `有一種長方體積木，長 ${a} 公分、寬 ${b} 公分。如果用這種積木排成一個「最小的正方形」，這個正方形的邊長是幾公分？`,
          a: String(ans),
          hint: `💡 提示：正方形邊長必須同時是長與寬的倍數，最小的正方形即為求「最小公倍數」。`,
          explanation: `📝 詳解：\n正方形邊長 = lcm(${a}, ${b}) = ${ans} 公分。`
        };
      },
      // 1-10 帶餘數求除數
      () => {
        const div = randomInt(6, 12);
        const rem = randomInt(2, 4);
        const n1 = div * randomInt(4, 7) + rem;
        const n2 = div * randomInt(8, 11) + rem;
        return {
          id: makeId('rem_gcd'),
          type: 'input',
          q: `某個正整數除 ${n1} 餘 ${rem}，除 ${n2} 也餘 ${rem}。請問這個正整數「最大」是多少？`,
          a: String(div),
          hint: `💡 提示：兩數都餘 ${rem}，表示先扣掉 ${rem} 之後，就能被該數整除。求兩數相減餘數後的最大公因數。`,
          explanation: `📝 詳解：\n1. ${n1} - ${rem} = ${n1 - rem}，${n2} - ${rem} = ${n2 - rem}。\n2. 該數必為 ${n1 - rem} 與 ${n2 - rem} 的公因數，最大公因數為 gcd(${n1 - rem}, ${n2 - rem}) = ${div}。`
        };
      }
    ],
    competency: [
      // 1-11 【大眾運輸調度】
      () => {
        const t1 = 12, t2 = 15;
        const cycle = lcm(t1, t2); // 60分
        return {
          id: makeId('bus_schedule'),
          scenarioTag: '【大眾交通調度】',
          type: 'input',
          q: `【大眾交通調度】綠線公車每 ${t1} 分鐘發一班車，藍線公車每 ${t2} 分鐘發一班車。若上午 6:30 兩線公車在轉運站同時發出首班車，請問從上午 6:30 到 10:30 之間（含首末兩班），兩線公車在轉運站「同時發車」共有幾次？`,
          a: "5",
          hint: `💡 提示：先求兩公車發車間隔的最小公倍數，找出共同發車週期（分鐘），再看時段內共經過幾小時。`,
          explanation: `📝 詳解：\n1. 共同週期 = lcm(${t1}, ${t2}) = ${cycle} 分鐘 = 1 小時。\n2. 6:30 到 10:30 共經過 4 小時。\n3. 同時發車時間為 6:30、7:30、8:30、9:30、10:30，共 5 次。`
        };
      },
      // 1-12 【物資分裝】
      () => {
        const factor = 24;
        const rice = factor * 3; // 72
        const canned = factor * 4; // 96
        const ans = factor;
        return {
          id: makeId('food_bank'),
          scenarioTag: '【愛心物資分裝】',
          type: 'input',
          q: `【愛心物資分裝】社區關懷站整理愛心物資，共有白米 ${rice} 包與營養罐頭 ${canned} 罐。志工要平分打包成完全相同的關懷物資箱且剛好分完，請問「最多」可以打包成幾箱物資箱？`,
          a: String(ans),
          hint: `💡 提示：要剛好分完且每箱物資數量一樣多，箱數必須是白米與罐頭數量的「公因數」；箱數要最多即求「最大公因數」。`,
          explanation: `📝 詳解：\n最多可打包箱數 = gcd(${rice}, ${canned}) = ${ans} 箱（每箱有白米 3 包、罐頭 4 罐）。`
        };
      },
      // 1-13 【地坪翻修與預算】
      () => {
        const len = 360, width = 240;
        const side = gcd(len, width); // 120
        const count = (len / side) * (width / side); // 3 * 2 = 6
        const pricePerTile = 50;
        const totalCost = count * pricePerTile;
        return {
          id: makeId('tile_budget'),
          scenarioTag: '【老屋地坪翻修】',
          type: 'input',
          q: `【老屋地坪翻修】長 ${len} 公分、寬 ${width} 公分的玄關地面，想鋪滿大小相同且不裁切的「最大正方形地磚」。若每片地磚售價 ${pricePerTile} 元，買齊所需地磚共需多少元？`,
          a: String(totalCost),
          hint: `💡 提示：先用長寬的最大公因數求出每片正方形地磚邊長，再計算長與寬各需要幾片相乘得出總片數，最後乘上單價。`,
          explanation: `📝 詳解：\n1. 地磚最大邊長 = gcd(${len}, ${width}) = ${side} 公分。\n2. 長需 ${len} ÷ ${side} = 3 片，寬需 ${width} ÷ ${side} = 2 片，共需 3 × 2 = ${count} 片。\n3. 總費用 = ${count} × ${pricePerTile} = ${totalCost} 元。`
        };
      }
    ]
  }),

  // 2. 分數除法與四則混合運算
  fractions: createTieredTopic({
    easy: [
      // 2-1 真分數除以真分數
      () => {
        const d1 = randomInt(4, 7), n1 = randomInt(1, 3);
        const d2 = randomInt(3, 6), n2 = randomInt(1, 2);
        const res = simplifyFraction(n1 * d2, d1 * n2);
        return {
          id: makeId('frac_div'),
          type: 'input',
          q: `計算 (${n1}/${d1}) ÷ (${n2}/${d2}) = ？ (請化為最簡分數或整數，如 1/2)`,
          a: res.str,
          hint: `💡 提示：除以一個分數，等於乘以該分數的「倒數」；記得約分化為最簡分數。`,
          explanation: `📝 詳解：\n(${n1}/${d1}) ÷ (${n2}/${d2}) = (${n1}/${d1}) × (${d2}/${n2}) = ${n1 * d2}/${d1 * n2}，約分後為 ${res.str}。`
        };
      },
      // 2-2 整數除以分數
      () => {
        const intNum = randomInt(3, 6);
        const den = randomInt(3, 5);
        const num = 1;
        const res = simplifyFraction(intNum * den, num);
        return {
          id: makeId('int_div_frac'),
          type: 'input',
          q: `一根長 ${intNum} 公尺的木條，每 (${num}/${den}) 公尺鋸成一段，剛好可以鋸成幾段？`,
          a: res.str,
          hint: `💡 提示：總長度 ÷ 每段長度 = 段數。除以 1/${den} 等於乘以 ${den}。`,
          explanation: `📝 詳解：\n${intNum} ÷ (${num}/${den}) = ${intNum} × ${den} = ${res.str} 段。`
        };
      },
      // 2-3 分數除以整數
      () => {
        const den = randomInt(4, 6);
        const mult = randomInt(2, 4);
        const num = mult * randomInt(1, 2);
        const res = simplifyFraction(num, den * mult);
        return {
          id: makeId('frac_div_int'),
          type: 'input',
          q: `把 (${num}/${den}) 瓶柳橙汁平分裝在 ${mult} 個杯子裡，每杯有幾瓶柳橙汁？ (請化為最簡分數)`,
          a: res.str,
          hint: `💡 提示：除以整數 ${mult} 等於乘以倒數 1/${mult}。`,
          explanation: `📝 詳解：\n(${num}/${den}) ÷ ${mult} = (${num}/${den}) × (1/${mult}) = ${num}/${den * mult} = ${res.str} 瓶。`
        };
      },
      // 2-4 倒數觀念選擇題
      () => {
        const den = randomInt(3, 7);
        const num = randomInt(1, den - 1);
        const ans = `${den}/${num}`;
        const options = [ans, `${num}/${den}`, `1/${num}`, `${den + 1}/${num}`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('reciprocal'),
          type: 'choice',
          q: `分數 (${num}/${den}) 的「倒數」是下列何者？`,
          options,
          a: ans,
          hint: `💡 提示：兩數相乘等於 1，這兩數互為倒數。分子與分母上下顛倒即為倒數。`,
          explanation: `📝 詳解：\n(${num}/${den}) 的倒數就是將分子分母對調，即為 ${ans}。`
        };
      },
      // 2-5 帶分數化假分數
      () => {
        const intPart = 2, den = 3, num = 1;
        const ans = `${intPart * den + num}/${den}`;
        const options = [ans, `${intPart * den}/${den}`, `${intPart + num}/${den}`, `${intPart * den + num + 1}/${den}`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('mixed_to_imp'),
          type: 'choice',
          q: `將帶分數 2又1/3 化為假分數是下列何者？`,
          options,
          a: ans,
          hint: `💡 提示：假分數分子 = 整數部分 × 分母 + 原分子。`,
          explanation: `📝 詳解：\n分子 = 2 × 3 + 1 = 7，分母不變，故化為假分數為 7/3。`
        };
      }
    ],
    challenge: [
      // 2-6 長方形花圃面積求長
      () => {
        const width = 2;
        const den = randomInt(3, 5);
        const num = randomInt(4, 8);
        const res = simplifyFraction(num, den * width);
        return {
          id: makeId('area_frac'),
          type: 'input',
          q: `長方形花圃面積是 (${num}/${den}) 平方公尺，已知寬度是 ${width} 公尺，長度是多少公尺？ (請化為最簡分數)`,
          a: res.str,
          hint: `💡 提示：長方形面積 = 長 × 寬，所以長 = 面積 ÷ 寬。`,
          explanation: `📝 詳解：\n長 = (${num}/${den}) ÷ ${width} = (${num}/${den}) × (1/${width}) = ${res.str} 公尺。`
        };
      },
      // 2-7 工程做工天數
      () => {
        const days = randomInt(4, 8);
        return {
          id: makeId('work_frac'),
          type: 'input',
          q: `道路施工隊每天可以修築整條公路的 (1/${days})，請問修完全部公路需要幾天？`,
          a: String(days),
          hint: `💡 提示：全工程看作 1。總天數 = 1 ÷ 每天完成比例。`,
          explanation: `📝 詳解：\n總天數 = 1 ÷ (1/${days}) = 1 × ${days} = ${days} 天。`
        };
      },
      // 2-8 帶括號混合運算
      () => {
        const a = 12, b = 4, c = 2;
        const ans = (a - b) * c;
        return {
          id: makeId('paren_mix'),
          type: 'input',
          q: `計算 (${a} - ${b}) × ${c} = ？`,
          a: String(ans),
          hint: `💡 提示：算式中有括號時，必須先算括號裡面的算式。`,
          explanation: `📝 詳解：\n先算括號內：${a} - ${b} = ${a - b}，再乘以 ${c}：${a - b} × ${c} = ${ans}。`
        };
      },
      // 2-9 乘法結合律概念
      () => {
        const options = ["(a × b) × c = a × (b × c)", "a ÷ b = b ÷ a", "a - b = b - a", "a + (b × c) = (a + b) × c"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('assoc_c'),
          type: 'choice',
          q: `下列哪一個運算性質是正確的「乘法結合律」？`,
          options,
          a: "(a × b) × c = a × (b × c)",
          hint: `💡 提示：三個數相乘，先乘前兩個或先乘後兩個，結果相同。`,
          explanation: `📝 詳解：\n乘法具有結合律：三個數相乘時改變括號順序不影響結果，即 (a × b) × c = a × (b × c)。`
        };
      },
      // 2-10 連續分數除法
      () => {
        // (1/2) ÷ (1/4) ÷ (1/3) = 2 ÷ (1/3) = 6
        return {
          id: makeId('frac_multi_div'),
          type: 'input',
          q: `計算 (1/2) ÷ (1/4) ÷ (1/3) 的結果是多少？`,
          a: "6",
          hint: `💡 提示：連續除法可依序從左往右計算，或者轉化為連續乘上各除數的倒數。`,
          explanation: `📝 詳解：\n(1/2) × 4 × 3 = 2 × 3 = 6。`
        };
      }
    ],
    competency: [
      // 2-11 【手搖飲黃金比例調製】
      () => {
        return {
          id: makeId('drink_recipe'),
          scenarioTag: '【手搖飲黃金比例】',
          type: 'input',
          q: `【手搖飲黃金比例】手搖飲店調配一大桶仙草甘茶共有 (14/5) 公升。店員使用容量為 (2/5) 公升的外帶環保杯分裝，這桶甘茶剛好可以分裝成幾杯？`,
          a: "7",
          hint: `💡 提示：總公升數 ÷ 每杯容量 = 分裝杯數。除以分數等於乘以倒數。`,
          explanation: `📝 詳解：\n(14/5) ÷ (2/5) = (14/5) × (5/2) = 14 ÷ 2 = 7 杯。`
        };
      },
      // 2-12 【彩繪牆面進度】
      () => {
        return {
          id: makeId('wall_painting'),
          scenarioTag: '【社區彩繪綠化】',
          type: 'choice',
          q: `【社區彩繪綠化】志工隊彩繪社區防汛牆，第一天彩繪了全長的 1/4，第二天彩繪了「剩下部分的 1/3」。請問兩天一共彩繪了整面牆的幾分之幾？`,
          options: ["1/2", "7/12", "5/12", "1/3"].sort(() => Math.random() - 0.5),
          a: "1/2",
          hint: `💡 提示：第一天後剩下 (1 - 1/4) = 3/4。第二天彩繪 (3/4) × (1/3) = 1/4。最後將兩天比例相加。`,
          explanation: `📝 詳解：\n1. 第一天完成 1/4，剩餘 3/4。\n2. 第二天完成 3/4 × 1/3 = 1/4。\n3. 兩天共完成 1/4 + 1/4 = 2/4 = 1/2。`
        };
      },
      // 2-13 【烘焙點心食譜等比換算】
      () => {
        return {
          id: makeId('baking_scale'),
          scenarioTag: '【烘焙食譜等比換算】',
          type: 'input',
          q: `【烘焙食譜等比換算】烘焙食譜上製作 4 人份餅乾需要 (2/3) 公斤低筋麵粉。如果今天想要製作 12 人份的餅乾，總共需要多少公斤的麵粉？`,
          a: "2",
          hint: `💡 提示：12 人份是 4 人份的 (12 ÷ 4 = 3) 倍。所需麵粉量直接乘以 3。`,
          explanation: `📝 詳解：\n12 人份倍數 = 12 ÷ 4 = 3 倍。\n所需麵粉 = (2/3) × 3 = 2 公斤。`
        };
      }
    ]
  }),

  // 3. 小數除法
  decimals: createTieredTopic({
    easy: [
      // 3-1 小數除以整數
      () => {
        const divisor = randomInt(2, 5);
        const quotient = randomInt(11, 25);
        const dividend = Number((divisor * quotient / 10).toFixed(1));
        const ans = Number((dividend / divisor).toFixed(2));
        return {
          id: makeId('dec_int_div'),
          type: 'input',
          q: `計算 ${dividend} ÷ ${divisor} = ？`,
          a: String(ans),
          hint: `💡 提示：按照整數除法直式計算，商的小數點要和被除數的小數點對齊。`,
          explanation: `📝 詳解：\n直式計算 ${dividend} ÷ ${divisor} = ${ans}。`
        };
      },
      // 3-2 整數除以小數
      () => {
        const divisor = randomChoice([0.2, 0.4, 0.5, 0.8]);
        const quotient = randomInt(10, 30);
        const dividend = Math.round(divisor * quotient);
        return {
          id: makeId('int_div_dec'),
          type: 'input',
          q: `計算 ${dividend} ÷ ${divisor} = ？`,
          a: String(quotient),
          hint: `💡 提示：除數為一位小數，將除數與被除數同時放大 10 倍變整數相除。`,
          explanation: `📝 詳解：\n同時乘以 10 變為 ${dividend * 10} ÷ ${Math.round(divisor * 10)} = ${quotient}。`
        };
      },
      // 3-3 小數除以小數
      () => {
        const divisor = randomChoice([0.3, 0.6, 0.7, 1.2]);
        const quotient = randomInt(5, 18);
        const dividend = Number((divisor * quotient).toFixed(2));
        return {
          id: makeId('dec_div_dec'),
          type: 'input',
          q: `計算 ${dividend} ÷ ${divisor} = ？`,
          a: String(quotient),
          hint: `💡 提示：將除數與被除數的小數點同時向右移動一位或兩位，使其變為整數除法。`,
          explanation: `📝 詳解：\n小數點同時右移轉換後計算，${dividend} ÷ ${divisor} = ${quotient}。`
        };
      },
      // 3-4 餘數小數點對齊
      () => {
        const options = ["和被除數原本的小數點對齊", "和商的小數點對齊", "固定在最後一位", "不需要對齊"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('rem_point_c'),
          type: 'choice',
          q: `在小數直式除法算式中，算出來的「餘數」的小數點位置應該如何對齊？`,
          options,
          a: "和被除數原本的小數點對齊",
          hint: `💡 提示：餘數代表被除數剩下的部分，小數點必須與被除數原來的小數點對齊。`,
          explanation: `📝 詳解：\n餘數是原本被除數沒除盡的部分，因此餘數的小數點必須「和被除數原本的小數點對齊」。`
        };
      },
      // 3-5 商與被除數大小關係
      () => {
        const options = ["商大於被除數", "商小於被除數", "商等於被除數", "不一定"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('quot_compare_c'),
          type: 'choice',
          q: `當一個大於 0 的數除以「小於 1 的小數」（例如除以 0.5）時，商和被除數的大小關係為何？`,
          options,
          a: "商大於被除數",
          hint: `💡 提示：除以小於 1 的數，結果會被放大（例如 10 ÷ 0.5 = 20）。`,
          explanation: `📝 詳解：\n除數小於 1 時，相當於乘上一個大於 1 的數，因此商會「大於被除數」。`
        };
      }
    ],
    challenge: [
      // 3-6 每公斤單價應用題
      () => {
        const weight = 2.5;
        const unitPrice = randomInt(40, 80);
        const totalPrice = Number((weight * unitPrice).toFixed(1));
        return {
          id: makeId('unit_price'),
          type: 'input',
          q: `媽媽買了 ${weight} 公斤的蘋果，一共花了 ${totalPrice} 元。請問平均 1 公斤蘋果是多少元？`,
          a: String(unitPrice),
          hint: `💡 提示：總價錢 ÷ 總重量 = 每公斤單價。`,
          explanation: `📝 詳解：\n單價 = ${totalPrice} ÷ ${weight} = ${unitPrice} 元。`
        };
      },
      // 3-7 剪布料段數
      () => {
        const lenPerPiece = 1.2;
        const pieces = randomInt(6, 12);
        const totalLen = Number((lenPerPiece * pieces).toFixed(1));
        return {
          id: makeId('cloth_cut'),
          type: 'input',
          q: `有一捆長 ${totalLen} 公尺的緞帶，每 ${lenPerPiece} 公尺剪成一條彩帶，剛好可以剪成幾條？`,
          a: String(pieces),
          hint: `💡 提示：全長 ÷ 每段長度 = 段數。`,
          explanation: `📝 詳解：\n段數 = ${totalLen} ÷ ${lenPerPiece} = ${pieces} 條。`
        };
      },
      // 3-8 汽車每公升耗油量
      () => {
        const liters = 5;
        const km = 62.5;
        const ans = km / liters;
        return {
          id: makeId('fuel_div'),
          type: 'input',
          q: `汽車加了 ${liters} 公升汽油，行駛了 ${km} 公里。請問平均每公升汽油可以行駛幾公里？`,
          a: String(ans),
          hint: `💡 提示：總行駛公里數 ÷ 消耗汽油公升數 = 每公升公里數。`,
          explanation: `📝 詳解：\n${km} ÷ ${liters} = ${ans} 公里/公升。`
        };
      },
      // 3-9 四捨五入取商
      () => {
        return {
          id: makeId('round_div'),
          type: 'choice',
          q: `計算 10 ÷ 3，商以「四捨五入法」取到小數第一位約是多少？`,
          options: ["3.3", "3.4", "3.0", "3.33"].sort(() => Math.random() - 0.5),
          a: "3.3",
          hint: `💡 提示：先算到小數第二位 (3.33...)，第二位的數字是 3，小於 5 捨去。`,
          explanation: `📝 詳解：\n10 ÷ 3 = 3.333...，取到小數第一位看第二位 3，四捨五入後約為 3.3。`
        };
      },
      // 3-10 小數除法整數商與餘數
      () => {
        return {
          id: makeId('dec_rem_exact'),
          type: 'choice',
          q: `將 7.5 公尺長的鐵絲，每 2 公尺剪成一段，最多剪成幾段？還剩下幾公尺？`,
          options: ["最多剪成 3 段，剩下 1.5 公尺", "最多剪成 3 段，剩下 0.5 公尺", "最多剪成 4 段，剩下 0.5 公尺", "最多剪成 3 段，剩下 1 公尺"].sort(() => Math.random() - 0.5),
          a: "最多剪成 3 段，剩下 1.5 公尺",
          hint: `💡 提示：7.5 ÷ 2 = 3... 餘數。餘數 = 7.5 - (2 × 3)。`,
          explanation: `📝 詳解：\n2 × 3 = 6 公尺，7.5 - 6 = 1.5 公尺，因此最多剪成 3 段，剩下 1.5 公尺。`
        };
      }
    ],
    competency: [
      // 3-11 【超市精明比價】
      () => {
        const bigWeight = 2.5, bigPrice = 600; // 240/kg
        const smallWeight = 0.8, smallPrice = 240; // 300/kg
        const diff = (smallPrice / smallWeight) - (bigPrice / bigWeight); // 60
        return {
          id: makeId('smart_shopping'),
          scenarioTag: '【生活理財聰明比價】',
          type: 'input',
          q: `【生活理財聰明比價】超市販售特級橄欖油：大瓶裝 ${bigWeight} 公升售價 ${bigPrice} 元，小瓶裝 ${smallWeight} 公升售價 ${smallPrice} 元。請問購買大瓶裝平均每公升比小瓶裝便宜多少元？`,
          a: String(diff),
          hint: `💡 提示：分別計算大瓶與小瓶「每公升單價」（總價 ÷ 重量），再將兩者相減。`,
          explanation: `📝 詳解：\n1. 大瓶每公升 = ${bigPrice} ÷ ${bigWeight} = 240 元。\n2. 小瓶每公升 = ${smallPrice} ÷ ${smallWeight} = 300 元。\n3. 每公升相差 300 - 240 = ${diff} 元。`
        };
      },
      // 3-12 【家庭智慧節水】
      () => {
        const before = 12.5, after = 8.5;
        const diffPerMin = before - after; // 4.0 L
        const minPerDay = 10, days = 30;
        const totalSaved = diffPerMin * minPerDay * days; // 1200 L
        return {
          id: makeId('water_saving'),
          scenarioTag: '【智慧綠能節水生活】',
          type: 'input',
          q: `【智慧綠能節水生活】小明家換裝省水蓮蓬頭，沖澡每分鐘出水量由 ${before} 公升降低為 ${after} 公升。小明每天洗澡 ${minPerDay} 分鐘，一個月（以 ${days} 天計）總共可以節省多少公升的自來水？`,
          a: String(totalSaved),
          hint: `💡 提示：先算每分鐘省下幾公升，再乘上每天洗澡分鐘數與總天數。`,
          explanation: `📝 詳解：\n1. 每分鐘省水 = ${before} - ${after} = ${diffPerMin} 公升。\n2. 每天省水 = ${diffPerMin} × ${minPerDay} = 40 公升。\n3. 全月省水 = 40 × ${days} = ${totalSaved} 公升。`
        };
      },
      // 3-13 【出國旅遊換匯】
      () => {
        const rate = 32;
        const ntd = 9600;
        const usd = ntd / rate;
        return {
          id: makeId('currency_calc'),
          scenarioTag: '【旅遊國際金融換匯】',
          type: 'input',
          q: `【旅遊國際金融換匯】小明準備了新台幣 ${ntd} 元到臺灣銀行兌換美金。若當日現金賣出匯率為 1 美元兌換 ${rate} 元新台幣，小明一共可以兌換到多少美元？`,
          a: String(usd),
          hint: `💡 提示：新台幣總額 ÷ 美元匯率 = 可兌換美元金額。`,
          explanation: `📝 詳解：\n兌換美元 = ${ntd} ÷ ${rate} = ${usd} 美元。`
        };
      }
    ]
  }),

  // 4. 比與比值、數量關係
  ratios: createTieredTopic({
    easy: [
      // 4-1 最簡整數比與比值
      () => {
        const g = randomInt(3, 7);
        const a = randomInt(2, 5), b = randomInt(3, 6);
        return {
          id: makeId('ratio_simp'),
          type: 'input',
          q: `將 ${a * g} : ${b * g} 化為「最簡整數比之比值」是多少？ (請寫最簡分數或整數，如 2/3)`,
          a: simplifyFraction(a, b).str,
          hint: `💡 提示：比值 = 前項 ÷ 後項，前後項同除以公因數 ${g} 後化為最簡分數。`,
          explanation: `📝 詳解：\n比值 = ${a * g} / ${b * g} = ${simplifyFraction(a, b).str}。`
        };
      },
      // 4-2 求未知數 x
      () => {
        const mult = randomInt(3, 6);
        const a = 3, b = 7;
        const bMult = b * mult;
        const ans = a * mult;
        return {
          id: makeId('ratio_x'),
          type: 'input',
          q: `已知 ${a} : ${b} = x : ${bMult}，請問 x 是多少？`,
          a: String(ans),
          hint: `💡 提示：後項從 ${b} 放大成 ${bMult} 是放大了 ${mult} 倍，前項也要放大相同的倍數。`,
          explanation: `📝 詳解：\n後項 ${bMult} ÷ ${b} = ${mult} 倍，前項 x = ${a} × ${mult} = ${ans}。`
        };
      },
      // 4-3 比的前後項性質
      () => {
        const options = ["前項和後項同乘同除一個不為0的數", "前項加上一個數，後項減去同一個數", "前項和後項同加上一個數", "前項平方，後項不變"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('ratio_prop_c'),
          type: 'choice',
          q: `下列哪一種操作後，比的「比值會保持不變」？`,
          options,
          a: "前項和後項同乘同除一個不為0的數",
          hint: `💡 提示：比的基本性質：比的前項與後項同時乘或除以同一個不為 0 的數，比值不變。`,
          explanation: `📝 詳解：\n比的前後項同乘以或同除以同一個非 0 的數，比值保持不變。同加減會改變比值。`
        };
      },
      // 4-4 分數比化最簡整數比
      () => {
        const options = ["3 : 2", "2 : 3", "1 : 6", "6 : 1"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('frac_ratio_c'),
          type: 'choice',
          q: `將 (1/2) : (1/3) 化為「最簡整數比」是下列何者？`,
          options,
          a: "3 : 2",
          hint: `💡 提示：同乘分母的公倍數 6，消除分母。`,
          explanation: `📝 詳解：\n前後項同乘 6：(1/2 × 6) : (1/3 × 6) = 3 : 2。`
        };
      },
      // 4-5 小數比化最簡整數比
      () => {
        return {
          id: makeId('dec_ratio_inp'),
          type: 'choice',
          q: `將 0.8 : 1.2 化為最簡整數比是下列何者？`,
          options: ["2 : 3", "4 : 6", "8 : 12", "1 : 2"].sort(() => Math.random() - 0.5),
          a: "2 : 3",
          hint: `💡 提示：先同乘 10 變 8 : 12，再同除以最大公因數 4。`,
          explanation: `📝 詳解：\n0.8 : 1.2 = 8 : 12，同除以 4 後最簡整數比為 2 : 3。`
        };
      }
    ],
    challenge: [
      // 4-6 調配飲品比例
      () => {
        const juicePart = 1, waterPart = 4;
        const waterMl = 600;
        const ans = waterMl / waterPart;
        return {
          id: makeId('juice_ratio'),
          type: 'input',
          q: `調配檸檬水時，檸檬原汁與水的比是 ${juicePart} : ${waterPart}。如果使用了 ${waterMl} 毫升的水，需要加入幾毫升的檸檬原汁？`,
          a: String(ans),
          hint: `💡 提示：設原汁為 x，列式 x : ${waterMl} = ${juicePart} : ${waterPart}。`,
          explanation: `📝 詳解：\n水的份數是 ${waterPart}，${waterMl} ÷ ${waterPart} = ${ans} 毫升，即為 1 份原汁的量。`
        };
      },
      // 4-7 男女比例求人數
      () => {
        const boyRatio = 3, girlRatio = 2;
        const totalPart = boyRatio + girlRatio;
        const unitVal = randomInt(5, 8);
        const totalStudents = totalPart * unitVal;
        const boys = boyRatio * unitVal;
        return {
          id: makeId('class_ratio'),
          type: 'input',
          q: `六年某班男女生人數的比是 ${boyRatio} : ${girlRatio}，全班共有 ${totalStudents} 人，請問男生有幾人？`,
          a: String(boys),
          hint: `💡 提示：全班總共分成 ${totalPart} 等分，先算一等分是幾人，再乘上男生的等分。`,
          explanation: `📝 詳解：\n全班分成 ${boyRatio} + ${girlRatio} = ${totalPart} 份，每份 = ${totalStudents} ÷ ${totalPart} = ${unitVal} 人。男生人數 = ${unitVal} × ${boyRatio} = ${boys} 人。`
        };
      },
      // 4-8 長寬比求面積
      () => {
        const rA = 3, rB = 2;
        const unitVal = 4;
        const len = rA * unitVal, width = rB * unitVal;
        const perimeter = (len + width) * 2;
        const area = len * width;
        return {
          id: makeId('ratio_rect_area'),
          type: 'input',
          q: `一個長方形的長與寬比是 ${rA} : ${rB}，周長是 ${perimeter} 公分，請問此長方形的面積是多少平方公分？`,
          a: String(area),
          hint: `💡 提示：長加寬 = 周長的一半 (${perimeter / 2} 公分)，先求出長與寬各自是幾公分再相乘。`,
          explanation: `📝 詳解：\n1. 長 + 寬 = ${perimeter} ÷ 2 = ${perimeter / 2} 公分。\n2. 每份 = ${perimeter / 2} ÷ (${rA} + ${rB}) = ${unitVal} 公分。\n3. 長 = ${len} 公分，寬 = ${width} 公分，面積 = ${len} × ${width} = ${area} 平方公分。`
        };
      },
      // 4-9 正比判斷
      () => {
        const options = ["正方形的邊長和周長", "個人的年齡和身高", "正方形的邊長和面積", "長方形面積一定時的長和寬"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('prop_concept_c'),
          type: 'choice',
          q: `下列哪一組量「成正比」關係？`,
          options,
          a: "正方形的邊長和周長",
          hint: `💡 提示：成正比的條件是：當一個量變為 2 倍、3 倍時，另一個量也跟著變為 2 倍、3 倍（比值固定）。`,
          explanation: `📝 詳解：\n正方形周長 = 邊長 × 4，周長 ÷ 邊長 = 4 (固定比值)，故邊長與周長成正比。邊長與面積成平方比非正比。`
        };
      },
      // 4-10 正比表格求未知數
      () => {
        const speed = 60;
        const h1 = 2, d1 = speed * h1;
        const h2 = 5, d2 = speed * h2;
        return {
          id: makeId('prop_table'),
          type: 'input',
          q: `時間與行駛距離成正比：行駛 ${h1} 小時是 ${d1} 公里。若以相同速率行駛 ${h2} 小時，行駛距離是多少公里？`,
          a: String(d2),
          hint: `💡 提示：成正比代表時速固定，先求時速 (${d1} ÷ ${h1})，再乘上 ${h2} 小時。`,
          explanation: `📝 詳解：\n時速 = ${d1} ÷ ${h1} = ${speed} 公里/小時。行駛 ${h2} 小時距離 = ${speed} × ${h2} = ${d2} 公里。`
        };
      }
    ],
    competency: [
      // 4-11 【特調拿鐵容量配置】
      () => {
        return {
          id: makeId('coffee_recipe'),
          scenarioTag: '【職人特調飲品配方】',
          type: 'input',
          q: `【職人特調飲品配方】咖啡師調配特調冰拿鐵，濃縮咖啡、鮮奶與糖漿的容量比是 3 : 6 : 1。若要調配一杯總容量 500 毫升的特調拿鐵，需要加入幾毫升的鮮奶？`,
          a: "300",
          hint: `💡 提示：總份數 = 3 + 6 + 1 = 10 份。先算 1 份是幾毫升，再乘上鮮奶的份數 6。`,
          explanation: `📝 詳解：\n1. 總份數 = 3 + 6 + 1 = 10 份。\n2. 每份容量 = 500 ÷ 10 = 50 毫升。\n3. 鮮奶容量 = 50 × 6 = 300 毫升。`
        };
      },
      // 4-12 【自治市小市長選舉票差】
      () => {
        const totalVotes = 400;
        const r1 = 5, r2 = 3;
        const diffVotes = (totalVotes / (r1 + r2)) * (r1 - r2); // 50 * 2 = 100
        return {
          id: makeId('student_election'),
          scenarioTag: '【自治會民主選舉開票】',
          type: 'input',
          q: `【自治會民主選舉開票】六年級自治市小市長選舉開票完畢，總有效票數為 ${totalVotes} 票。1 號與 2 號候選人的得票比是 ${r1} : ${r2}。請問 1 號候選人比 2 號候選人多了幾票？`,
          a: String(diffVotes),
          hint: `💡 提示：總份數為 ${r1} + ${r2} = 8 份。先求 1 份是幾票，再算兩者相差的份數 (${r1} - ${r2}) 乘上 1 份的票數。`,
          explanation: `📝 詳解：\n1. 每份票數 = ${totalVotes} ÷ (${r1} + ${r2}) = 50 票。\n2. 得票差距 = 50 × (${r1} - ${r2}) = 50 × 2 = ${diffVotes} 票。`
        };
      },
      // 4-13 【建築模型等比縮小】
      () => {
        const ratio = 20;
        const modelCm = 15;
        const realM = (modelCm * ratio) / 100; // 3 m
        return {
          id: makeId('scale_model_calc'),
          scenarioTag: '【古蹟建築模型復原】',
          type: 'input',
          q: `【古蹟建築模型復原】建築系學生按照 1 : ${ratio} 的比例縮小製作孔廟大成殿木模型。若模型的大門高度量得是 ${modelCm} 公分，請問古蹟大門的實際高度是多少「公尺」？`,
          a: String(realM),
          hint: `💡 提示：實際公分 = 模型公分 × ${ratio}。別忘了最後將公分換算為「公尺」（1 公尺 = 100 公分）。`,
          explanation: `📝 詳解：\n1. 實際高度 = ${modelCm} × ${ratio} = ${modelCm * ratio} 公分。\n2. 換算為公尺 = ${modelCm * ratio} ÷ 100 = ${realM} 公尺。`
        };
      }
    ]
  }),

  // 5. 圓周長、扇形、圓面積
  circles: createTieredTopic({
    easy: [
      // 5-1 給半徑求圓周長
      () => {
        const r = randomChoice([5, 10, 15, 20]);
        const ans = Number((2 * r * 3.14).toFixed(2));
        return {
          id: makeId('circle_c1'),
          type: 'input',
          q: `半徑為 ${r} 公分的圓，其「圓周長」約是多少公分？ (圓周率以 3.14 計算)`,
          a: String(ans),
          hint: `💡 提示：圓周長 = 直徑 × 3.14 = 半徑 × 2 × 3.14。`,
          explanation: `📝 詳解：\n圓周長 = 2 × ${r} × 3.14 = ${ans} 公分。`
        };
      },
      // 5-2 給直徑求圓面積
      () => {
        const d = randomChoice([10, 20, 30]);
        const r = d / 2;
        const ans = Number((r * r * 3.14).toFixed(2));
        return {
          id: makeId('circle_a1'),
          type: 'input',
          q: `直徑為 ${d} 公分的圓，其「圓面積」約是多少平方公分？ (圓周率以 3.14 計算)`,
          a: String(ans),
          hint: `💡 提示：先將直徑除以 2 求出半徑，再代入面積公式：半徑 × 半徑 × 3.14。`,
          explanation: `📝 詳解：\n半徑 = ${d} ÷ 2 = ${r} 公分。面積 = ${r} × ${r} × 3.14 = ${ans} 平方公分。`
        };
      },
      // 5-3 半徑放大面積倍數
      () => {
        const n = randomChoice([2, 3, 4]);
        const ans = `${n * n} 倍`;
        const options = [ans, `${n} 倍`, `${n * 2} 倍`, `${n * n * 2} 倍`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('circle_scale_c'),
          type: 'choice',
          q: `若一個圓的半徑變成原來的 ${n} 倍，它的「圓面積」會變成原來的幾倍？`,
          options,
          a: ans,
          hint: `💡 提示：面積與半徑的「平方」成正比。`,
          explanation: `📝 詳解：\n圓面積 = 半徑 × 半徑 × 3.14。半徑放大 ${n} 倍，面積放大 ${n} × ${n} = ${n * n} 倍。`
        };
      },
      // 5-4 圓周率定義
      () => {
        const options = ["圓周長 ÷ 直徑", "圓面積 ÷ 半徑", "直徑 ÷ 圓周長", "圓周長 ÷ 半徑"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('pi_def_c'),
          type: 'choice',
          q: `「圓周率 (π)」的數學意義是下列哪兩者的比值？`,
          options,
          a: "圓周長 ÷ 直徑",
          hint: `💡 提示：任何圓的圓周長除以直徑，都是固定的一個常數（約 3.14）。`,
          explanation: `📝 詳解：\n圓周率定義為任意圓的「圓周長 ÷ 直徑」，約等於 3.14159...。`
        };
      },
      // 5-5 扇形占整圓比例求圓心角
      () => {
        const item = randomChoice([
          { fracStr: "二分之一", deg: 180 },
          { fracStr: "四分之一", deg: 90 },
          { fracStr: "六分之一", deg: 60 }
        ]);
        const options = [`${item.deg} 度`, `${item.deg + 30} 度`, `${item.deg - 20 > 0 ? item.deg - 20 : item.deg + 45} 度`, `${item.deg * 2 > 360 ? 30 : item.deg + 45} 度`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('sector_deg_c'),
          type: 'choice',
          q: `一個扇形的面積是同半徑圓面積的「${item.fracStr}」，請問這個扇形的圓心角是多少度？`,
          options,
          a: `${item.deg} 度`,
          hint: `💡 提示：整圓圓心角為 360 度，乘以所占比例。`,
          explanation: `📝 詳解：\n圓心角 = 360° × (${item.fracStr}) = ${item.deg}°。`
        };
      }
    ],
    challenge: [
      // 5-6 半圓周長陷阱題
      () => {
        const r = randomChoice([5, 10, 15, 20]);
        const arc = Number((r * 3.14).toFixed(2));
        const d = r * 2;
        const ans = Number((arc + d).toFixed(2));
        return {
          id: makeId('semi_circle_p'),
          type: 'input',
          q: `半徑為 ${r} 公分的「半圓」，其「周長」約是多少公分？ (圓周率以 3.14 計，提示：別忘了底部直徑)`,
          a: String(ans),
          hint: `💡 提示：半圓周長包含「半圓弧長」加上「底部的直徑」！`,
          explanation: `📝 詳解：\n1. 半圓弧長 = 2 × ${r} × 3.14 ÷ 2 = ${arc} 公分。\n2. 加上直徑：${arc} + ${d} = ${ans} 公分。`
        };
      },
      // 5-7 扇形弧長
      () => {
        const r = 12, deg = 90;
        const frac = deg / 360;
        const arc = Number((2 * r * 3.14 * frac).toFixed(2)); // 18.84
        return {
          id: makeId('sector_arc'),
          type: 'input',
          q: `半徑為 ${r} 公分、圓心角為 ${deg} 度的扇形，其「弧長」約是多少公分？ (圓周率以 3.14 計)`,
          a: String(arc),
          hint: `💡 提示：90度占整圓的 90/360 = 1/4。扇形弧長 = 圓周長 × (1/4)。`,
          explanation: `📝 詳解：\n圓周長 = 2 × ${r} × 3.14 = 75.36 公分。弧長 = 75.36 × (90/360) = ${arc} 公分。`
        };
      },
      // 5-8 扇形面積
      () => {
        const r = 10, deg = 90;
        const frac = deg / 360;
        const area = Number((r * r * 3.14 * frac).toFixed(2)); // 78.5
        return {
          id: makeId('sector_area'),
          type: 'input',
          q: `半徑為 ${r} 公分、圓心角為 ${deg} 度的扇形，其「面積」約是多少平方公分？ (圓周率以 3.14 計)`,
          a: String(area),
          hint: `💡 提示：扇形面積 = 圓面積 × (圓心角 / 360)。`,
          explanation: `📝 詳解：\n整圓面積 = ${r} × ${r} × 3.14 = 314 平方公分。扇形面積 = 314 × (90/360) = ${area} 平方公分。`
        };
      },
      // 5-9 圓周長反求直徑
      () => {
        const d = randomChoice([5, 10, 20]);
        const c = Number((d * 3.14).toFixed(2));
        return {
          id: makeId('circle_rev_d'),
          type: 'input',
          q: `若一個圓的圓周長約是 ${c} 公分，此圓的「直徑」是多少公分？ (圓周率以 3.14 計)`,
          a: String(d),
          hint: `💡 提示：直徑 = 圓周長 ÷ 3.14。`,
          explanation: `📝 詳解：\n直徑 = ${c} ÷ 3.14 = ${d} 公分。`
        };
      },
      // 5-10 圓環面積
      () => {
        const rOuter = 10, rInner = 6;
        const ans = Number(((rOuter * rOuter - rInner * rInner) * 3.14).toFixed(2)); // 64 * 3.14 = 200.96
        return {
          id: makeId('ring_area'),
          type: 'input',
          q: `大圓半徑為 ${rOuter} 公分，小圓半徑為 ${rInner} 公分，兩圓同心，請問「圓環」的面積約是多少平方公分？ (圓周率以 3.14 計)`,
          a: String(ans),
          hint: `💡 提示：圓環面積 = 大圓面積 - 小圓面積 = (${rOuter}² - ${rInner}²) × 3.14。`,
          explanation: `📝 詳解：\n(${rOuter}² - ${rInner}²) × 3.14 = (100 - 36) × 3.14 = 64 × 3.14 = ${ans} 平方公分。`
        };
      }
    ],
    competency: [
      // 5-11 【公園草坪噴灌未覆蓋面積】
      () => {
        const side = 20;
        const sqArea = side * side; // 400
        const r = 10;
        const cArea = r * r * 3.14; // 314
        const ans = sqArea - cArea; // 86
        return {
          id: makeId('sprinkler_lawn'),
          scenarioTag: '【都會公園綠化景觀】',
          type: 'input',
          q: `【都會公園綠化景觀】社區正方形草坪邊長為 ${side} 公尺，中心裝設一座旋轉噴水器，噴水半徑剛好是 ${r} 公尺。請問草坪「沒有被水噴到」的四個角落區域總面積是多少平方公尺？ (圓周率以 3.14 計)`,
          a: String(ans),
          hint: `💡 提示：四個角落未覆蓋面積 = 正方形面積 - 圓形噴灑面積。`,
          explanation: `📝 詳解：\n1. 正方形草坪面積 = ${side} × ${side} = ${sqArea} 平方公尺。\n2. 圓形噴灑面積 = ${r} × ${r} × 3.14 = ${cArea} 平方公尺。\n3. 未噴灑面積 = ${sqArea} - ${cArea} = ${ans} 平方公尺。`
        };
      },
      // 5-12 【運動會起跑線規劃】
      () => {
        // r1 = 20, r2 = 21 => c1 = 2*20*3.14 = 125.6, c2 = 2*21*3.14 = 131.88 => diff = 6.28
        return {
          id: makeId('track_lane_diff'),
          scenarioTag: '【田徑運動場起跑規劃】',
          type: 'input',
          q: `【田徑運動場起跑規劃】學校運動場跑道彎道由兩個半圓組成（合成一整圓）。第 1 跑道彎道半徑是 20 公尺，第 2 跑道彎道半徑是 21 公尺。跑者各跑一整圈，第 2 跑道比第 1 跑道多跑了幾公尺？起跑線應往前移幾公尺？ (圓周率以 3.14 計)`,
          a: "6.28",
          hint: `💡 提示：跑道直線段長度相同，差距全在兩個半圓彎道（即圓周長之差）。差距 = 2 × (半徑差) × 3.14。`,
          explanation: `📝 詳解：\n1. 第 2 跑道圓周長 = 2 × 21 × 3.14 = 131.88 公尺。\n2. 第 1 跑道圓周長 = 2 × 20 × 3.14 = 125.6 公尺。\n3. 相差距離 = 131.88 - 125.6 = 6.28 公尺，起跑線應往前移 6.28 公尺。`
        };
      },
      // 5-13 【披薩派對聰明訂購】
      () => {
        // 大披薩: 直徑 30cm => r=15, 面積 = 15*15*3.14 = 706.5
        // 兩個小披薩: 直徑 20cm => r=10, 面積 = 2 * (10*10*3.14) = 628
        // 差 = 706.5 - 628 = 78.5
        return {
          id: makeId('pizza_value'),
          scenarioTag: '【生活消費決策】',
          type: 'input',
          q: `【生活消費決策】披薩店同價位特惠：買 1 個直徑 30 公分的大披薩，或買 2 個直徑 20 公分的小披薩。請問 1 個大披薩的總面積比 2 個小披薩的總面積多了多少平方公分？ (圓周率以 3.14 計)`,
          a: "78.5",
          hint: `💡 提示：直徑先除以 2 求半徑。大披薩半徑為 15 公分，小披薩半徑為 10 公分。分別算出總面積後相減。`,
          explanation: `📝 詳解：\n1. 大披薩面積 = 15 × 15 × 3.14 = 706.5 平方公分。\n2. 兩個小披薩面積 = 2 × (10 × 10 × 3.14) = 628 平方公分。\n3. 面積差距 = 706.5 - 628 = 78.5 平方公分。`
        };
      }
    ]
  }),

  // 6. 速率與應用
  speed: createTieredTopic({
    easy: [
      // 6-1 距離計算
      () => {
        const speed = randomInt(6, 10) * 10;
        const time = randomInt(2, 4);
        const dist = speed * time;
        return {
          id: makeId('dist_calc'),
          type: 'input',
          q: `火車時速是 ${speed} 公里，連續行駛了 ${time} 小時，共行駛了多少公里？`,
          a: String(dist),
          hint: `💡 提示：距離 = 速率 × 時間。`,
          explanation: `📝 詳解：\n距離 = ${speed} × ${time} = ${dist} 公里。`
        };
      },
      // 6-2 速率計算
      () => {
        const time = 3, dist = 210;
        const ans = dist / time;
        return {
          id: makeId('speed_calc'),
          type: 'input',
          q: `汽車開了 ${dist} 公里，一共花了 ${time} 小時，這輛汽車的「平均時速」是多少公里？`,
          a: String(ans),
          hint: `💡 提示：速率 = 距離 ÷ 時間。`,
          explanation: `📝 詳解：\n時速 = ${dist} ÷ ${time} = ${ans} 公里/小時。`
        };
      },
      // 6-3 時間計算
      () => {
        const speed = 80, dist = 240;
        const ans = dist / speed;
        return {
          id: makeId('time_calc'),
          type: 'input',
          q: `小明開車時速固定為 ${speed} 公里，想要行駛 ${dist} 公里，需要花幾小時？`,
          a: String(ans),
          hint: `💡 提示：時間 = 距離 ÷ 速率。`,
          explanation: `📝 詳解：\n時間 = ${dist} ÷ ${speed} = ${ans} 小時。`
        };
      },
      // 6-4 時速換算分速
      () => {
        const speedKmH = 90;
        const speedKmMin = Number((speedKmH / 60).toFixed(1));
        return {
          id: makeId('speed_km_min'),
          type: 'input',
          q: `時速 ${speedKmH} 公里相當於「分速」幾公里？`,
          a: String(speedKmMin),
          hint: `💡 提示：1 小時 = 60 分鐘。將時速除以 60 即可換算為分速。`,
          explanation: `📝 詳解：\n分速 = ${speedKmH} ÷ 60 = ${speedKmMin} 公里/分鐘。`
        };
      },
      // 6-5 距離固定時反比概念
      () => {
        const options = ["成反比", "成正比", "沒有關係", "平方成正比"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('speed_inv_c'),
          type: 'choice',
          q: `在「距離固定」的情況下，行駛所花費的「時間」與「速率」之間是什麼關係？`,
          options,
          a: "成反比",
          hint: `💡 提示：速度越快，花的時間越少；兩者乘積為固定距離。`,
          explanation: `📝 詳解：\n速率 × 時間 = 固定距離，兩量乘積固定時，成「反比」關係。`
        };
      }
    ],
    challenge: [
      // 6-6 時速換算秒速公尺
      () => {
        return {
          id: makeId('speed_ms_c'),
          type: 'choice',
          q: `時速 72 公里換算為「秒速」是多少公尺？`,
          options: ["20 公尺", "25 公尺", "12 公尺", "72 公尺"].sort(() => Math.random() - 0.5),
          a: "20 公尺",
          hint: `💡 提示：72 公里 = 72000 公尺，1 小時 = 3600 秒。72000 ÷ 3600。`,
          explanation: `📝 詳解：\n72000 公尺 ÷ 3600 秒 = 20 公尺/秒。`
        };
      },
      // 6-7 追趕問題
      () => {
        const dist = 200;
        const vDiff = 50;
        const ans = dist / vDiff;
        return {
          id: makeId('chase_speed'),
          type: 'input',
          q: `哥哥分速 250 公尺，弟弟分速 200 公尺。弟弟先出發，在哥哥前方 ${dist} 公尺處，哥哥開始追趕，幾分鐘後哥哥可以追上弟弟？`,
          a: String(ans),
          hint: `💡 提示：追及時間 = 相差距離 ÷ 速率差。`,
          explanation: `📝 詳解：\n速率差 = 250 - 200 = 50 公尺/分。追上時間 = ${dist} ÷ 50 = ${ans} 分鐘。`
        };
      },
      // 6-8 相遇問題
      () => {
        const dist = 900;
        const v1 = 50, v2 = 40;
        const ans = dist / (v1 + v2);
        return {
          id: makeId('meet_speed'),
          type: 'input',
          q: `甲乙兩地相距 ${dist} 公尺，小華分速 ${v1} 公尺，小明分速 ${v2} 公尺，兩人同時從兩地相向而行，幾分鐘後會相遇？`,
          a: String(ans),
          hint: `💡 提示：相遇時間 = 總距離 ÷ 速率和。兩人一分鐘合走 (v1 + v2) 公尺。`,
          explanation: `📝 詳解：\n兩人每分鐘共走 ${v1} + ${v2} = 90 公尺。相遇時間 = ${dist} ÷ 90 = ${ans} 分鐘。`
        };
      },
      // 6-9 分速換算秒速
      () => {
        const minSpeed = 120;
        const secSpeed = minSpeed / 60;
        return {
          id: makeId('min_to_sec_speed'),
          type: 'input',
          q: `汽車分速是 ${minSpeed} 公尺，相當於「秒速」幾公尺？`,
          a: String(secSpeed),
          hint: `💡 提示：1 分鐘 = 60 秒。分速除以 60 即為秒速。`,
          explanation: `📝 詳解：\n秒速 = ${minSpeed} ÷ 60 = ${secSpeed} 公尺/秒。`
        };
      },
      // 6-10 平均速率概念
      () => {
        const options = ["總距離 ÷ 總時間", "兩段速率相加除以 2", "最高速率加最低速率除以 2", "距離乘以時間"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('avg_speed_c'),
          type: 'choice',
          q: `計算全程的「平均速率」，正確的計算方式是下列何者？`,
          options,
          a: "總距離 ÷ 總時間",
          hint: `💡 提示：平均速率絕不能直接把不同路段的速率相加除以 2！`,
          explanation: `📝 詳解：\n平均速率定義為「總路程 ÷ 總耗時」。直接速率平均是常見錯誤。`
        };
      }
    ],
    competency: [
      // 6-11 【科技執法區間測速】
      () => {
        const dist = 10; // 10 km
        const min = 6; // 6 min = 0.1 hr
        const avgSpeed = dist / (min / 60); // 100 km/h
        return {
          id: makeId('speed_camera'),
          scenarioTag: '【科技執法區間測速】',
          type: 'input',
          q: `【科技執法區間測速】快速公路某特定路段全長 ${dist} 公里，速限最高為時速 80 公里。一輛轎車通過該區間測速起點到終點共耗時 ${min} 分鐘，請問該車在該路段的「平均時速」是多少公里？`,
          a: String(avgSpeed),
          hint: `💡 提示：先把 ${min} 分鐘換算為小時 (${min}/60 小時)，平均時速 = 總距離 ÷ 總小時數。`,
          explanation: `📝 詳解：\n1. 時間 = ${min} ÷ 60 = 0.1 小時。\n2. 平均時速 = ${dist} ÷ 0.1 = ${avgSpeed} 公里/小時（高於速限 80，判定超速開罰）。`
        };
      },
      // 6-12 【連假返鄉全程平均速率】
      () => {
        const oneWay = 120;
        const t1 = 1.5, t2 = 2.5;
        const totalDist = oneWay * 2; // 240
        const totalTime = t1 + t2; // 4
        const ans = totalDist / totalTime; // 60
        return {
          id: makeId('round_trip_real'),
          scenarioTag: '【返鄉路況全程平均速率】',
          type: 'input',
          q: `【返鄉路況全程平均速率】爸爸開車返鄉，單程距離為 ${oneWay} 公里。去程順暢花費 ${t1} 小時，回程遇到塞車花費 ${t2} 小時。請問爸爸往返兩地的「全程平均時速」是多少公里？`,
          a: String(ans),
          hint: `💡 提示：全程平均時速 = 往返總距離 ÷ 往返總時間。千萬不能直接把去程時速與回程時速相加除以 2！`,
          explanation: `📝 詳解：\n1. 往返總距離 = ${oneWay} × 2 = ${totalDist} 公里。\n2. 往返總耗時 = ${t1} + ${t2} = ${totalTime} 小時。\n3. 全程平均時速 = ${totalDist} ÷ ${totalTime} = ${ans} 公里/小時。`
        };
      },
      // 6-13 【綠色通勤工具比較】
      () => {
        // dist = 3km
        // bike: v = 250 m/min => 3000m / 250 = 12 min
        // bus: 30 km/h = 0.5 km/min => 3 / 0.5 = 6 min + 6 min wait = 12 min => tie
        // let's adjust: dist = 6km
        // bike: v = 200 m/min => 6000 / 200 = 30 min
        // bus: v = 30 km/h => 6/30 = 0.2 hr = 12 min + 8 min wait = 20 min => bus is faster by 10 min
        return {
          id: makeId('commute_choice'),
          scenarioTag: '【大眾運輸通勤決策】',
          type: 'choice',
          q: `【大眾運輸通勤決策】小明上學路線全長 6 公里。騎自行車分速 200 公尺（需 30 分鐘）；若搭公車平均時速 30 公里（行駛需 12 分鐘），但需在站牌等候 8 分鐘。哪種方式較快到達？快幾分鐘？`,
          options: ["搭公車較快，快 10 分鐘", "騎自行車較快，快 10 分鐘", "兩種方式耗時完全一樣", "搭公車較快，快 18 分鐘"].sort(() => Math.random() - 0.5),
          a: "搭公車較快，快 10 分鐘",
          hint: `💡 提示：比較兩種通勤方式的「總耗時」：自行車耗時 vs 公車行駛時間加上等車時間。`,
          explanation: `📝 詳解：\n1. 自行車總耗時 = 6000 ÷ 200 = 30 分鐘。\n2. 公車總耗時 = 12 分鐘 + 8 分鐘等車 = 20 分鐘。\n3. 搭公車較快，快了 30 - 20 = 10 分鐘。`
        };
      }
    ]
  }),

  // 7. 柱體表面積與體積
  prisms: createTieredTopic({
    easy: [
      // 7-1 正方體體積
      () => {
        const side = randomInt(3, 6);
        const vol = side * side * side;
        return {
          id: makeId('cube_vol'),
          type: 'input',
          q: `一個邊長為 ${side} 公分的正方體，體積是多少立方公分？`,
          a: String(vol),
          hint: `💡 提示：正方體體積 = 邊長 × 邊長 × 邊長。`,
          explanation: `📝 詳解：\n體積 = ${side} × ${side} × ${side} = ${vol} 立方公分。`
        };
      },
      // 7-2 長方體體積
      () => {
        const l = randomInt(4, 7), w = randomInt(3, 5), h = randomInt(5, 8);
        const vol = l * w * h;
        return {
          id: makeId('rect_prism_vol'),
          type: 'input',
          q: `一個長方體的長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分，體積是多少立方公分？`,
          a: String(vol),
          hint: `💡 提示：長方體體積 = 長 × 寬 × 高。`,
          explanation: `📝 詳解：\n體積 = ${l} × ${w} × ${h} = ${vol} 立方公分。`
        };
      },
      // 7-3 三角柱面、邊、頂點特徵
      () => {
        const options = ["5 個面、9 個邊、6 個頂點", "6 個面、8 個邊、6 個頂點", "4 個面、6 個邊、4 個頂點", "5 個面、8 個邊、5 個頂點"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('tri_prism_feat_c'),
          type: 'choice',
          q: `一個「三角柱」具有幾個面、幾個邊和幾個頂點？`,
          options,
          a: "5 個面、9 個邊、6 個頂點",
          hint: `💡 提示：三角柱有 2 個三角形底面、3 個長方形側面；邊有 3+3+3=9 條；頂點有 3+3=6 個。`,
          explanation: `📝 詳解：\n三角柱的面數 = 3 + 2 = 5 個，邊數 = 3 × 3 = 9 條，頂點數 = 3 × 2 = 6 個。`
        };
      },
      // 7-4 圓柱側面展開圖
      () => {
        const options = ["長方形", "圓形", "扇形", "梯形"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('cyl_unroll_c'),
          type: 'choice',
          q: `將圓柱的側面沿著高剪開展開後，得到的平面展開圖是什麼形狀？`,
          options,
          a: "長方形",
          hint: `💡 提示：展開後的長是底面圓周長，寬是圓柱的高。`,
          explanation: `📝 詳解：\n圓柱的側面展開圖為「長方形」，其長邊長度等於底面的圓周長，寬度等於圓柱的高。`
        };
      },
      // 7-5 柱體體積通式
      () => {
        const options = ["底面積 × 柱高", "周長 × 柱高", "底面積 ÷ 柱高", "邊長 × 邊長 × 6"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('prism_general_c'),
          type: 'choice',
          q: `計算所有柱體（角柱與圓柱）體積的「通用公式」是下列何者？`,
          options,
          a: "底面積 × 柱高",
          hint: `💡 提示：不管底面是多邊形還是圓形，柱體體積都是將底面面積疊加柱高。`,
          explanation: `📝 詳解：\n所有柱體體積皆適用「底面積 × 柱高」公式。`
        };
      }
    ],
    challenge: [
      // 7-6 正方體表面積
      () => {
        const side = randomInt(3, 6);
        const sa = side * side * 6;
        return {
          id: makeId('cube_sa'),
          type: 'input',
          q: `一個邊長為 ${side} 公分的正方體，其「表面積」是多少平方公分？`,
          a: String(sa),
          hint: `💡 提示：正方體有 6 個完全相同的正方形面，表面積 = 單面面積 × 6。`,
          explanation: `📝 詳解：\n一個面的面積 = ${side} × ${side} = ${side * side}。表面積 = ${side * side} × 6 = ${sa} 平方公分。`
        };
      },
      // 7-7 三角柱體積
      () => {
        const baseL = 6, baseH = 4;
        const baseArea = (baseL * baseH) / 2;
        const prismH = randomInt(5, 9);
        const vol = baseArea * prismH;
        return {
          id: makeId('tri_prism_vol'),
          type: 'input',
          q: `一個三角柱的底面是三角形（底 ${baseL} 公分、高 ${baseH} 公分），三角柱的高是 ${prismH} 公分。請問此三角柱的體積是多少立方公分？`,
          a: String(vol),
          hint: `💡 提示：柱體體積 = 底面積 × 柱高。注意三角形底面積是 (底 × 高) ÷ 2。`,
          explanation: `📝 詳解：\n1. 底面積 = (${baseL} × ${baseH}) ÷ 2 = ${baseArea} 平方公分。\n2. 體積 = ${baseArea} × ${prismH} = ${vol} 立方公分。`
        };
      },
      // 7-8 圓柱體積
      () => {
        const r = 5, h = 10;
        const baseArea = r * r * 3.14;
        const vol = Number((baseArea * h).toFixed(1));
        return {
          id: makeId('cylinder_vol'),
          type: 'input',
          q: `一個圓柱的底面半徑是 ${r} 公分，柱高是 ${h} 公分，此圓柱的體積約是多少立方公分？ (圓周率以 3.14 計)`,
          a: String(vol),
          hint: `💡 提示：圓柱體積 = 底面積 × 柱高 = (半徑 × 半徑 × 3.14) × 柱高。`,
          explanation: `📝 詳解：\n底面積 = ${r} × ${r} × 3.14 = ${baseArea}。體積 = ${baseArea} × ${h} = ${vol} 立方公分。`
        };
      },
      // 7-9 排水法求物體積
      () => {
        const baseL = 10, baseW = 10, rise = 2;
        const vol = baseL * baseW * rise;
        return {
          id: makeId('water_displace'),
          type: 'input',
          q: `長 ${baseL} 公分、寬 ${baseW} 公分的水槽中，投入一顆石頭完全沉入水中後，水深上升了 ${rise} 公分且水沒有溢出。請問這顆石頭的體積是多少立方公分？`,
          a: String(vol),
          hint: `💡 提示：沉入物體的體積 = 水槽底面積 × 水位上升的高度。`,
          explanation: `📝 詳解：\n底面積 = ${baseL} × ${baseW} = 100 平方公分。石頭體積 = 100 × ${rise} = ${vol} 立方公分。`
        };
      },
      // 7-10 長方體表面積
      () => {
        const l = 5, w = 4, h = 3;
        const sa = 2 * (l * w + l * h + w * h);
        return {
          id: makeId('rect_prism_sa'),
          type: 'input',
          q: `一個長方體的長為 ${l} 公分、寬為 ${w} 公分、高為 ${h} 公分，其「表面積」是多少平方公分？`,
          a: String(sa),
          hint: `💡 提示：長方體表面積 = 2 × (長×寬 + 長×高 + 寬×高)。`,
          explanation: `📝 詳解：\n表面積 = 2 × (${l}×${w} + ${l}×${h} + ${w}×${h}) = 2 × (20 + 15 + 12) = ${sa} 平方公分。`
        };
      }
    ],
    competency: [
      // 7-11 【生態魚缸造景沉木體積】
      () => {
        const l = 50, w = 30, rise = 4;
        const vol = l * w * rise; // 6000
        return {
          id: makeId('aquarium_displace'),
          scenarioTag: '【水族生態造景設計】',
          type: 'input',
          q: `【水族生態造景設計】客廳長 ${l} 公分、寬 ${w} 公分的長方體生態魚缸中，水深原為 20 公分。放入造景沉木完全沉入水中後，水深上升到 24 公分（上升 ${rise} 公分）且水未溢出。這塊造景沉木的體積是多少立方公分？`,
          a: String(vol),
          hint: `💡 提示：水槽中投入物體的體積 = 容器底面積 × 水位上升的高度。`,
          explanation: `📝 詳解：\n1. 魚缸底面積 = ${l} × ${w} = 1500 平方公分。\n2. 沉木體積 = 1500 × ${rise} = ${vol} 立方公分。`
        };
      },
      // 7-12 【社區泳池注水計時】
      () => {
        const l = 25, w = 10, depth = 2;
        const totalVol = l * w * depth; // 500 m³
        const ratePerHour = 100;
        const hours = totalVol / ratePerHour; // 5 hr
        return {
          id: makeId('pool_filling'),
          scenarioTag: '【公共休閒設施管理】',
          type: 'input',
          q: `【公共休閒設施管理】社區標準游泳池長 ${l} 公尺、寬 ${w} 公尺，預計注水深度為 ${depth} 公尺。若大口徑抽水幫浦每小時可注水 ${ratePerHour} 立方公尺，完全注滿預定水深需要幾小時？`,
          a: String(hours),
          hint: `💡 提示：先算泳池注水總體積（長 × 寬 × 水深），再除以每小時注水立方公尺數。`,
          explanation: `📝 詳解：\n1. 泳池注水總體積 = ${l} × ${w} × ${depth} = ${totalVol} 立方公尺。\n2. 所需時間 = ${totalVol} ÷ ${ratePerHour} = ${hours} 小時。`
        };
      },
      // 7-13 【文創商品包裝用紙】
      () => {
        const l = 20, w = 15, h = 10;
        const sa = 2 * (l * w + l * h + w * h); // 2*(300+200+150) = 1300
        return {
          id: makeId('gift_box_cost'),
          scenarioTag: '【文創商品包裝設計】',
          type: 'input',
          q: `【文創商品包裝設計】文創餅乾店訂製長 ${l} 公分、寬 ${w} 公分、高 ${h} 公分的長方體精裝禮品盒。請問製作一個這個禮品盒外盒「表面積」是多少平方公分？`,
          a: String(sa),
          hint: `💡 提示：長方體表面積 = 2 × (長×寬 + 長×高 + 寬×高)。`,
          explanation: `📝 詳解：\n表面積 = 2 × (${l}×${w} + ${l}×${h} + ${w}×${h}) = 2 × (300 + 200 + 150) = ${sa} 平方公分。`
        };
      }
    ]
  }),

  // 8. 基準量與比較量
  baseComp: createTieredTopic({
    easy: [
      // 8-1 求比較量
      () => {
        const base = randomInt(2, 6) * 10;
        const mult = 1.5;
        const ans = Math.round(base * mult);
        return {
          id: makeId('comp_calc'),
          type: 'input',
          q: `小明有 ${base} 元（基準量），哥哥的錢是小明的 ${mult} 倍（比值）。請問哥哥有多少元（比較量）？`,
          a: String(ans),
          hint: `💡 提示：比較量 = 基準量 × 比值。`,
          explanation: `📝 詳解：\n比較量 = ${base} × ${mult} = ${ans} 元。`
        };
      },
      // 8-2 求基準量
      () => {
        const mult = 3, comp = 90;
        const ans = comp / mult;
        return {
          id: makeId('base_calc'),
          type: 'input',
          q: `父親今年體重是小明的 ${mult} 倍（比值），已知父親體重為 ${comp} 公斤（比較量）。請問小明的體重（基準量）是多少公斤？`,
          a: String(ans),
          hint: `💡 提示：基準量 = 比較量 ÷ 比值。`,
          explanation: `📝 詳解：\n基準量 = ${comp} ÷ ${mult} = ${ans} 公斤。`
        };
      },
      // 8-3 基準量認定概念
      () => {
        const options = ["甲的量是 1", "乙的量是 1", "丙的量是 1", "兩者都是 1"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('which_base_c'),
          type: 'choice',
          q: `在「乙的數量是甲的 3 倍」這句話中，哪一個量是被當作標準的「基準量（相當於 1）」？`,
          options,
          a: "甲的量是 1",
          hint: `💡 提示：「是誰的幾倍」，「誰」就是被比較的基準量（被當成 1）。`,
          explanation: `📝 詳解：\n「以甲為基準，乙是甲的 3 倍」，因此「甲」是基準量 (1)，「乙」是比較量 (3)。`
        };
      },
      // 8-4 求比值
      () => {
        const base = 50, comp = 75;
        const options = ["1.5", "0.67", "2.5", "1.25"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('calc_ratio_c'),
          type: 'choice',
          q: `已知基準量為 ${base}，比較量為 ${comp}，請問比值是多少？`,
          options,
          a: "1.5",
          hint: `💡 提示：比值 = 比較量 ÷ 基準量。`,
          explanation: `📝 詳解：\n比值 = ${comp} ÷ ${base} = 1.5。`
        };
      },
      // 8-5 身高倍數比值
      () => {
        return {
          id: makeId('height_base'),
          type: 'input',
          q: `爸爸身高 180 公分，兒子身高 120 公分。請問爸爸的身高是兒子身高的幾倍？ (請以小數表示)`,
          a: "1.5",
          hint: `💡 提示：倍數 = 爸爸身高 ÷ 兒子身高。`,
          explanation: `📝 詳解：\n180 ÷ 120 = 1.5 倍。`
        };
      }
    ],
    challenge: [
      // 8-6 母子和問題
      () => {
        const mult = 2;
        const brother = randomInt(2, 5) * 10;
        const total = brother * (1 + mult);
        return {
          id: makeId('sum_base'),
          type: 'input',
          q: `姊姊的錢是弟弟的 ${mult} 倍，兩人共有 ${total} 元。請問弟弟有多少元？`,
          a: String(brother),
          hint: `💡 提示：把弟弟看作 1 份，姊姊是 ${mult} 份，兩人共有 1 + ${mult} = ${1 + mult} 份。`,
          explanation: `📝 詳解：\n總份數 = 1 + ${mult} = ${1 + mult} 份。弟弟的錢 = ${total} ÷ ${1 + mult} = ${brother} 元。`
        };
      },
      // 8-7 母子差問題
      () => {
        const mult = 3, base = 20;
        const diff = base * (mult - 1);
        return {
          id: makeId('diff_base'),
          type: 'input',
          q: `紅繩子的長度是藍繩子的 ${mult} 倍，紅繩子比藍繩子長 ${diff} 公分。請問藍繩子有多長？`,
          a: String(base),
          hint: `💡 提示：紅繩比藍繩多了 (${mult} - 1) = ${mult - 1} 份，等於 ${diff} 公分。`,
          explanation: `📝 詳解：\n相差份數 = ${mult} - 1 = ${mult - 1} 份。藍繩長度 = ${diff} ÷ ${mult - 1} = ${base} 公分。`
        };
      },
      // 8-8 加成加價
      () => {
        const cost = 200, rate = 0.2;
        const price = Math.round(cost * (1 + rate));
        return {
          id: makeId('markup_base'),
          type: 'input',
          q: `衣服成本 ${cost} 元，老闆「加兩成」(20%) 當作售價賣出。請問這件衣服售價是多少元？`,
          a: String(price),
          hint: `💡 提示：加兩成代表售價是成本的 (1 + 0.2) = 1.2 倍。`,
          explanation: `📝 詳解：\n售價 = 成本 × (1 + 0.2) = ${cost} × 1.2 = ${price} 元。`
        };
      },
      // 8-9 打折問題
      () => {
        const listPrice = 500, discount = 0.8;
        const price = Math.round(listPrice * discount);
        return {
          id: makeId('discount_base'),
          type: 'input',
          q: `書包定價 ${listPrice} 元，店內週年慶「打八折」出售。請問打折後的售價是多少元？`,
          a: String(price),
          hint: `💡 提示：打八折代表售價是定價的 0.8 倍 (80%)。`,
          explanation: `📝 詳解：\n售價 = ${listPrice} × 0.8 = ${price} 元。`
        };
      },
      // 8-10 成長率百分比
      () => {
        const lastYear = 1000, thisYear = 1200;
        const options = ["20%", "12%", "120%", "2%"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('growth_rate_c'),
          type: 'choice',
          q: `工廠去年生產量為 ${lastYear} 輛，今年生產量增加到 ${thisYear} 輛。今年的生產量比去年「成長了幾 %」？`,
          options,
          a: "20%",
          hint: `💡 提示：成長率 = (增加量 ÷ 去年基準量) × 100%。`,
          explanation: `📝 詳解：\n增加量 = ${thisYear} - ${lastYear} = 200。成長率 = (200 ÷ ${lastYear}) × 100% = 20%。`
        };
      }
    ],
    competency: [
      // 8-11 【雙11購物特惠方案比較】
      () => {
        const priceA = 1000 * 0.8; // 800
        const priceB = 1000 - 150; // 850
        const diff = priceB - priceA; // 50
        return {
          id: makeId('promotion_compare'),
          scenarioTag: '【網購生活理財決策】',
          type: 'choice',
          q: `【網購生活理財決策】同款藍牙耳機定價 1000 元。A 商店推出「全面打八折」，B 商店推出「滿千現折 150 元」。哪一家商店售價較便宜？便宜多少元？`,
          options: ["A 商店較便宜，便宜 50 元", "B 商店較便宜，便宜 50 元", "兩家商店售價完全相同", "A 商店較便宜，便宜 100 元"].sort(() => Math.random() - 0.5),
          a: "A 商店較便宜，便宜 50 元",
          hint: `💡 提示：A 商店售價 = 1000 × 0.8。B 商店售價 = 1000 - 150。算出兩者價格後比較大小與差額。`,
          explanation: `📝 詳解：\n1. A 商店售價 = 1000 × 0.8 = 800 元。\n2. B 商店售價 = 1000 - 150 = 850 元。\n3. A 商店比 B 商店便宜 850 - 800 = 50 元。`
        };
      },
      // 8-12 【智慧節能減碳用電】
      () => {
        const thisYear = 480;
        const rate = 0.2; // 少 20% => thisYear is 80% of lastYear
        const lastYear = thisYear / (1 - rate); // 600
        return {
          id: makeId('energy_saving'),
          scenarioTag: '【家庭綠能減碳實踐】',
          type: 'input',
          q: `【家庭綠能減碳實踐】小明家今年 7 月落實隨手關燈與變頻節能，用電量為 ${thisYear} 度，比去年 7 月減少了 20% (即為去年的 0.8 倍)。請問去年 7 月小明家的用電量是多少度？`,
          a: String(lastYear),
          hint: `💡 提示：以去年用電量為基準量 (1)，今年是去年的 (1 - 0.2) = 0.8 倍。基準量 = 比較量 ÷ 比值。`,
          explanation: `📝 詳解：\n1. 去年相當於 1，今年相當於 1 - 0.2 = 0.8。\n2. 去年用電量 = ${thisYear} ÷ 0.8 = ${lastYear} 度。`
        };
      },
      // 8-13 【零用錢自主理財儲蓄】
      () => {
        const total = 1200;
        const mult = 2; // 儲蓄是花費的 2 倍 => 花費 1 份，儲蓄 2 份 => 共 3 份
        const spend = total / (1 + mult); // 400
        const save = spend * mult; // 800
        return {
          id: makeId('budget_savings'),
          scenarioTag: '【自主理財儲蓄規劃】',
          type: 'input',
          q: `【自主理財儲蓄規劃】小華將每月的零用錢分為「花費」與「儲蓄」兩部分，其中儲蓄金額是花費金額的 ${mult} 倍。若小華每月共有零用錢 ${total} 元，小華每個月儲蓄了多少元？`,
          a: String(save),
          hint: `💡 提示：花費為基準量 1 份，儲蓄為 ${mult} 份，合起來共 1 + ${mult} = ${1 + mult} 份。先算 1 份多少元，再乘上儲蓄份數。`,
          explanation: `📝 詳解：\n1. 總份數 = 1 + ${mult} = ${1 + mult} 份。\n2. 每份花費 = ${total} ÷ ${1 + mult} = ${spend} 元。\n3. 儲蓄金額 = ${spend} × ${mult} = ${save} 元。`
        };
      }
    ]
  }),

  // 9. 怎樣解題（經典應用題組）
  problemSolving: createTieredTopic({
    easy: [
      // 9-1 年齡倍數
      () => {
        const diff = 24, mult = 3;
        const son = 12, dad = son + diff;
        return {
          id: makeId('age_prob'),
          type: 'input',
          q: `爸爸今年 ${dad} 歲，兒子今年 ${son} 歲。請問爸爸的年齡是兒子的幾倍？`,
          a: String(mult),
          hint: `💡 提示：年齡倍數 = 爸爸歲數 ÷ 兒子歲數。`,
          explanation: `📝 詳解：\n${dad} ÷ ${son} = ${mult} 倍。`
        };
      },
      // 9-2 植樹問題（兩端都種）
      () => {
        const dist = randomInt(4, 6);
        const trees = randomInt(7, 12);
        const totalLen = (trees - 1) * dist;
        return {
          id: makeId('tree_both'),
          type: 'input',
          q: `一條直線道路全長 ${totalLen} 公尺，在路的一側「頭尾兩端都種樹」，每相鄰兩棵樹間隔 ${dist} 公尺，總共種了幾棵樹？`,
          a: String(trees),
          hint: `💡 提示：頭尾都種時，棵數 = 間隔數 + 1。先用總長除以間距算間隔數。`,
          explanation: `📝 詳解：\n1. 間隔數 = ${totalLen} ÷ ${dist} = ${trees - 1} 個。\n2. 棵數 = 間隔數 + 1 = ${trees - 1} + 1 = ${trees} 棵。`
        };
      },
      // 9-3 圓形封閉植樹
      () => {
        const dist = 6, count = 15;
        const circum = count * dist;
        return {
          id: makeId('circle_tree'),
          type: 'input',
          q: `一個圓形水池周長是 ${circum} 公尺，沿著水池周圍每隔 ${dist} 公尺插一根旗子，總共需要插幾根旗子？`,
          a: String(count),
          hint: `💡 提示：在圓形等封閉圖形上，旗子數 = 間隔數。`,
          explanation: `📝 詳解：\n封閉曲線圖形中，間隔數等於物體數量：${circum} ÷ ${dist} = ${count} 根。`
        };
      },
      // 9-4 順流時速
      () => {
        const boat = 20, water = 4;
        const downstream = boat + water;
        return {
          id: makeId('boat_down'),
          type: 'input',
          q: `一艘船在靜水中的時速為 ${boat} 公里，水流時速為 ${water} 公里。請問這艘船「順流而下」時的實際時速是幾公里？`,
          a: String(downstream),
          hint: `💡 提示：順流速率 = 船速 + 水速。`,
          explanation: `📝 詳解：\n順流速率 = ${boat} + ${water} = ${downstream} 公里/小時。`
        };
      },
      // 9-5 逆流時速
      () => {
        const boat = 20, water = 4;
        const upstream = boat - water;
        return {
          id: makeId('boat_up'),
          type: 'input',
          q: `一艘船在靜水中的時速為 ${boat} 公里，水流時速為 ${water} 公里。請問這艘船「逆流而上」時的實際時速是幾公里？`,
          a: String(upstream),
          hint: `💡 提示：逆流速率 = 船速 - 水速。`,
          explanation: `📝 詳解：\n逆流速率 = ${boat} - ${water} = ${upstream} 公里/小時。`
        };
      }
    ],
    challenge: [
      // 9-6 雞兔同籠
      () => {
        const heads = randomInt(12, 18);
        const rabbits = randomInt(4, heads - 4);
        const chickens = heads - rabbits;
        const legs = rabbits * 4 + chickens * 2;
        return {
          id: makeId('chick_rab'),
          type: 'input',
          q: `【雞兔同籠】農場裡有雞和兔子共 ${heads} 隻，數一數共有 ${legs} 隻腳。請問「兔子」有幾隻？`,
          a: String(rabbits),
          hint: `💡 提示：假設全部都是雞，共有 ${heads} × 2 隻腳，多出的腳是因為每隻兔子比雞多 2 隻腳。`,
          explanation: `📝 詳解：\n1. 若全為雞：${heads} × 2 = ${heads * 2} 隻腳。\n2. 腳數差距：${legs} - ${heads * 2} = ${legs - heads * 2} 隻腳。\n3. 兔子數量 = ${legs - heads * 2} ÷ 2 = ${rabbits} 隻。`
        };
      },
      // 9-7 植樹問題（兩端都不種）
      () => {
        const dist = 5, trees = 8;
        const totalLen = (trees + 1) * dist;
        return {
          id: makeId('tree_neither'),
          type: 'input',
          q: `兩座大樓之間長度為 ${totalLen} 公尺，在兩大樓間種樹且「兩端都不種」，相鄰每棵樹間隔 ${dist} 公尺，共可種幾棵樹？`,
          a: String(trees),
          hint: `💡 提示：兩端都不種樹時，棵數 = 間隔數 - 1。`,
          explanation: `📝 詳解：\n1. 間隔數 = ${totalLen} ÷ ${dist} = ${trees + 1} 個。\n2. 兩端不種：棵數 = 間隔數 - 1 = ${trees + 1} - 1 = ${trees} 棵。`
        };
      },
      // 9-8 和差問題
      () => {
        const a = 35, b = 25;
        const sum = a + b, diff = a - b;
        return {
          id: makeId('sum_diff_prob'),
          type: 'input',
          q: `甲、乙兩數的和是 ${sum}，差是 ${diff}。請問較大的「甲數」是多少？`,
          a: String(a),
          hint: `💡 提示：大數 = (和 + 差) ÷ 2。`,
          explanation: `📝 詳解：\n甲數 (大數) = (${sum} + ${diff}) ÷ 2 = ${sum + diff} ÷ 2 = ${a}。`
        };
      },
      // 9-9 火車過橋
      () => {
        const bridge = 400, train = 100;
        const totalDist = bridge + train;
        return {
          id: makeId('train_bridge'),
          type: 'input',
          q: `一列火車長度是 ${train} 公尺，要完全通過一座長 ${bridge} 公尺的鐵橋，從車頭上橋到車尾完全離開鐵橋，火車一共行駛了多少公尺？`,
          a: String(totalDist),
          hint: `💡 提示：完全通過鐵橋所行駛的總距離 = 橋長 + 火車車身長度。`,
          explanation: `📝 詳解：\n總距離 = 橋長 ${bridge} + 車身 ${train} = ${totalDist} 公尺。`
        };
      },
      // 9-10 火柴棒規律
      () => {
        const n = 5;
        const matches = 1 + 3 * n;
        return {
          id: makeId('match_pattern'),
          type: 'input',
          q: `用火柴棒排成一橫排相連的正方形：排 1 個正方形要 4 根，排 2 個要 7 根，排 3 個要 10 根... 請問連續排 ${n} 個正方形總共需要幾根火柴棒？`,
          a: String(matches),
          hint: `💡 提示：第一個正方形需要 4 根，之後每多排一個正方形只需多加 3 根火柴棒。規律：1 + 3 × n。`,
          explanation: `📝 詳解：\n規律式：1 + 3 × ${n} = 1 + ${3 * n} = ${matches} 根火柴棒。`
        };
      }
    ],
    competency: [
      // 9-11 【戶外教學租車搭配】
      () => {
        // total = 150 students
        // Big bus = 40, Small bus = 25
        // 40*x + 25*y = 150 => if x=2, 80 + 25*y = 150 => 25*y = 70 (no)
        // if x=3, 120 + 25*y = 150 => no
        // if x=0, 25*6 = 150
        // if x=1, 40 + 25*y = 150 => no
        // if x=2, 80 ...
        // let's do: total = 145 students: x=3 (120) + y=1 (25) = 145 students
        const x = 3, y = 1;
        const total = 40 * x + 25 * y; // 145
        return {
          id: makeId('field_trip_bus'),
          scenarioTag: '【校外教學交通調配】',
          type: 'choice',
          q: `【校外教學交通調配】六年級共有 ${total} 位師生參加校外教學。租車公司提供大客車（每輛限乘 40 人）與中型巴士（每輛限乘 25 人）。若每輛車皆剛好坐滿且剛好載完所有人，總共需租用大客車與中型巴士各幾輛？`,
          options: ["大客車 3 輛、中型巴士 1 輛", "大客車 2 輛、中型巴士 2 輛", "大客車 1 輛、中型巴士 4 輛", "大客車 4 輛、中型巴士 0 輛"].sort(() => Math.random() - 0.5),
          a: "大客車 3 輛、中型巴士 1 輛",
          hint: `💡 提示：列出式子 40 × 大客車數 + 25 × 中巴數 = ${total}，檢驗各選項是否剛好符合總人數。`,
          explanation: `📝 詳解：\n40 × 3 + 25 × 1 = 120 + 25 = ${total} 人，剛好全員坐滿無空位。`
        };
      },
      // 9-12 【景觀步道路燈雙側裝設】
      () => {
        const len = 200, dist = 20;
        const oneSide = (len / dist) + 1; // 11
        const total = oneSide * 2; // 22
        return {
          id: makeId('street_light_install'),
          scenarioTag: '【親水綠廊工程規劃】',
          type: 'input',
          q: `【親水綠廊工程規劃】長 ${len} 公尺的親水景觀步道，「兩側」都要裝設造型景觀地燈，步道頭尾兩端都裝，每相鄰兩盞地燈間隔 ${dist} 公尺。請問整條步道「兩側一共」需要安裝幾盞地燈？`,
          a: String(total),
          hint: `💡 提示：先算步道單側的地燈數量（兩端都裝：間隔數 + 1），再乘以 2 代表兩側。`,
          explanation: `📝 詳解：\n1. 單側間隔數 = ${len} ÷ ${dist} = 10 個間隔。\n2. 單側地燈數 = 10 + 1 = 11 盞。\n3. 步道兩側總數 = 11 × 2 = ${total} 盞。`
        };
      },
      // 9-13 【渡輪順逆流往返】
      () => {
        const boat = 18, water = 2, dist = 40;
        const downSpeed = boat + water; // 20
        const upSpeed = boat - water; // 16
        // let's choose numbers that divide cleanly: boat = 20, water = 5, dist = 75
        // downSpeed = 25 => 75/25 = 3 hr
        // upSpeed = 15 => 75/15 = 5 hr
        // total = 3 + 5 = 8 hr
        const b = 20, w = 5, d = 75;
        const ans = (d / (b + w)) + (d / (b - w)); // 3 + 5 = 8
        return {
          id: makeId('round_trip_ferry'),
          scenarioTag: '【水岸觀光渡輪航行】',
          type: 'input',
          q: `【水岸觀光渡輪航行】一艘觀光渡輪在靜水中的時速為 ${b} 公里，河水流速為每小時 ${w} 公里。渡輪在相距 ${d} 公里的兩碼頭之間往返一趟（順流去、逆流回），總共航行了幾小時？`,
          a: String(ans),
          hint: `💡 提示：去程順流時速 = 船速 + 水速；回程逆流時速 = 船速 - 水速。分別算出單程時間後相加。`,
          explanation: `📝 詳解：\n1. 順流時速 = ${b} + ${w} = 25 公里/時，順流時間 = ${d} ÷ 25 = 3 小時。\n2. 逆流時速 = ${b} - ${w} = 15 公里/時，逆流時間 = ${d} ÷ 15 = 5 小時。\n3. 往返總航行時間 = 3 + 5 = ${ans} 小時。`
        };
      }
    ]
  }),

  // 10. 放大圖、縮圖與比例尺
  scales: createTieredTopic({
    easy: [
      // 10-1 地圖求實際距離
      () => {
        const scaleList = [20000, 25000, 50000, 100000, 200000];
        const scale = scaleList[randomInt(0, scaleList.length - 1)];
        const mapCm = randomInt(2, 8);
        const realKm = (scale * mapCm) / 100000;
        return {
          id: makeId('map_to_real'),
          type: 'input',
          q: `在一張比例尺為 1 : ${scale} 的地圖上，量得甲、乙兩地的距離是 ${mapCm} 公分。請問兩地的實際距離是多少「公里」？`,
          a: String(realKm),
          hint: `💡 提示：1 公里 = 100,000 公分。實際公分 = 地圖長度 × ${scale}。`,
          explanation: `📝 詳解：\n實際長度 = ${mapCm} × ${scale} = ${mapCm * scale} 公分 = ${realKm} 公里。`
        };
      },
      // 10-2 放大圖對應角不變
      () => {
        const mult = randomInt(2, 6);
        const shape = ['三角形', '長方形', '五邊形', '梯形'][randomInt(0, 3)];
        const options = ["大小不變", `跟著放大 ${mult} 倍`, `跟著放大 ${mult * mult} 倍`, "變成原來的一半"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('scale_angle_c'),
          type: 'choice',
          q: `將一個${shape}的各邊長放大為原圖的 ${mult} 倍時，該圖形的「對應角」大小會如何變化？`,
          options,
          a: "大小不變",
          hint: `💡 提示：圖形放大或縮小，邊長會同比例縮放，但所有的對應角度維持完全不變！`,
          explanation: `📝 詳解：\n圖形縮放時形狀保持相似，對應邊成比例放大，但「對應角大小保持不變」。`
        };
      },
      // 10-3 比例尺標準寫法
      () => {
        const meters = [50, 100, 200, 500, 1000][randomInt(0, 4)];
        const cm = meters * 100;
        const options = [`1 : ${cm}`, `${cm} : 1`, `1 + ${cm}`, `1 × ${cm}`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('scale_format_c'),
          type: 'choice',
          q: `地圖上 1 公分代表實際距離 ${meters} 公尺 (${cm} 公分)，此地圖的比例尺應記為下列何者？`,
          options,
          a: `1 : ${cm}`,
          hint: `💡 提示：比例尺 = 地圖上的長度 : 實際上的長度（單位必須一致）。`,
          explanation: `📝 詳解：\n${meters} 公尺 = ${cm} 公分，地圖長與實際長之比為 1 : ${cm}。`
        };
      },
      // 10-4 縮圖邊長比
      () => {
        const div = [2, 3, 4, 5, 8, 10][randomInt(0, 5)];
        const shrink = randomInt(2, 6);
        const orig = shrink * div;
        const correctStr = `1/${div}`;
        const options = [`1/${div}`, `1/${div * 2}`, `1/${div + 1}`, `1/${div * div}`].filter((v, i, a) => a.indexOf(v) === i);
        while (options.length < 4) {
          options.push(`1/${options.length + 7}`);
        }
        options.sort(() => Math.random() - 0.5);
        return {
          id: makeId('shrink_ratio'),
          type: 'choice',
          q: `原本邊長 ${orig} 公分的正方形，畫成邊長 ${shrink} 公分的縮圖，這是原圖的幾分之幾縮圖？`,
          options,
          a: correctStr,
          hint: `💡 提示：縮圖邊長 ÷ 原圖邊長 = ${shrink} ÷ ${orig}。`,
          explanation: `📝 詳解：\n${shrink} ÷ ${orig} = ${correctStr}，即為原圖的 ${correctStr} 縮圖。`
        };
      },
      // 10-5 縮圖周長縮小倍數
      () => {
        const factor = randomInt(2, 6);
        const options = [`縮小為原來的 1/${factor}`, `縮小為原來的 1/${factor * factor}`, "維持不變", `放大為 ${factor} 倍`].sort(() => Math.random() - 0.5);
        return {
          id: makeId('shrink_peri_c'),
          type: 'choice',
          q: `一個圖形畫成 1/${factor} 的縮圖後，其「周長」會如何變化？`,
          options,
          a: `縮小為原來的 1/${factor}`,
          hint: `💡 提示：周長是一維長度，與邊長縮小倍數相同。`,
          explanation: `📝 詳解：\n所有邊長縮小為 1/${factor}，各邊相加的周長也縮小為原本的 1/${factor}。`
        };
      }
    ],
    challenge: [
      // 10-6 實際距離求地圖長度
      () => {
        const scale = 2000, realM = 60;
        const realCm = realM * 100;
        const mapCm = realCm / scale;
        return {
          id: makeId('real_to_map'),
          type: 'input',
          q: `在比例尺 1 : ${scale} 的地圖上，一條實際長 ${realM} 公尺的街道，在地圖上畫出來的長度是幾公分？`,
          a: String(mapCm),
          hint: `💡 提示：先將 ${realM} 公尺換算成公分 (${realCm} 公分)，再除以比例尺分母 ${scale}。`,
          explanation: `📝 詳解：\n${realM} 公尺 = ${realCm} 公分。地圖長度 = ${realCm} ÷ ${scale} = ${mapCm} 公分。`
        };
      },
      // 10-7 放大圖面積平方倍
      () => {
        const mult = 3;
        const areaMult = mult * mult;
        return {
          id: makeId('scale_area_c'),
          type: 'choice',
          q: `若將長方形的長和寬都放大為原來的 ${mult} 倍，新圖形的「面積」會變成原本的幾倍？`,
          options: [`${areaMult} 倍`, `${mult} 倍`, `${mult * 2} 倍`, `${areaMult * 2} 倍`].sort(() => Math.random() - 0.5),
          a: `${areaMult} 倍`,
          hint: `💡 提示：面積 = 長 × 寬，長放大 ${mult} 倍且寬也放大 ${mult} 倍，面積放大 ${mult} × ${mult} 倍。`,
          explanation: `📝 詳解：\n邊長放大 ${mult} 倍，面積放大 ${mult}² = ${areaMult} 倍。`
        };
      },
      // 10-8 影長與樹高測量
      () => {
        const stickH = 1, stickS = 2, treeS = 10;
        const treeH = (treeS * stickH) / stickS;
        return {
          id: makeId('shadow_prob'),
          type: 'input',
          q: `同一時間在陽光下，高 1 公尺的竹竿，影長為 2 公尺。測得旁邊一棵大樹的影長是 10 公尺，這棵大樹的實際高度是幾公尺？`,
          a: String(treeH),
          hint: `💡 提示：同一時間高度與影長成正比：竹竿高 : 竿影 = 樹高 : 樹影。`,
          explanation: `📝 詳解：\n樹影是竿影的 10 ÷ 2 = 5 倍，因此大樹高度 = 1 × 5 = 5 公尺。`
        };
      },
      // 10-9 放大後面積計算
      () => {
        const origArea = 10, mult = 2;
        const newArea = origArea * mult * mult;
        return {
          id: makeId('scale_calc_area'),
          type: 'input',
          q: `三角形原面積為 ${origArea} 平方公分，若將底和高都放大為原來的 ${mult} 倍，放大後的三角形面積是多少平方公分？`,
          a: String(newArea),
          hint: `💡 提示：底放大 ${mult} 倍，高放大 ${mult} 倍，面積變為原來的 ${mult * mult} 倍。`,
          explanation: `📝 詳解：\n新面積 = 原面積 × ${mult}² = ${origArea} × 4 = ${newArea} 平方公分。`
        };
      },
      // 10-10 比例尺判讀實際面積
      () => {
        const mapL = 2, mapW = 1;
        const realL = mapL * 10, realW = mapW * 10;
        const area = realL * realW;
        return {
          id: makeId('map_area_calc'),
          type: 'input',
          q: `比例尺 1 : 1000 的地圖上（1 公分代表 10 公尺），一塊長方形土地在地圖上長 ${mapL} 公分、寬 ${mapW} 公分。這塊土地實際面積是幾「平方公尺」？`,
          a: String(area),
          hint: `💡 提示：先分別求出實際的長與寬（公尺），再相乘求實際面積。`,
          explanation: `📝 詳解：\n實際長 = ${mapL} × 10 = ${realL} 公尺，實際寬 = ${mapW} × 10 = ${realW} 公尺。實際面積 = ${realL} × ${realW} = ${area} 平方公尺。`
        };
      }
    ],
    competency: [
      // 10-11 【房屋住宅建築藍圖】
      () => {
        const mapL = 5, mapW = 4;
        // scale 1:100 => 1 cm = 1 m => 5m * 4m = 20 m²
        return {
          id: makeId('floor_plan_area'),
          scenarioTag: '【室內裝修空間規劃】',
          type: 'input',
          q: `【室內裝修空間規劃】在比例尺 1 : 100 的房屋室內設計藍圖上，主臥室是一個長 ${mapL} 公分、寬 ${mapW} 公分的長方形。請問這間主臥室實際的地面面積是多少「平方公尺」？`,
          a: "20",
          hint: `💡 提示：比例尺 1 : 100 代表圖上 1 公分等於實際 100 公分 (1 公尺)。先求出實際長與寬（公尺），再計算實際面積。`,
          explanation: `📝 詳解：\n1. 實際長 = ${mapL} × 100 公分 = ${mapL} 公尺。\n2. 實際寬 = ${mapW} × 100 公分 = ${mapW} 公尺。\n3. 實際地面面積 = ${mapL} × ${mapW} = 20 平方公尺。`
        };
      },
      // 10-12 【登山地圖步行預估】
      () => {
        const mapCm = 8;
        // scale 1:50000 => 8 * 50000 = 400000 cm = 4 km
        // walking speed = 2 km/h => 4 / 2 = 2 hours
        return {
          id: makeId('hiking_map_time'),
          scenarioTag: '【國家公園登山健行】',
          type: 'input',
          q: `【國家公園登山健行】在比例尺 1 : 50000 的國家公園地圖上，一條登山步道量得長度為 ${mapCm} 公分。若登山隊伍平均每小時步行 2 公里，走完這條步道實際需要幾小時？`,
          a: "2",
          hint: `💡 提示：1. 先算出實際距離（公分 ➔ 公里，1 公里 = 100,000 公分）。2. 距離 ÷ 步行時速 = 預估健行時間。`,
          explanation: `📝 詳解：\n1. 實際距離 = ${mapCm} × 50,000 = 400,000 公分 = 4 公里。\n2. 步行時間 = 4 ÷ 2 = 2 小時。`
        };
      },
      // 10-13 【無人機空拍農田灌溉水】
      () => {
        const mapL = 5, mapW = 3;
        // scale 1:2000 => 1cm = 20m => L = 100m, W = 60m => Area = 6000 m²
        // per 100 m² needs 2 units => 6000/100 * 2 = 120 units
        const realArea = (mapL * 20) * (mapW * 20); // 6000
        const water = (realArea / 100) * 2; // 120
        return {
          id: makeId('drone_farm_survey'),
          scenarioTag: '【無人機智慧農業科技】',
          type: 'input',
          q: `【無人機智慧農業科技】空拍無人機以比例尺 1 : 2000 拍攝有機蔬菜農田，農田在照片上呈現長 ${mapL} 公分、寬 ${mapW} 公分的長方形。農場每 100 平方公尺農地需施灌 2 度有機營養水，整片農田一次灌溉共需多少度水？`,
          a: String(water),
          hint: `💡 提示：比例尺 1 : 2000 代表圖上 1 公分等於實際 20 公尺。先算出農田實際長與寬（公尺），求出總面積後計算所需水度數。`,
          explanation: `📝 詳解：\n1. 實際長 = ${mapL} × 20 = 100 公尺，實際寬 = ${mapW} × 20 = 60 公尺。\n2. 實際面積 = 100 × 60 = 6000 平方公尺。\n3. 所需水量 = (6000 ÷ 100) × 2 = 120 度水。`
        };
      }
    ]
  }),

  // 11. 統計圖表與圓形圖
  charts: createTieredTopic({
    easy: [
      // 11-1 百分率換算圓心角
      () => {
        const pct = randomChoice([10, 20, 25, 50]);
        const deg = pct * 3.6;
        return {
          id: makeId('pct_to_deg'),
          type: 'input',
          q: `圓形百分率圖中，某個項目占了整體的 ${pct}%，它所對應的扇形「圓心角」是多少度？`,
          a: String(deg),
          hint: `💡 提示：整個圓是 360 度 (代表 100%)，每一百分率 (1%) 代表 3.6 度。`,
          explanation: `📝 詳解：\n圓心角 = 360° × (${pct} ÷ 100) = ${deg} 度。`
        };
      },
      // 11-2 圓心角換算百分率
      () => {
        return {
          id: makeId('deg_to_pct'),
          type: 'input',
          q: `圓形圖中，某扇形的圓心角為 90 度，請問此項目占整體的百分率是多少 %？ (請填數值，如 25)`,
          a: "25",
          hint: `💡 提示：百分率 = (圓心角度數 ÷ 360) × 100%。`,
          explanation: `📝 詳解：\n(90 ÷ 360) × 100% = 1/4 × 100% = 25%。`
        };
      },
      // 11-3 百分率總和概念
      () => {
        const options = ["100%", "360%", "10%", "50%"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('pct_sum_c'),
          type: 'choice',
          q: `在繪製圓形百分率圖時，各項目所占的百分率總和必須是多少？`,
          options,
          a: "100%",
          hint: `💡 提示：全部項目加總等於整體的 100%。`,
          explanation: `📝 詳解：\n圓形百分率圖代表整體的分配，各部分百分率總和必須等於 100%。`
        };
      },
      // 11-4 折線圖趨勢走向
      () => {
        const options = ["折線往右上傾斜", "折線呈水平線", "折線往右下傾斜", "垂直向上"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('trend_line_c'),
          type: 'choice',
          q: `在氣溫隨時間變化的折線圖中，如果溫度「持續上升」，折線會呈現什麼走向？`,
          options,
          a: "折線往右上傾斜",
          hint: `💡 提示：數值隨時間增加而變大，圖形會往右上方爬升。`,
          explanation: `📝 詳解：\n數值持續增加時，折線會往右上方傾斜上升。`
        };
      },
      // 11-5 統計圖表種類選擇
      () => {
        const options = ["折線圖", "圓形圖", "長條圖", "散布圖"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('chart_type_c'),
          type: 'choice',
          q: `如果想要清楚看出某一地區一整年每個月氣溫的「連續變化趨勢」，最適合使用哪種統計圖？`,
          options,
          a: "折線圖",
          hint: `💡 提示：表現隨時間變化的連續趨勢，最適合使用折線圖。`,
          explanation: `📝 詳解：\n折線圖最能直觀展現數據隨時間的升降起伏與連續變化趨勢。`
        };
      }
    ],
    challenge: [
      // 11-6 圓形圖求實際數量
      () => {
        const total = 400, pct = 30;
        const ans = (total * pct) / 100;
        return {
          id: makeId('chart_item_cnt'),
          type: 'input',
          q: `某校六年級共有 ${total} 位學生，調查喜愛的運動圓形圖中，喜歡羽球的人數占了 ${pct}%。請問喜歡羽球的學生有幾人？`,
          a: String(ans),
          hint: `💡 提示：某項數量 = 總人數 × 該項百分率。`,
          explanation: `📝 詳解：\n人數 = ${total} × (${pct} / 100) = ${ans} 人。`
        };
      },
      // 11-7 求所占百分率
      () => {
        const total = 50, item = 15;
        const ans = (item / total) * 100;
        return {
          id: makeId('cnt_to_pct'),
          type: 'input',
          q: `班上有 ${total} 位同學，其中有 ${item} 人戴眼鏡。請問戴眼鏡同學占全班的百分率是多少 %？ (請填數值)`,
          a: String(ans),
          hint: `💡 提示：百分率 = (部分數量 ÷ 全體總數) × 100%。`,
          explanation: `📝 詳解：\n(${item} ÷ ${total}) × 100% = ${ans}%。`
        };
      },
      // 11-8 投票票數差
      () => {
        const total = 200, pA = 45, pB = 35;
        const diffCount = (total * (pA - pB)) / 100;
        return {
          id: makeId('vote_diff'),
          type: 'input',
          q: `班長選舉總有效票數為 ${total} 票。候選人 1 號得票率為 ${pA}%，2 號得票率為 ${pB}%。請問 1 號比 2 號多了幾票？`,
          a: String(diffCount),
          hint: `💡 提示：得票率差距 = ${pA}% - ${pB}% = ${pA - pB}%。差票數 = 總票數 × 差距%。`,
          explanation: `📝 詳解：\n得票率相差 ${pA - pB}%，相差票數 = ${total} × (${pA - pB} / 100) = ${diffCount} 票。`
        };
      },
      // 11-9 預算支出計算
      () => {
        const total = 30000, pct = 40;
        const ans = total * 0.4;
        return {
          id: makeId('budget_calc'),
          type: 'input',
          q: `家庭月支出預算共 ${total} 元，其中伙食費占了圓形圖中的 ${pct}%。請問伙食費預算為多少元？`,
          a: String(ans),
          hint: `💡 提示：伙食費 = 總支出 × 40%。`,
          explanation: `📝 詳解：\n${total} × 0.4 = ${ans} 元。`
        };
      },
      // 11-10 半徑與圓面積關係圖
      () => {
        const options = ["不是一條直線（不成正比）", "是一條通過原點的直線（成正比）", "是一條水平線", "是一條垂直線"].sort(() => Math.random() - 0.5);
        return {
          id: makeId('area_graph_c'),
          type: 'choice',
          q: `以圓的半徑為橫軸、圓面積為縱軸畫出的關係圖，會呈現什麼形狀？`,
          options,
          a: "不是一條直線（不成正比）",
          hint: `💡 提示：圓面積與半徑的平方成正比，與半徑本身不成正比。`,
          explanation: `📝 詳解：\n因為圓面積與半徑的平方成正比，所以關係圖呈現平滑曲線而非直線。`
        };
      }
    ],
    competency: [
      // 11-11 【家庭財務支出預算重配】
      () => {
        const total = 60000;
        // Education was 15% (9000), Entertainment was 10% (6000)
        // Entertainment cut half (down 5%), transferred to Education => Education becomes 20%
        const newEdu = total * 0.2; // 12000
        return {
          id: makeId('monthly_expense_shift'),
          scenarioTag: '【家庭財務智慧理財】',
          type: 'input',
          q: `【家庭財務智慧理財】小明家每月總預算為 ${total} 元。圓形圖顯示教育費占 15%、休閒娛樂費占 10%。父母開會決定將下個月的休閒娛樂費減半（減少 5%），並將省下的金額全數加到教育費中。請問調整後下個月的教育費預算是多少元？`,
          a: String(newEdu),
          hint: `💡 提示：教育費比例由 15% 增加 5% 變為 20%。調整後金額 = 總預算 × 20%。`,
          explanation: `📝 詳解：\n1. 休閒娛樂減少 5%，轉移至教育費：15% + 5% = 20%。\n2. 調整後教育費 = ${total} × 20% = ${newEdu} 元。`
        };
      },
      // 11-12 【校園太陽能月度發電分析】
      () => {
        const q1 = 3000;
        const q2 = q1 * 1.3; // 3900
        const totalHalfYear = q1 + q2; // 6900
        return {
          id: makeId('solar_quarter_compare'),
          scenarioTag: '【校園智慧綠能監控】',
          type: 'input',
          q: `【校園智慧綠能監控】學校屋頂太陽能板發電折線圖顯示：第一季（1~3月）總發電量為 ${q1} 度。第二季（4~6月）因日照增加，發電量比第一季「成長了 30%」。請問學校上半年（1~6月）太陽能板的總發電量是多少度？`,
          a: String(totalHalfYear),
          hint: `💡 提示：第二季發電量 = ${q1} × (1 + 0.3) = 3900 度。上半年總發電量 = 第一季 + 第二季。`,
          explanation: `📝 詳解：\n1. 第二季發電量 = ${q1} × 1.3 = ${q2} 度。\n2. 上半年總發電量 = ${q1} + ${q2} = ${totalHalfYear} 度。`
        };
      },
      // 11-13 【班級借閱大數據分析】
      () => {
        // Novel 45%, Science 25% => diff 20% = 40 books => total = 40 / 0.2 = 200 books
        return {
          id: makeId('book_reading_stat'),
          scenarioTag: '【閱讀教育借閱數據】',
          type: 'input',
          q: `【閱讀教育借閱數據】學校統計六年級喜愛書籍種類的圓形百分率圖：文學小說占 45%、科普讀物占 25%、其他類占 30%。統計發現文學小說比科普讀物多借出了 40 本。請問六年級這學期總共借出了多少本書？`,
          a: "200",
          hint: `💡 提示：百分率差距 = 45% - 25% = 20%。20% 對應 40 本書。總本數 = 40 ÷ 20%。`,
          explanation: `📝 詳解：\n1. 百分率差距 = 45% - 25% = 20% (0.2)。\n2. 總借書本數 = 40 ÷ 0.2 = 200 本。`
        };
      }
    ]
  })
};

// 依單元名稱解析對應的主題 Generators
function getGeneratorsForUnit(unit) {
  const u = String(unit || '');
  if (u.includes("因數") || u.includes("倍數") || u.includes("短除法")) {
    return TOPIC_GENERATORS.factors;
  }
  if (u.includes("分數") || u.includes("四則") || u.includes("混合運算")) {
    return TOPIC_GENERATORS.fractions;
  }
  if (u.includes("小數")) {
    return TOPIC_GENERATORS.decimals;
  }
  if ((u.includes("比") && !u.includes("比例尺")) || u.includes("關係")) {
    return TOPIC_GENERATORS.ratios;
  }
  if (u.includes("圓") && (u.includes("周長") || u.includes("面積") || u.includes("扇形"))) {
    return TOPIC_GENERATORS.circles;
  }
  if (u.includes("速率")) {
    return TOPIC_GENERATORS.speed;
  }
  if (u.includes("體積") || u.includes("柱") || u.includes("表面積")) {
    return TOPIC_GENERATORS.prisms;
  }
  if (u.includes("基準量") || u.includes("比較量")) {
    return TOPIC_GENERATORS.baseComp;
  }
  if (u.includes("解題")) {
    return TOPIC_GENERATORS.problemSolving;
  }
  if (u.includes("比例尺") || u.includes("放大") || u.includes("縮圖")) {
    return TOPIC_GENERATORS.scales;
  }
  if (u.includes("圖") || u.includes("統計")) {
    return TOPIC_GENERATORS.charts;
  }
  // 綜合回退題庫
  return TOPIC_GENERATORS.fractions;
}

// 產生單一題目（向後相容）
function generateMathQuestion(unit, index = 0) {
  const generators = getGeneratorsForUnit(unit);
  const genPool = (generators && generators.all) ? generators.all : generators;
  const gen = genPool[index % genPool.length] || genPool[0];
  const q = gen();
  q.unit = unit;
  return q;
}

// 產生整套每日練習題（支援模式：mixed 5+3+2 綜合、easy 全簡單、challenge 全挑戰、competency 全素養）
function buildDailyMathQuestions(unit, count = 10, excludeQuestionTexts = [], mode = 'mixed') {
  const topicGens = getGeneratorsForUnit(unit);
  let easyCount = 5, challengeCount = 3, competencyCount = 2;

  let chosenMode = mode;
  let targetCount = typeof count === 'number' ? count : 10;

  if (typeof count === 'object' && count !== null) {
    chosenMode = count.mode || mode;
    targetCount = count.count || 10;
    easyCount = count.easy ?? 5;
    challengeCount = count.challenge ?? 3;
    competencyCount = count.competency ?? 2;
    excludeQuestionTexts = count.excludeQuestionTexts || count.exclude || excludeQuestionTexts;
  }

  if (chosenMode === 'easy') {
    easyCount = targetCount;
    challengeCount = 0;
    competencyCount = 0;
  } else if (chosenMode === 'challenge') {
    easyCount = 0;
    challengeCount = targetCount;
    competencyCount = 0;
  } else if (chosenMode === 'competency') {
    easyCount = 0;
    challengeCount = 0;
    competencyCount = targetCount;
  } else {
    // 預設 mixed 綜合模式
    if (targetCount === 10) {
      easyCount = 5;
      challengeCount = 3;
      competencyCount = 2;
    } else {
      easyCount = Math.round(targetCount * 0.5);
      challengeCount = Math.round(targetCount * 0.3);
      competencyCount = Math.max(0, targetCount - easyCount - challengeCount);
    }
  }

  const list = [];
  const seenQuestionTexts = new Set();
  const seenIds = new Set();
  const externalExcluded = new Set(
    (Array.isArray(excludeQuestionTexts) ? excludeQuestionTexts : [])
      .map(t => typeof t === 'string' ? t.trim() : (t?.q ? String(t.q).trim() : ''))
      .filter(Boolean)
  );

  const easyPool = topicGens.easy || topicGens;
  const challengePool = topicGens.challenge || topicGens;
  const competencyPool = topicGens.competency || topicGens;
  const allPool = topicGens.all || topicGens;

  function pickTier(pool, tierTargetCount, fallbackPool) {
    if (tierTargetCount <= 0) return;
    const validPool = (Array.isArray(pool) && pool.length > 0) ? pool : fallbackPool;
    if (!validPool || validPool.length === 0) return;
    const shuffled = [...validPool].sort(() => Math.random() - 0.5);

    for (let i = 0; i < tierTargetCount; i++) {
      let gen = shuffled[i % shuffled.length];
      let q = null;
      let attempts = 0;

      while (attempts < 120) {
        const candidate = gen();
        candidate.unit = unit;
        const promptText = candidate.q.trim();

        if (!seenQuestionTexts.has(promptText) && !seenIds.has(candidate.id)) {
          if (!externalExcluded.has(promptText) || attempts >= 60) {
            q = candidate;
            break;
          }
        }
        attempts++;
        gen = shuffled[(i + attempts) % shuffled.length];
      }

      // 若原池抽滿仍未足額，以同池產生器進行輕微題號或符號標註確保同輪 0 重複且難度 100% 一致
      if (!q) {
        for (let k = 0; k < validPool.length; k++) {
          const fbGen = validPool[(i + k) % validPool.length];
          const fb = fbGen();
          fb.unit = unit;
          const marker = ` (第 ${i + 1} 題變換)`;
          const modifiedQ = fb.q.includes(' (第 ') ? fb.q : (fb.q + marker);
          if (!seenQuestionTexts.has(modifiedQ)) {
            fb.q = modifiedQ;
            fb.id = `${fb.id}_t${i}`;
            q = fb;
            break;
          }
        }
      }

      if (q) {
        seenQuestionTexts.add(q.q.trim());
        seenIds.add(q.id);
        list.push(q);
      }
    }
  }

  // 依據模式抽取：同難度模式嚴格保留自身 Pool，絕不借調其他難度題目
  if (chosenMode === 'easy') {
    pickTier(easyPool, easyCount, easyPool);
  } else if (chosenMode === 'challenge') {
    pickTier(challengePool, challengeCount, challengePool);
  } else if (chosenMode === 'competency') {
    pickTier(competencyPool, competencyCount, competencyPool);
  } else {
    pickTier(easyPool, easyCount, easyPool);
    pickTier(challengePool, challengeCount, challengePool);
    pickTier(competencyPool, competencyCount, competencyPool);
  }

  return list;
}

// 統計月曆當月彙總
function getMathCalendarTotals(history = [], year, month) {
  let completedAttempts = 0;
  let totalScore = 0;
  const targetPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const seenDates = new Set();
  for (const item of history) {
    if (typeof item.date === 'string' && item.date.startsWith(targetPrefix)) {
      completedAttempts++;
      totalScore += Number(item.score || 0);
      seenDates.add(item.date);
    }
  }

  return {
    completedAttempts,
    totalQuestions: completedAttempts * 10,
    totalScore,
    activeDays: seenDates.size
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MATH_CURRICULUM,
    gcd,
    lcm,
    simplifyFraction,
    parseMathValue,
    isAnswerCorrect,
    generateMathQuestion,
    buildDailyMathQuestions,
    getMathCalendarTotals,
    createTieredTopic,
    TOPIC_GENERATORS
  };
}
