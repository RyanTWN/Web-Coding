// ==========================================================================
// 酷學習 (Cool Learning) - 數學天地 核心邏輯模組 (math.js)
// 包含：三大版本課綱、動態題型產生器、數值容錯判定、兩次機會狀態機、日曆與錯題複習
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

  // 分數格式 a/b
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

  // 一般數值（小數或整數）
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

  // 1. 純字串完全相等（針對選擇題 A/B/C/D 或特殊文字）
  if (uStr === tStr) return true;

  // 2. 數值與分數等價比對
  const uVal = parseMathValue(uStr);
  const tVal = parseMathValue(tStr);

  if (uVal && tVal) {
    if (Math.abs(uVal.val - tVal.val) < 0.001) return true;
  }

  return false;
}

// 動態題目產生器核心
function generateMathQuestion(unit, index = 0) {
  const u = String(unit || '');
  const idPrefix = `m_${Math.random().toString(36).substring(2, 9)}`;

  // 1. 因數、倍數、質因數與短除法
  if (u.includes("因數") || u.includes("倍數") || u.includes("短除法")) {
    const subType = index % 4;
    if (subType === 0) {
      const base = Math.floor(Math.random() * 6) + 3;
      const m1 = Math.floor(Math.random() * 4) + 2;
      let m2 = Math.floor(Math.random() * 4) + 2;
      while (m1 === m2) m2 = Math.floor(Math.random() * 5) + 2;
      const num1 = base * m1;
      const num2 = base * m2;
      const ans = gcd(num1, num2);
      return {
        id: `${idPrefix}_gcd`,
        type: 'input',
        q: `求 ${num1} 和 ${num2} 的「最大公因數」？`,
        a: String(ans),
        hint: `💡 提示：可以用短除法，找出能同時整除 ${num1} 和 ${num2} 的質因數乘積。`,
        explanation: `📝 詳解：\n${num1} 與 ${num2} 同時以短除法質因數分解，左側共同質因數乘積為 ${ans}，故最大公因數為 ${ans}。`
      };
    } else if (subType === 1) {
      const n1 = (Math.floor(Math.random() * 4) + 2) * 2;
      const n2 = (Math.floor(Math.random() * 4) + 2) * 3;
      const ans = lcm(n1, n2);
      return {
        id: `${idPrefix}_lcm`,
        type: 'input',
        q: `求 ${n1} 和 ${n2} 的「最小公倍數」？`,
        a: String(ans),
        hint: `💡 提示：短除法除到兩數互質後，把左邊所有的公因數與底下的商全部相乘。`,
        explanation: `📝 詳解：\n${n1} 和 ${n2} 的最大公因數是 ${gcd(n1, n2)}，最小公倍數 = (${n1} × ${n2}) ÷ ${gcd(n1, n2)} = ${ans}。`
      };
    } else if (subType === 2) {
      const base = Math.floor(Math.random() * 4) + 4;
      const candies = base * (Math.floor(Math.random() * 5) + 3);
      const cookies = base * (Math.floor(Math.random() * 4) + 2);
      const maxPeople = gcd(candies, cookies);
      return {
        id: `${idPrefix}_candy`,
        type: 'input',
        q: `老師有軟糖 ${candies} 顆、餅乾 ${cookies} 片，想要平分給學生，每人拿到的軟糖一樣多，餅乾也一樣多。請問最多可以分給幾位學生？`,
        a: String(maxPeople),
        hint: `💡 提示：「平分且最多」代表要計算兩種零食數量的「最大公因數」。`,
        explanation: `📝 詳解：\n最多能平分的學生人數，就是 ${candies} 與 ${cookies} 的最大公因數。\ngcd(${candies}, ${cookies}) = ${maxPeople}，故最多可分給 ${maxPeople} 人。`
      };
    } else {
      const p1 = [2, 3, 5, 7][Math.floor(Math.random() * 4)];
      const p2 = [11, 13, 17][Math.floor(Math.random() * 3)];
      const val = p1 * p2;
      return {
        id: `${idPrefix}_prime`,
        type: 'choice',
        q: `數字 ${val} 的質因數分解結果是下列何者？`,
        options: [
          `${p1} × ${p2}`,
          `1 × ${val}`,
          `${p1} + ${p2}`,
          `${p1 * 2} × ${p2}`
        ].sort(() => Math.random() - 0.5),
        a: `${p1} × ${p2}`,
        hint: `💡 提示：質因數分解必須都是「質數」相乘，且乘積需等於原數。`,
        explanation: `📝 詳解：\n${p1} 與 ${p2} 皆為質數，且 ${p1} × ${p2} = ${val}，因此質因數分解寫為 ${p1} × ${p2}。`
      };
    }
  }

  // 2. 分數除法與四則計算
  if (u.includes("分數") || u.includes("四則") || u.includes("混合運算")) {
    const subType = index % 3;
    if (subType === 0) {
      const den1 = Math.floor(Math.random() * 4) + 3;
      const num1 = Math.floor(Math.random() * 3) + 1;
      const den2 = Math.floor(Math.random() * 4) + 3;
      const num2 = Math.floor(Math.random() * 3) + 1;
      const res = simplifyFraction(num1 * den2, den1 * num2);
      return {
        id: `${idPrefix}_frac_div`,
        type: 'input',
        q: `計算 (${num1}/${den1}) ÷ (${num2}/${den2}) = ？ (答案請化為最簡分數或整數，如 1/2)`,
        a: res.str,
        hint: `💡 提示：除以一個分數，等於乘以該分數的「倒數」；記得約分化為最簡分數。`,
        explanation: `📝 詳解：\n(${num1}/${den1}) ÷ (${num2}/${den2}) = (${num1}/${den1}) × (${den2}/${num2}) = ${num1 * den2}/${den1 * num2}，約分後最簡分數為 ${res.str}。`
      };
    } else if (subType === 1) {
      const intNum = Math.floor(Math.random() * 4) + 2;
      const den = Math.floor(Math.random() * 4) + 3;
      const num = Math.floor(Math.random() * 3) + 1;
      const res = simplifyFraction(intNum * den, num);
      return {
        id: `${idPrefix}_int_div_frac`,
        type: 'input',
        q: `一桶果汁有 ${intNum} 公升，如果每 (${num}/${den}) 公升裝成一杯，全部裝完可以裝成幾杯？(請化為最簡分數或整數)`,
        a: res.str,
        hint: `💡 提示：全部容量 ÷ 每杯容量 = 杯數。整數除以分數等於整數乘以分數的倒數。`,
        explanation: `📝 詳解：\n${intNum} ÷ (${num}/${den}) = ${intNum} × (${den}/${num}) = ${intNum * den}/${num} = ${res.str} 杯。`
      };
    } else {
      const a = Math.floor(Math.random() * 5) + 2;
      const b = Math.floor(Math.random() * 3) + 1;
      const c = 2;
      const ans = a + b * c;
      return {
        id: `${idPrefix}_mix`,
        type: 'choice',
        q: `計算 ${a} + ${b} × ${c} 的結果是？`,
        options: [String(ans), String((a + b) * c), String(a * c + b), String(ans + 2)].sort(() => Math.random() - 0.5),
        a: String(ans),
        hint: `💡 提示：四則混合運算法則為「先乘除，後加減」。`,
        explanation: `📝 詳解：\n依照四則運算規則先乘除後加減：${b} × ${c} = ${b * c}，再計算 ${a} + ${b * c} = ${ans}。`
      };
    }
  }

  // 3. 小數除法
  if (u.includes("小數")) {
    const divisor = (Math.floor(Math.random() * 5) + 2) / 10; // 0.2 ~ 0.6
    const quotient = (Math.floor(Math.random() * 20) + 5); // 整數商
    const dividend = Number((divisor * quotient).toFixed(2));
    return {
      id: `${idPrefix}_dec_div`,
      type: 'input',
      q: `計算 ${dividend} ÷ ${divisor} = ？`,
      a: String(quotient),
      hint: `💡 提示：將除數與被除數的小數點同時向右移動相同的位數，換算成整數相除。`,
      explanation: `📝 詳解：\n除數為 ${divisor}（一位小數），將除數與被除數同時放大 10 倍：${Math.round(dividend * 10)} ÷ ${Math.round(divisor * 10)} = ${quotient}。`
    };
  }

  // 4. 比與比值、數量關係
  if ((u.includes("比") && !u.includes("比例尺")) || u.includes("關係")) {
    const subType = index % 2;
    if (subType === 0) {
      const top = Math.floor(Math.random() * 4) + 1;
      const bottom = Math.floor(Math.random() * 4) + 2;
      const mult = Math.floor(Math.random() * 3) + 2;
      const simp = simplifyFraction(top, bottom);
      return {
        id: `${idPrefix}_ratio`,
        type: 'input',
        q: `求 ${top * mult} : ${bottom * mult} 的「最簡整數比之比值」？ (請用最簡分數表示，例如 1/2)`,
        a: simp.str,
        hint: `💡 提示：比值 = 前項 ÷ 後項。計算後記得約分化簡為最簡分數。`,
        explanation: `📝 詳解：\n比值為前項除以後項：(${top * mult}) ÷ (${bottom * mult}) = ${top * mult}/${bottom * mult}，同除以公因數 ${mult * gcd(top, bottom)} 後最簡比值為 ${simp.str}。`
      };
    } else {
      const x = Math.floor(Math.random() * 5) + 3;
      const ratioA = 2;
      const ratioB = 5;
      const valA = ratioA * x;
      const valB = ratioB * x;
      return {
        id: `${idPrefix}_ratio_x`,
        type: 'input',
        q: `若 ${ratioA} : ${ratioB} = x : ${valB}，請問 x 是多少？`,
        a: String(valA),
        hint: `💡 提示：外項乘積等於內項乘積，或利用後項放大幾倍、前項也放大幾倍來算。`,
        explanation: `📝 詳解：\n後項從 ${ratioB} 放大成 ${valB}（放大了 ${valB / ratioB} 倍），因此前項 x = ${ratioA} × ${valB / ratioB} = ${valA}。`
      };
    }
  }

  // 5. 圓周長、扇形周長、圓面積與扇形面積
  if (u.includes("圓") || u.includes("扇形")) {
    const subType = index % 3;
    if (subType === 0) {
      const r = (Math.floor(Math.random() * 4) + 2) * 5; // 10, 15, 20...
      const area = Number((r * r * 3.14).toFixed(2));
      return {
        id: `${idPrefix}_circle_area`,
        type: 'input',
        q: `半徑為 ${r} 公分的圓，面積約是多少平方公分？ (圓周率請以 3.14 計算)`,
        a: String(area),
        hint: `💡 提示：圓面積公式 = 半徑 × 半徑 × 圓周率 (3.14)。`,
        explanation: `📝 詳解：\n圓面積 = ${r} × ${r} × 3.14 = ${r * r} × 3.14 = ${area} 平方公分。`
      };
    } else if (subType === 1) {
      const d = (Math.floor(Math.random() * 4) + 2) * 2; // 直徑 4, 6, 8, 10...
      const circum = Number((d * 3.14).toFixed(2));
      return {
        id: `${idPrefix}_circle_circum`,
        type: 'input',
        q: `直徑為 ${d} 公分的圓，圓周長約是多少公分？ (圓周率請以 3.14 計算)`,
        a: String(circum),
        hint: `💡 提示：圓周長公式 = 直徑 × 圓周率 (3.14)。`,
        explanation: `📝 詳解：\n圓周長 = 直徑 × 3.14 = ${d} × 3.14 = ${circum} 公分。`
      };
    } else {
      const r = 6;
      // 90度扇形
      const arc = Number((2 * r * 3.14 * (90 / 360)).toFixed(2));
      return {
        id: `${idPrefix}_sector`,
        type: 'choice',
        q: `半徑為 ${r} 公分、圓心角為 90 度的扇形，其「弧長」約是多少公分？ (圓周率以 3.14 計)`,
        options: [String(arc), String(arc * 2), String(arc + r * 2), String(arc * 4)].sort(() => Math.random() - 0.5),
        a: String(arc),
        hint: `💡 提示：扇形弧長 = 圓周長 × (圓心角 ÷ 360度)。`,
        explanation: `📝 詳解：\n圓周長 = 2 × ${r} × 3.14 = 37.68 公分。\n圓心角 90 度占整圓的 90/360 = 1/4。\n弧長 = 37.68 × 1/4 = ${arc} 公分。`
      };
    }
  }

  // 6. 速率 (時速、分速、秒速與應用)
  if (u.includes("速率")) {
    const subType = index % 3;
    if (subType === 0) {
      const speed = (Math.floor(Math.random() * 5) + 6) * 10; // 60, 70, 80...
      const time = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
      const dist = speed * time;
      return {
        id: `${idPrefix}_speed_dist`,
        type: 'input',
        q: `高鐵時速為 ${speed} 公里，行駛了 ${time} 小時，共行駛了多少公里？`,
        a: String(dist),
        hint: `💡 提示：距離 = 速率 × 時間。`,
        explanation: `📝 詳解：\n距離 = 時速 ${speed} 公里 × 時間 ${time} 小時 = ${dist} 公里。`
      };
    } else if (subType === 1) {
      const speedKmH = 72;
      const speedMS = 20; // 72000 / 3600
      return {
        id: `${idPrefix}_speed_conv`,
        type: 'choice',
        q: `時速 72 公里相當於「秒速」多少公尺？`,
        options: ["20 公尺", "25 公尺", "12 公尺", "72 公尺"].sort(() => Math.random() - 0.5),
        a: "20 公尺",
        hint: `💡 提示：1 公里 = 1000 公尺，1 小時 = 3600 秒。換算時先乘 1000 再除以 3600。`,
        explanation: `📝 詳解：\n時速 72 公里 = 72,000 公尺/小時。\n換算成秒速：72,000 ÷ 3,600 = 20 公尺/秒。`
      };
    } else {
      const dist = 180;
      const time = 3;
      const speed = dist / time;
      return {
        id: `${idPrefix}_speed_rate`,
        type: 'input',
        q: `汽車開了 ${dist} 公里，花了 ${time} 小時，平均時速是多少公里？`,
        a: String(speed),
        hint: `💡 提示：速率 = 距離 ÷ 時間。`,
        explanation: `📝 詳解：\n平均時速 = 距離 ${dist} ÷ 時間 ${time} = ${speed} 公里/小時。`
      };
    }
  }

  // 7. 柱體體積與表面積
  if (u.includes("體積") || u.includes("柱") || u.includes("表面積")) {
    const subType = index % 2;
    if (subType === 0) {
      const length = Math.floor(Math.random() * 4) + 4;
      const width = Math.floor(Math.random() * 3) + 3;
      const height = Math.floor(Math.random() * 4) + 5;
      const vol = length * width * height;
      return {
        id: `${idPrefix}_prism_vol`,
        type: 'input',
        q: `一個長方體的長為 ${length} 公分、寬為 ${width} 公分、高為 ${height} 公分，請問其體積是多少立方公分？`,
        a: String(vol),
        hint: `💡 提示：柱體體積 = 底面積 × 高 = (長 × 寬) × 高。`,
        explanation: `📝 詳解：\n底面積 = ${length} × ${width} = ${length * width} 平方公分。\n體積 = 底面積 × 高 = ${length * width} × ${height} = ${vol} 立方公分。`
      };
    } else {
      const edge = Math.floor(Math.random() * 3) + 3;
      const surfaceArea = edge * edge * 6;
      return {
        id: `${idPrefix}_cube_surface`,
        type: 'input',
        q: `一個邊長為 ${edge} 公分的正方體，其「表面積」是多少平方公分？`,
        a: String(surfaceArea),
        hint: `💡 提示：正方體有 6 個完全相同的正方形面。表面積 = 一個面的面積 × 6。`,
        explanation: `📝 詳解：\n單一面面積 = ${edge} × ${edge} = ${edge * edge} 平方公分。\n6 個面的總表面積 = ${edge * edge} × 6 = ${surfaceArea} 平方公分。`
      };
    }
  }

  // 8. 基準量與比較量
  if (u.includes("基準量") || u.includes("比較量")) {
    const base = (Math.floor(Math.random() * 4) + 2) * 10; // 20, 30, 40...
    const multiple = (Math.floor(Math.random() * 3) + 2) / 2; // 1.5, 2, 2.5...
    const compare = Number((base * multiple).toFixed(1));
    return {
      id: `${idPrefix}_base_comp`,
      type: 'choice',
      q: `小明有 ${base} 元（基準量），小華的錢是小明的 ${multiple} 倍（比值）。請問小華有多少元（比較量）？`,
      options: [
        `${compare} 元`,
        `${Number((base + multiple).toFixed(1))} 元`,
        `${Number((base / multiple).toFixed(1))} 元`,
        `${compare + 10} 元`
      ].sort(() => Math.random() - 0.5),
      a: `${compare} 元`,
      hint: `💡 提示：比較量 = 基準量 × 比值。`,
      explanation: `📝 詳解：\n以小明的錢為基準量 (1)，小華的比較量 = 基準量 ${base} × 比值 ${multiple} = ${compare} 元。`
    };
  }

  // 9. 怎樣解題（經典應用題：雞兔同籠、年齡差、植樹、流水行船）
  if (u.includes("解題")) {
    const subType = index % 3;
    if (subType === 0) {
      // 雞兔問題
      const heads = Math.floor(Math.random() * 6) + 10;
      const rabbits = Math.floor(Math.random() * (heads - 4)) + 2;
      const chickens = heads - rabbits;
      const legs = rabbits * 4 + chickens * 2;
      return {
        id: `${idPrefix}_chick_rabbit`,
        type: 'input',
        q: `【雞兔同籠】農場裡有雞和兔子共 ${heads} 隻，數一數共有 ${legs} 隻腳。請問兔子有幾隻？`,
        a: String(rabbits),
        hint: `💡 提示：假設全部都是雞，總共會有 ${heads} × 2 隻腳，多出來的腳是因為每隻兔子比雞多 2 隻腳。`,
        explanation: `📝 詳解：\n1. 假設 ${heads} 隻全部是雞：${heads} × 2 = ${heads * 2} 隻腳。\n2. 與實際腳數差距：${legs} - ${heads * 2} = ${legs - heads * 2} 隻腳。\n3. 每隻兔子比雞多 4 - 2 = 2 隻腳。\n4. 兔子數量 = ${legs - heads * 2} ÷ 2 = ${rabbits} 隻。`
      };
    } else if (subType === 1) {
      // 年齡問題（年齡差不變）
      const diff = 24;
      const mult = 3; // 幾倍
      // son * mult = son + diff => son * (mult - 1) = diff
      const sonAge = diff / (mult - 1);
      const dadAge = sonAge + diff;
      return {
        id: `${idPrefix}_age`,
        type: 'choice',
        q: `爸爸今年 ${dadAge} 歲，兒子今年 ${sonAge} 歲。請問爸爸的年齡是兒子的幾倍？`,
        options: [`${mult} 倍`, `${mult + 1} 倍`, `${mult - 1} 倍`, "2.5 倍"].sort(() => Math.random() - 0.5),
        a: `${mult} 倍`,
        hint: `💡 提示：爸爸歲數 ÷ 兒子歲數 = 倍數。`,
        explanation: `📝 詳解：\n計算倍數：${dadAge} ÷ ${sonAge} = ${mult} 倍。`
      };
    } else {
      // 植樹問題（兩端都種）
      const trees = Math.floor(Math.random() * 5) + 6; // 6 ~ 10
      const dist = Math.floor(Math.random() * 3) + 4; // 間隔 4 ~ 6 公尺
      const totalLen = (trees - 1) * dist;
      return {
        id: `${idPrefix}_tree`,
        type: 'input',
        q: `一條長 ${totalLen} 公尺的道路，在路的一側「頭尾兩端都種樹」，每相鄰兩棵樹的間隔都是 ${dist} 公尺。請問總共種了幾棵樹？`,
        a: String(trees),
        hint: `💡 提示：頭尾都種時，樹的棵數 = 間隔數 + 1。先用總長除以間隔距離算間隔數。`,
        explanation: `📝 詳解：\n1. 間隔數 = 總長 ${totalLen} ÷ 間隔 ${dist} = ${trees - 1} 個間隔。\n2. 頭尾兩端都種樹：棵數 = 間隔數 + 1 = ${trees - 1} + 1 = ${trees} 棵。`
      };
    }
  }

  // 10. 放大圖、縮圖與比例尺
  if (u.includes("比例尺") || u.includes("放大") || u.includes("縮圖")) {
    const scale = (Math.floor(Math.random() * 4) + 2) * 1000; // 2000, 3000...
    const mapCm = Math.floor(Math.random() * 4) + 2; // 2 ~ 5 cm
    const realMeter = (scale * mapCm) / 100; // 換算成公尺
    return {
      id: `${idPrefix}_scale`,
      type: 'input',
      q: `在一張比例尺為 1 : ${scale} 的地圖上，量得甲、乙兩地的距離是 ${mapCm} 公分。請問兩地實際距離是多少「公尺」？`,
      a: String(realMeter),
      hint: `💡 提示：先算實際長度（公分），再換算為公尺（1 公尺 = 100 公分）。`,
      explanation: `📝 詳解：\n1. 實際公分 = 地圖長度 ${mapCm} × ${scale} = ${mapCm * scale} 公分。\n2. 換算為公尺：${mapCm * scale} ÷ 100 = ${realMeter} 公尺。`
    };
  }

  // 11. 統計圖表與圓形圖
  if (u.includes("圖") || u.includes("統計")) {
    const total = 100;
    const percent = [25, 35, 40][index % 3];
    const degrees = percent * 3.6;
    return {
      id: `${idPrefix}_pie`,
      type: 'choice',
      q: `圓形百分率圖中，某個項目占了全體的 ${percent}%，請問其對應的扇形「圓心角」是多少度？`,
      options: [
        `${degrees} 度`,
        `${degrees + 18} 度`,
        `${degrees - 18} 度`,
        `${percent} 度`
      ].sort(() => Math.random() - 0.5),
      a: `${degrees} 度`,
      hint: `💡 提示：整圓圓心角是 360 度，每一百分率 (1%) 對應 3.6 度 (360 ÷ 100)。`,
      explanation: `📝 詳解：\n整圓為 360 度，${percent}% 對應的角度 = 360 × (${percent} / 100) = ${degrees} 度。`
    };
  }

  // 預設保護題型（小六整數小數混合運算）
  const a = Math.floor(Math.random() * 50) + 20;
  const b = Math.floor(Math.random() * 30) + 10;
  return {
    id: `${idPrefix}_fallback`,
    type: 'input',
    q: `計算 ${a} + ${b} = ？`,
    a: String(a + b),
    hint: `💡 提示：直接進行直式加法運算。`,
    explanation: `📝 詳解：\n${a} + ${b} = ${a + b}。`
  };
}

// 產生整套每日練習題（固定 10 題）
function buildDailyMathQuestions(unit, count = 10) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push(generateMathQuestion(unit, i));
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
