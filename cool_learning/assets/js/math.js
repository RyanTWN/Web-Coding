// ==========================================================================
// 酷學習 (Cool Learning) - 數學天地 核心邏輯模組 (math.js)
// 包含：三大版本課綱、高多樣性動態題庫、去重演算法、數值等價判定、兩次機會狀態機
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
// 各單元多樣化題目產生器註冊表 (每個主題均具備 10 組互不重複的獨立題型產生器)
// ==========================================================================
const TOPIC_GENERATORS = {
  // 1. 因數、倍數、質因數與短除法
  factors: [
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
    // 1-3 應用題：平分文具零食（求最大公因數）
    () => {
      const factor = randomInt(4, 8);
      const itemA = factor * randomInt(3, 6);
      const itemB = factor * randomInt(2, 5);
      const ans = gcd(itemA, itemB);
      return {
        id: makeId('gcd_candy'),
        type: 'input',
        q: `老師買了 ${itemA} 枝鉛筆和 ${itemB} 塊橡皮擦，平分給學生，每人分到的鉛筆一樣多，橡皮擦也一樣多。請問最多可以平分給幾位學生？`,
        a: String(ans),
        hint: `💡 提示：每人拿到的數量一樣多且人數要「最多」，代表求 ${itemA} 與 ${itemB} 的最大公因數。`,
        explanation: `📝 詳解：\n最多可平分的學生人數 = gcd(${itemA}, ${itemB}) = ${ans} 人。`
      };
    },
    // 1-4 應用題：發車時刻與共同週期（求最小公倍數）
    () => {
      const busA = randomInt(4, 8);
      const busB = randomInt(6, 12);
      const ans = lcm(busA, busB);
      return {
        id: makeId('lcm_bus'),
        type: 'input',
        q: `綠線公車每 ${busA} 分鐘發一班車，藍線公車每 ${busB} 分鐘發一班車。若上午 8:00 兩線公車同時發車，最少經過幾分鐘後兩線公車會「再次同時發車」？`,
        a: String(ans),
        hint: `💡 提示：同時發車的時間必須是 ${busA} 和 ${busB} 的共同倍數，最少經過的時間即為「最小公倍數」。`,
        explanation: `📝 詳解：\n${busA} 與 ${busB} 的最小公倍數為 lcm(${busA}, ${busB}) = ${ans}，故經過 ${ans} 分鐘會再次同時發車。`
      };
    },
    // 1-5 應用題：長方形鋪正方形磁磚
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
    // 1-6 概念選擇題：互質觀念
    () => {
      const pairs = [
        { a: 8, b: 9, isCoprime: true },
        { a: 15, b: 28, isCoprime: true },
        { a: 12, b: 18, isCoprime: false },
        { a: 14, b: 21, isCoprime: false }
      ];
      const correctPair = randomChoice(pairs.filter(p => p.isCoprime));
      const wrongPairs = pairs.filter(p => !p.isCoprime);
      const options = [`${correctPair.a} 和 ${correctPair.b}`, `${wrongPairs[0].a} 和 ${wrongPairs[0].b}`, `${wrongPairs[1].a} 和 ${wrongPairs[1].b}`, "10 和 25"].sort(() => Math.random() - 0.5);
      const ans = `${correctPair.a} 和 ${correctPair.b}`;
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
    // 1-7 質因數分解
    () => {
      const primes = [2, 3, 5, 7];
      const p1 = randomChoice(primes);
      const p2 = randomChoice([11, 13, 17]);
      const val = p1 * p2;
      const ans = `${p1} × ${p2}`;
      const options = [ans, `${p1} + ${p2}`, `1 × ${val}`, `${p1 * 2} × ${p2}`].sort(() => Math.random() - 0.5);
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
    // 1-8 剪正方形紙片求數量
    () => {
      const g = randomInt(3, 5);
      const m1 = randomInt(3, 5);
      const m2 = randomInt(2, 4);
      const len = g * m1, width = g * m2;
      const count = m1 * m2;
      return {
        id: makeId('paper_cut'),
        type: 'input',
        q: `一張長 ${len} 公分、寬 ${width} 公分的長方形紙板，剪成最大且大小相同的正方形紙片，完全不浪費紙張，總共可以剪成幾張正方形紙片？`,
        a: String(count),
        hint: `💡 提示：先求正方形邊長（最大公因數），再算長邊可剪幾段、寬邊可剪幾段相乘。`,
        explanation: `📝 詳解：\n1. 正方形最大邊長 = gcd(${len}, ${width}) = ${g} 公分。\n2. 長邊剪成 ${len} ÷ ${g} = ${m1} 張，寬邊剪成 ${width} ÷ ${g} = ${m2} 張。\n3. 總張數 = ${m1} × ${m2} = ${count} 張。`
      };
    },
    // 1-9 質數觀念題
    () => {
      const options = ["2 是唯一的偶數質數", "所有奇數都是質數", "1 是質數也是合數", "9 是質數"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('prime_concept'),
        type: 'choice',
        q: `關於「質數」的敘述，下列何者正確？`,
        options,
        a: "2 是唯一的偶數質數",
        hint: `💡 提示：質數大於 1 且只有 1 和自己兩個因數；2 是質數且是唯一的偶數質數。`,
        explanation: `📝 詳解：\n2 的因數只有 1 和 2，是質數且是唯一偶數質數。奇數 9 有因數 3 是合數，1 既不是質數也不是合數。`
      };
    },
    // 1-10 積木排正方形（最小公倍數）
    () => {
      const a = randomInt(4, 6);
      const b = randomInt(7, 9);
      const ans = lcm(a, b);
      return {
        id: makeId('block_lcm'),
        type: 'input',
        q: `有一種長方體積木，長 ${a} 公分、寬 ${b} 公分。如果用這種積木排成一個「最小的正方形」，這個正方形的邊長是幾公分？`,
        a: String(ans),
        hint: `💡 提示：正方形的邊長必須同時是長與寬的倍數，最小的正方形即為求「最小公倍數」。`,
        explanation: `📝 詳解：\n正方形邊長 = lcm(${a}, ${b}) = ${ans} 公分。`
      };
    }
  ],

  // 2. 分數除法與四則混合運算
  fractions: [
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
        q: `一根長 ${intNum} 公尺的繩子，每 (${num}/${den}) 公尺剪成一段，全部剪完可以剪成幾段？`,
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
        hint: `💡 提示：兩數相乘等於 1，這兩數互為倒數。分數的分子與分母上下顛倒即為倒數。`,
        explanation: `📝 詳解：\n(${num}/${den}) 的倒數就是將分子分母對調，即為 ${ans}。兩者相乘等於 1。`
      };
    },
    // 2-5 面積求邊長應用
    () => {
      const width = 2;
      const den = randomInt(3, 5);
      const num = randomInt(4, 8);
      const res = simplifyFraction(num, den * width);
      return {
        id: makeId('area_frac'),
        type: 'input',
        q: `長方形的花圃面積是 (${num}/${den}) 平方公尺，已知寬度是 ${width} 公尺，長度是多少公尺？ (請化為最簡分數)`,
        a: res.str,
        hint: `💡 提示：長方形面積 = 長 × 寬，所以長 = 面積 ÷ 寬。`,
        explanation: `📝 詳解：\n長 = (${num}/${den}) ÷ ${width} = (${num}/${den}) × (1/${width}) = ${res.str} 公尺。`
      };
    },
    // 2-6 四則混合運算先乘除後加減
    () => {
      const a = randomInt(2, 5);
      const b = 2;
      const c = 3;
      const ans = a * b + c;
      const options = [String(ans), String(a * (b + c)), String(a + b * c), String(ans + 2)].sort(() => Math.random() - 0.5);
      return {
        id: makeId('frac_mix_c'),
        type: 'choice',
        q: `計算 ${a} × ${b} + ${c} 的結果是多少？`,
        options,
        a: String(ans),
        hint: `💡 提示：四則混合運算規則為「先乘除，後加減」。`,
        explanation: `📝 詳解：\n先算乘法：${a} × ${b} = ${a * b}，再算加法：${a * b} + ${c} = ${ans}。`
      };
    },
    // 2-7 做工/工程應用題
    () => {
      const days = randomInt(4, 8);
      return {
        id: makeId('work_frac'),
        type: 'input',
        q: `修路工人每天可以修築整條公路的 (1/${days})，請問修完全部公路需要幾天？`,
        a: String(days),
        hint: `💡 提示：全工程看作 1。總天數 = 1 ÷ 每天完成比例。`,
        explanation: `📝 詳解：\n總天數 = 1 ÷ (1/${days}) = 1 × ${days} = ${days} 天。`
      };
    },
    // 2-8 帶括號運算
    () => {
      const a = 12;
      const b = 4;
      const c = 2;
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
    // 2-10 帶分數化假分數運算
    () => {
      const intPart = 2;
      const den = 3;
      const num = 1;
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

  // 3. 小數除法
  decimals: [
    // 3-1 小數除以整數
    () => {
      const divisor = randomInt(2, 6);
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
    // 3-4 單價應用題
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
    // 3-5 剪布料段數應用題
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
    // 3-6 餘數小數點觀念選擇題
    () => {
      const options = ["和被除數原本的小數點對齊", "和商的小數點對齊", "固定在最後一位", "不需要對齊"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('rem_point_c'),
        type: 'choice',
        q: `在小數直式除法算式中，算出來的「餘數」的小數點位置應該如何對齊？`,
        options,
        a: "和被除數原本的小數點對齊",
        hint: `💡 提示：小數除法中，餘數代表的是被除數剩下的部分，所以餘數小數點必須與被除數原來的小數點對齊。`,
        explanation: `📝 詳解：\n餘數是原本被除數沒除盡的部分，因此餘數的小數點必須「和被除數原本的小數點對齊」。`
      };
    },
    // 3-7 商與被除數大小關係觀念
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
    },
    // 3-8 四捨五入求商
    () => {
      const dividend = 10;
      const divisor = 3;
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
    // 3-9 汽油平均耗油量
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
    // 3-10 小數除法求整數商與餘數
    () => {
      const dividend = 7.5;
      const divisor = 2;
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

  // 4. 比與比值、數量關係
  ratios: [
    // 4-1 最簡整數比
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
    // 4-3 調配飲品比例應用題
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
    // 4-4 男女比例求人數
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
    // 4-5 正比判斷概念選擇題
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
    // 4-6 長寬比求面積
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
    // 4-7 比的前後項性質概念題
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
    // 4-8 正比表格求未知數
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
    },
    // 4-9 分數比化最簡整數比
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
    // 4-10 小數比化最簡整數比
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

  // 5. 圓周長、扇形、圓面積
  circles: [
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
    // 5-3 半徑放大面積倍數概念
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
    // 5-4 半圓周長陷阱題
    () => {
      const r = 10;
      const arc = 10 * 3.14; // 半圓弧長
      const d = 20; // 直徑
      const ans = arc + d; // 51.4
      return {
        id: makeId('semi_circle_p'),
        type: 'input',
        q: `半徑為 ${r} 公分的「半圓」，其「周長」約是多少公分？ (圓周率以 3.14 計，提示：別忘了直徑)`,
        a: String(ans),
        hint: `💡 提示：半圓周長包含「半圓弧長」加上「底部的直徑」！`,
        explanation: `📝 詳解：\n1. 半圓弧長 = 2 × ${r} × 3.14 ÷ 2 = ${arc} 公分。\n2. 加上直徑：${arc} + ${d} = ${ans} 公分。`
      };
    },
    // 5-5 90度扇形弧長
    () => {
      const r = 12;
      const arc = Number((2 * r * 3.14 * 0.25).toFixed(2));
      return {
        id: makeId('sector_arc'),
        type: 'input',
        q: `半徑為 ${r} 公分、圓心角為 90 度的扇形，其「弧長」約是多少公分？ (圓周率以 3.14 計)`,
        a: String(arc),
        hint: `💡 提示：90度占整圓的 90/360 = 1/4。扇形弧長 = 圓周長 × 1/4。`,
        explanation: `📝 詳解：\n圓周長 = 2 × ${r} × 3.14 = ${2 * r * 3.14} 公分。弧長 = ${2 * r * 3.14} × (90/360) = ${arc} 公分。`
      };
    },
    // 5-6 扇形面積計算
    () => {
      const r = 10;
      const area = Number((r * r * 3.14 * 0.25).toFixed(2));
      return {
        id: makeId('sector_area'),
        type: 'input',
        q: `半徑為 ${r} 公分、圓心角為 90 度的扇形，其「面積」約是多少平方公分？ (圓周率以 3.14 計)`,
        a: String(area),
        hint: `💡 提示：扇形面積 = 圓面積 × (圓心角 / 360)。`,
        explanation: `📝 詳解：\n整圓面積 = ${r} × ${r} × 3.14 = 314 平方公分。扇形面積 = 314 × (90/360) = ${area} 平方公分。`
      };
    },
    // 5-7 圓心角概念選擇題
    () => {
      const options = ["60 度", "90 度", "120 度", "180 度"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('sector_deg_c'),
        type: 'choice',
        q: `一個扇形的面積是同半徑圓面積的「六分之一」，請問這個扇形的圓心角是多少度？`,
        options,
        a: "60 度",
        hint: `💡 提示：整圓圓心角為 360 度，乘以 1/6。`,
        explanation: `📝 詳解：\n圓心角 = 360° × (1/6) = 60°。`
      };
    },
    // 5-8 圓周長反求直徑
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
    // 5-9 圓環面積計算
    () => {
      const rOuter = 10, rInner = 5;
      const ans = Number(((rOuter * rOuter - rInner * rInner) * 3.14).toFixed(2));
      return {
        id: makeId('ring_area'),
        type: 'input',
        q: `大圓半徑為 ${rOuter} 公分，小圓半徑為 ${rInner} 公分，兩圓同心，請問「圓環」的面積約是多少平方公分？ (圓周率以 3.14 計)`,
        a: String(ans),
        hint: `💡 提示：圓環面積 = 大圓面積 - 小圓面積 = (${rOuter}² - ${rInner}²) × 3.14。`,
        explanation: `📝 詳解：\n(${rOuter} × ${rOuter} - ${rInner} × ${rInner}) × 3.14 = (100 - 25) × 3.14 = 75 × 3.14 = ${ans} 平方公分。`
      };
    },
    // 5-10 圓周率定義觀念題
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
    }
  ],

  // 6. 速率與應用
  speed: [
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
      const time = 3;
      const dist = 210;
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
      const speed = 80;
      const dist = 240;
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
    // 6-4 時速換算為分速
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
    // 6-5 時速換算為秒速公尺
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
    // 6-6 追趕問題
    () => {
      const dist = 200; // 公尺
      const vDiff = 50; // 分速差
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
    // 6-7 相遇問題
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
    // 6-8 平均速率概念陷阱題
    () => {
      const options = ["總距離 ÷ 總時間", "兩段速率相加除以 2", "最高速率加最低速率除以 2", "距離乘以時間"].sort(() => Math.random() - 0.5),
      ans = "總距離 ÷ 總時間";
      return {
        id: makeId('avg_speed_c'),
        type: 'choice',
        q: `計算全程的「平均速率」，正確的計算方式是下列何者？`,
        options,
        a: ans,
        hint: `💡 提示：平均速率絕不能直接把不同路段的速率相加除以 2！`,
        explanation: `📝 詳解：\n平均速率定義為「總路程 ÷ 總耗時」。直接速率平均是常見錯誤。`
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
    // 6-10 時間與速率反比概念
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

  // 7. 柱體表面積與體積
  prisms: [
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
    // 7-3 正方體表面積
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
    // 7-4 三角柱體積
    () => {
      const baseL = 6, baseH = 4;
      const baseArea = (baseL * baseH) / 2; // 12
      const prismH = randomInt(5, 9);
      const vol = baseArea * prismH;
      return {
        id: makeId('tri_prism_vol'),
        type: 'input',
        q: `一個三角柱的底面是三角形（底 ${baseL} 公分、高 ${baseH} 公分），三角柱的高是 ${prismH} 公分。請問此三角柱的體積是多少立方公分？`,
        a: String(vol),
        hint: `💡 提示：柱體體積 = 底面積 × 柱高。注意三角形底面積是 (底 × 高) ÷ 2。`,
        explanation: `📝 詳解：\n1. 底面三角形面積 = (${baseL} × ${baseH}) ÷ 2 = ${baseArea} 平方公分。\n2. 柱體體積 = ${baseArea} × ${prismH} = ${vol} 立方公分。`
      };
    },
    // 7-5 圓柱體積
    () => {
      const r = 5;
      const baseArea = r * r * 3.14; // 78.5
      const h = 10;
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
    // 7-6 柱體特徵概念題
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
    // 7-7 排水法求投入物體積
    () => {
      const baseL = 10, baseW = 10;
      const rise = 2; // 水位上升 2 公分
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
    // 7-8 長方體表面積
    () => {
      const l = 5, w = 4, h = 3;
      const sa = 2 * (l * w + l * h + w * h); // 2*(20+15+12) = 94
      return {
        id: makeId('rect_prism_sa'),
        type: 'input',
        q: `一個長方體的長為 ${l} 公分、寬為 ${w} 公分、高為 ${h} 公分，其「表面積」是多少平方公分？`,
        a: String(sa),
        hint: `💡 提示：長方體表面積 = 2 × (長×寬 + 長×高 + 寬×高)。`,
        explanation: `📝 詳解：\n表面積 = 2 × (${l}×${w} + ${l}×${h} + ${w}×${h}) = 2 × (20 + 15 + 12) = ${sa} 平方公分。`
      };
    },
    // 7-9 圓柱側面展開圖形概念
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
    // 7-10 柱體體積通式概念
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

  // 8. 基準量與比較量
  baseComp: [
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
      const mult = 3;
      const comp = 90;
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
    // 8-3 母子和問題
    () => {
      const mult = 2; // 兩倍
      // brother has 1, sister has 2 => total 3 parts
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
    // 8-4 母子差問題
    () => {
      const mult = 3;
      const base = 20;
      const diff = base * (mult - 1); // 40
      return {
        id: makeId('diff_base'),
        type: 'input',
        q: `紅繩子的長度是藍繩子的 ${mult} 倍，紅繩子比藍繩子長 ${diff} 公分。請問藍繩子有多長？`,
        a: String(base),
        hint: `💡 提示：紅繩比藍繩多了 (${mult} - 1) = ${mult - 1} 份，等於 ${diff} 公分。`,
        explanation: `📝 詳解：\n相差份數 = ${mult} - 1 = ${mult - 1} 份。藍繩長度 = ${diff} ÷ ${mult - 1} = ${base} 公分。`
      };
    },
    // 8-5 加成加價
    () => {
      const cost = 200;
      const rate = 0.2; // 加兩成
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
    // 8-6 打折問題
    () => {
      const listPrice = 500;
      const discount = 0.8; // 八折
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
    // 8-7 基準量認定概念選擇題
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
    // 8-8 求比值
    () => {
      const base = 50, comp = 75;
      const ans = "1.5";
      const options = ["1.5", "0.67", "2.5", "1.25"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('calc_ratio_c'),
        type: 'choice',
        q: `已知基準量為 ${base}，比較量為 ${comp}，請問比值是多少？`,
        options,
        a: ans,
        hint: `💡 提示：比值 = 比較量 ÷ 基準量。`,
        explanation: `📝 詳解：\n比值 = ${comp} ÷ ${base} = 1.5。`
      };
    },
    // 8-9 百分比成長率
    () => {
      const lastYear = 1000;
      const thisYear = 1200;
      const ans = "20%";
      const options = ["20%", "12%", "120%", "2%"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('growth_rate_c'),
        type: 'choice',
        q: `工廠去年生產量為 ${lastYear} 輛，今年生產量增加到 ${thisYear} 輛。今年的生產量比去年「成長了幾 %」？`,
        options,
        a: ans,
        hint: `💡 提示：成長率 = (增加量 ÷ 去年基準量) × 100%。`,
        explanation: `📝 詳解：\n增加量 = ${thisYear} - ${lastYear} = 200。成長率 = (200 ÷ ${lastYear}) × 100% = 20%。`
      };
    },
    // 8-10 身高差與基準量
    () => {
      const kid = 120;
      const diff = 60;
      const dad = kid + diff;
      return {
        id: makeId('height_base'),
        type: 'input',
        q: `爸爸身高 ${dad} 公分，兒子身高 ${kid} 公分。爸爸的身高是兒子身高的幾倍？ (請以小數表示)`,
        a: "1.5",
        hint: `💡 提示：倍數 = 爸爸身高 ÷ 兒子身高。`,
        explanation: `📝 詳解：\n${dad} ÷ ${kid} = 1.5 倍。`
      };
    }
  ],

  // 9. 怎樣解題（經典應用題組）
  problemSolving: [
    // 9-1 雞兔同籠
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
    // 9-2 年齡差不變
    () => {
      const diff = 24; // 歲差固定
      const mult = 3;  // 3 倍
      // son * 3 = son + 24 => 2*son = 24 => son = 12
      const son = 12;
      const dad = son + diff;
      return {
        id: makeId('age_prob'),
        type: 'input',
        q: `爸爸今年 ${dad} 歲，兒子今年 ${son} 歲。請問爸爸的年齡是兒子的幾倍？`,
        a: String(mult),
        hint: `💡 提示：年齡倍數 = 爸爸歲數 ÷ 兒子歲數。`,
        explanation: `📝 詳解：\n${dad} ÷ ${son} = ${mult} 倍。`
      };
    },
    // 9-3 植樹問題（兩端都種）
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
    // 9-4 植樹問題（兩端都不種）
    () => {
      const dist = 5;
      const trees = 8;
      const totalLen = (trees + 1) * dist; // 45
      return {
        id: makeId('tree_neither'),
        type: 'input',
        q: `兩座大樓之間長度為 ${totalLen} 公尺，在兩大樓間種樹且「兩端都不種」，相鄰每棵樹間隔 ${dist} 公尺，共可種幾棵樹？`,
        a: String(trees),
        hint: `💡 提示：兩端都不種樹時，棵數 = 間隔數 - 1。`,
        explanation: `📝 詳解：\n1. 間隔數 = ${totalLen} ÷ ${dist} = ${trees + 1} 個。\n2. 兩端不種：棵數 = 間隔數 - 1 = ${trees + 1} - 1 = ${trees} 棵。`
      };
    },
    // 9-5 圓形封閉植樹
    () => {
      const dist = 6;
      const count = 15;
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
    // 9-6 水流順流問題
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
    // 9-7 水流逆流問題
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
    // 9-9 火車過橋問題
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
    // 9-10 火柴棒正方形規律
    () => {
      const n = 5;
      const matches = 1 + 3 * n; // 16
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

  // 10. 放大圖、縮圖與比例尺
  scales: [
    // 10-1 地圖求實際距離
    () => {
      const scale = 50000;
      const mapCm = 4;
      const realKm = (scale * mapCm) / 100000; // 2 km
      return {
        id: makeId('map_to_real'),
        type: 'input',
        q: `在一張比例尺為 1 : ${scale} 的地圖上，量得甲、乙兩地的距離是 ${mapCm} 公分。請問兩地的實際距離是多少「公里」？`,
        a: String(realKm),
        hint: `💡 提示：1 公里 = 100,000 公分。實際公分 = 地圖長度 × ${scale}。`,
        explanation: `📝 詳解：\n實際長度 = ${mapCm} × ${scale} = ${mapCm * scale} 公分 = ${realKm} 公里。`
      };
    },
    // 10-2 實際距離求地圖長度
    () => {
      const scale = 2000;
      const realM = 60;
      const realCm = realM * 100;
      const mapCm = realCm / scale; // 3 cm
      return {
        id: makeId('real_to_map'),
        type: 'input',
        q: `在比例尺 1 : ${scale} 的地圖上，一條實際長 ${realM} 公尺的街道，在地圖上畫出來的長度是幾公分？`,
        a: String(mapCm),
        hint: `💡 提示：先將 ${realM} 公尺換算成公分 (${realCm} 公分)，再除以比例尺分母 ${scale}。`,
        explanation: `📝 詳解：\n${realM} 公尺 = ${realCm} 公分。地圖長度 = ${realCm} ÷ ${scale} = ${mapCm} 公分。`
      };
    },
    // 10-3 放大圖對應角不變概念
    () => {
      const options = ["大小不變", "跟著放大 2 倍", "跟著放大 4 倍", "變成原來的一半"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('scale_angle_c'),
        type: 'choice',
        q: `將一個三角形的各邊長放大為原圖的 2 倍時，該圖形的「對應角」大小會如何變化？`,
        options,
        a: "大小不變",
        hint: `💡 提示：圖形放大或縮小，邊長會同比例縮放，但所有的對應角度維持完全不變！`,
        explanation: `📝 詳解：\n圖形縮放時形狀保持相似，對應邊成比例放大，但「對應角大小保持不變」。`
      };
    },
    // 10-4 放大圖面積平方倍概念
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
    // 10-5 比例尺表示法概念
    () => {
      const options = ["1 : 10000", "10000 : 1", "1 + 10000", "1 × 10000"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('scale_format_c'),
        type: 'choice',
        q: `地圖上 1 公分代表實際距離 100 公尺 (10000 公分)，此地圖的比例尺應記為下列何者？`,
        options,
        a: "1 : 10000",
        hint: `💡 提示：比例尺 = 地圖上的長度 : 實際上的長度（單位必須一致）。`,
        explanation: `📝 詳解：\n100 公尺 = 10,000 公分，地圖長與實際長之比為 1 : 10000。`
      };
    },
    // 10-6 縮圖邊長比
    () => {
      const orig = 20, shrink = 5;
      return {
        id: makeId('shrink_ratio'),
        type: 'choice',
        q: `原本邊長 20 公分的正方形，畫成邊長 5 公分的縮圖，這是原圖的幾分之幾縮圖？`,
        options: ["1/4", "1/2", "1/5", "1/16"].sort(() => Math.random() - 0.5),
        a: "1/4",
        hint: `💡 提示：縮圖邊長 ÷ 原圖邊長 = 5 ÷ 20。`,
        explanation: `📝 詳解：\n5 ÷ 20 = 1/4，即為原圖的 1/4 縮圖。`
      };
    },
    // 10-7 影子與樹高測量
    () => {
      const stickH = 1, stickS = 2;
      const treeS = 10;
      const treeH = (treeS * stickH) / stickS; // 5
      return {
        id: makeId('shadow_prob'),
        type: 'input',
        q: `同一時間在陽光下，高 1 公尺的竹竿，影長為 2 公尺。測得旁邊一棵大樹的影長是 10 公尺，這棵大樹的實際高度是幾公尺？`,
        a: String(treeH),
        hint: `💡 提示：同一時間高度與影長成正比：竹竿高 : 竿影 = 樹高 : 樹影。`,
        explanation: `📝 詳解：\n樹影是竿影的 10 ÷ 2 = 5 倍，因此大樹高度 = 1 × 5 = 5 公尺。`
      };
    },
    // 10-8 縮圖周長關係
    () => {
      const options = ["縮小為原來的 1/3", "縮小為原來的 1/9", "維持不變", "放大為 3 倍"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('shrink_peri_c'),
        type: 'choice',
        q: `一個圖形畫成 1/3 的縮圖後，其「周長」會如何變化？`,
        options,
        a: "縮小為原來的 1/3",
        hint: `💡 提示：周長是一維長度，與邊長縮小倍數相同。`,
        explanation: `📝 詳解：\n所有邊長縮小為 1/3，各邊相加的周長也縮小為原本的 1/3。`
      };
    },
    // 10-9 放大後面積計算
    () => {
      const origArea = 10;
      const mult = 2;
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
      const mapL = 2, mapW = 1; // cm
      // scale 1:1000 => 1cm = 10m
      const realL = mapL * 10; // 20m
      const realW = mapW * 10; // 10m
      const area = realL * realW; // 200
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

  // 11. 統計圖表與圓形圖
  charts: [
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
      const deg = 90;
      return {
        id: makeId('deg_to_pct'),
        type: 'input',
        q: `圓形圖中，某扇形的圓心角為 ${deg} 度，請問此項目占整體的百分率是多少 %？ (請填數值，如 25)`,
        a: "25",
        hint: `💡 提示：百分率 = (圓心角度數 ÷ 360) × 100%。`,
        explanation: `📝 詳解：\n(90 ÷ 360) × 100% = 1/4 × 100% = 25%。`
      };
    },
    // 11-3 求實際數量
    () => {
      const total = 400;
      const pct = 30;
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
    // 11-4 求所占百分率
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
    // 11-5 投票票數差
    () => {
      const total = 200;
      const pA = 45, pB = 35;
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
    // 11-6 百分率總和概念題
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
    // 11-7 預算支出計算
    () => {
      const total = 30000;
      const pct = 40;
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
    // 11-8 折線圖趨勢概念
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
    // 11-9 統計圖表種類選擇
    () => {
      const options = ["折線圖", "圓形圖", "長條圖", "散布圖"].sort(() => Math.random() - 0.5);
      return {
        id: makeId('chart_type_c'),
        type: 'choice',
        q: `如果想要清楚看出某一地區一整年每個月氣溫的「變化趨勢」，最適合使用哪種統計圖？`,
        options,
        a: "折線圖",
        hint: `💡 提示：表現隨時間變化的連續趨勢，最適合使用折線圖。`,
        explanation: `📝 詳解：\n折線圖最能直觀展現數據隨時間的升降起伏與連續變化趨勢。`
      };
    },
    // 11-10 半徑與圓面積關係圖判讀
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
  ]
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
  const gen = generators[index % generators.length] || generators[0];
  const q = gen();
  q.unit = unit;
  return q;
}

// 產生整套每日練習題（固定 10 題，嚴格保證題型不重複、題目文字不重複）
function buildDailyMathQuestions(unit, count = 10) {
  const generators = getGeneratorsForUnit(unit);
  // 洗牌可用的 generators，保證每輪測驗子題型順序隨機
  const shuffledGenerators = [...generators].sort(() => Math.random() - 0.5);

  const list = [];
  const seenQuestionTexts = new Set();
  const seenAnswerSignatures = new Set();

  for (let i = 0; i < count; i++) {
    // 依序挑選不同的 generator，保證同一輪 10 題具有 10 種完全相異的題型考法
    const gen = shuffledGenerators[i % shuffledGenerators.length];
    let q = null;
    let attempts = 0;

    // 重試生成，確保題目題幹與數值絕對唯一不重複
    while (attempts < 20) {
      q = gen();
      q.unit = unit;
      const signature = `${q.type}_${q.a}_${q.q.slice(0, 15)}`;
      if (!seenQuestionTexts.has(q.q) && !seenAnswerSignatures.has(signature)) {
        seenQuestionTexts.add(q.q);
        seenAnswerSignatures.add(signature);
        break;
      }
      attempts++;
    }

    list.push(q);
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
    getMathCalendarTotals
  };
}
