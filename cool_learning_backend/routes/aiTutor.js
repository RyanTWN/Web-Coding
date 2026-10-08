/**
 * 酷學習 (Cool Learning) - AI 蘇格拉底智能學科助教模組 (aiTutor.js)
 * 專為國小六年級設計，透過啟發性問答（不直接給出答案）引導學生主動思考步驟。
 * 支援 Gemini 2.5/2.0/1.5 Flash 智慧推理，並具備動態題幹教材解構的本機保底引擎。
 */
const express = require('express');

module.exports = function createAiTutorRouter({ pool }) {
  const router = express.Router();

  // 清除詳解中可能洩漏答案的敏感字眼，保留解題思維步驟
  function sanitizeExplanationForStudent(rawExp, correctAnswer = '') {
    if (!rawExp || typeof rawExp !== 'string') return '';
    let exp = rawExp.replace(/^📝\s*詳解[：:]\s*/i, '').trim();

    // 移除明確答案結尾，例如「因此最大公因數為 12」、「故選(A)」等
    if (correctAnswer) {
      const escapedAns = String(correctAnswer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      exp = exp.replace(new RegExp(`(?:因此|故|所以|答案為|即為)[^，。！？\n]*${escapedAns}[^，。！？\n]*[。！？\n]?`, 'gi'), '');
    }
    return exp.trim();
  }

  // 內建智慧啟發式規則庫（當未設定 GEMINI_API_KEY 或網路離線時的動態保底引擎）
  // 絕不重複固定罐頭文字，而是深度結合題目本身的 hint、explanation、數字與學生作答！
  function generateFallbackGuidance({
    subject = 'math',
    question = '',
    studentAnswer = '',
    correctAnswer = '',
    hint = '',
    explanation = '',
    unit = '',
    userQuery = '',
    attemptCount = 1
  }) {
    const qText = String(question || '').trim();
    const cleanExp = sanitizeExplanationForStudent(explanation, correctAnswer);
    const cleanHint = String(hint || '').replace(/^[💡📝]\s*提示[：:]\s*/, '').trim();

    // 如果學生有主動追問 (Follow-up query)
    if (userQuery && String(userQuery).trim()) {
      const qLower = userQuery.toLowerCase();
      if (qLower.includes('答案') || qLower.includes('是多少') || qLower.includes('跟我講') || qLower.includes('告訴我')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: `哈哈，貓頭鷹小助教是有教育原則的！蘇格拉底啟發法絕對不能直接洩漏答案喔！\n\n💡 不過我可以給你更精準的錦囊：${cleanHint || cleanExp || '先在草稿紙把已知的算式關係列出來。'}\n試著照這個方向動筆算算看，你一定能自己找出答案的！`,
          hintStep: '自己推導出來的答案，記憶才會最深刻喔！'
        };
      }
      if (qLower.includes('為什麼') || qLower.includes('怎麼') || qLower.includes('步驟') || qLower.includes('第一步')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: `好問題！針對你剛才問的「${userQuery}」：\n\n💡 解開這題最關鍵的第一步是：${cleanHint || cleanExp || '先把題目的已知數字與單位圈起來，確認彼此的關係。'}\n試著把數字代入這個步驟看看！`,
          hintStep: '跟著第一步走，算算看下一步會得到什麼？'
        };
      }
      return {
        title: '🦉 貓頭鷹小助教提點',
        guide: `針對你的想法「${userQuery}」：\n\n💡 回到題目的已知線索：${cleanHint || cleanExp || '仔細比對題幹給予的條件。'}\n看看你的思考方向跟這個線索有沒有吻合呢？`,
        hintStep: '靜下心重新檢驗草稿紙，你離正確答案非常接近了！'
      };
    }

    // 依學科與題材動態組合專屬思考引導
    let guideParts = [];
    let step = '';

    // 1. 如果教材題庫已有針對本題設計的專屬 Hint，優先納入核心引導
    if (cleanHint) {
      guideParts.push(`💡 本題核心思考關鍵：\n${cleanHint}`);
    } else if (cleanExp) {
      guideParts.push(`💡 解題思考方向：\n${cleanExp}`);
    } else {
      // 若教材未提供專屬提示，依學科與題型關鍵字動態給予主題思維啟發
      const qLower = qText.toLowerCase();
      if (subject === 'math') {
        if (qLower.includes('速率') || qLower.includes('時速') || qLower.includes('距離') || qLower.includes('時間')) {
          guideParts.push('💡 概念聚焦：這題考驗的是「速率、時間與距離」的關係！想一想：距離＝速率×時間，題目給了速率與時間，該如何求出距離呢？');
        } else if (qLower.includes('最大公因數') || qLower.includes('最小公倍數') || qLower.includes('短除法')) {
          guideParts.push('💡 概念聚焦：這題的核心在於「因數與倍數」！想一想：是要平分物品（找公因數），還是同步循環（找公倍數）呢？');
        } else if (qLower.includes('圓面積') || qLower.includes('扇形') || qLower.includes('圓周長') || qLower.includes('直徑') || qLower.includes('半徑')) {
          guideParts.push('💡 概念聚焦：圓形計算第一步先確認給的是「半徑」還是「直徑」！求面積需要用半徑×半徑×3.14 喔！');
        } else if (qLower.includes('體積') || qLower.includes('表面積') || qLower.includes('柱體')) {
          guideParts.push('💡 概念聚焦：柱體體積的公式是「底面積×高」，先算出底面的形狀面積是解題關鍵！');
        } else if (qLower.includes('分數') || qLower.includes('小數') || qLower.includes('除法')) {
          guideParts.push('💡 概念聚焦：運算時記得先將單位或格式統一，分數除法可轉換為乘以倒數喔！');
        } else if (qLower.includes('比值') || qLower.includes('比例尺') || qLower.includes('比')) {
          guideParts.push('💡 概念聚焦：比值的計算是前項除以後項，記得比的兩邊單位要先換算成同一單位！');
        } else {
          guideParts.push('💡 概念聚焦：仔細把題目中的已知數字與單位圈起來，想一想它們之間的算式關係！');
        }
      } else if (subject === 'nature') {
        if (qLower.includes('石蕊') || qLower.includes('酸') || qLower.includes('鹼') || qLower.includes('水溶液')) {
          guideParts.push('💡 實驗原理探索：酸鹼水溶液各有特性！想一想石蕊試紙變色的口訣：「酸性變紅、鹼性變藍」，題目中的溶液呈現什麼性質呢？');
        } else if (qLower.includes('地層') || qLower.includes('岩石') || qLower.includes('化石')) {
          guideParts.push('💡 自然觀察：回想地質形成與堆積的順序，下面的地層通常比上面的老還是年輕呢？');
        } else if (qLower.includes('電磁') || qLower.includes('電路') || qLower.includes('磁鐵')) {
          guideParts.push('💡 科學原理：通電螺線管的磁場方向如何判斷？右手螺旋定則的拇指代表什麼極呢？');
        } else {
          guideParts.push('💡 科學探究：回想自然實驗情境，找出題目要探討的操縱變因與不變量，仔細比對各選項！');
        }
      } else if (subject === 'english') {
        guideParts.push('💡 語感提點：觀察英文例句中的上下文線索，並大聲朗讀體會句意與自然發音！');
      } else {
        guideParts.push('💡 脈絡聚焦：仔細分析題幹的前後文因果關係，找尋最合乎情理的關鍵線索！');
      }
    }

    // 2. 針對學生輸入的具體錯誤答案進行反思診斷
    if (studentAnswer && studentAnswer !== '（初次卡關）') {
      guideParts.push(`🧐 檢驗你的嘗試「${studentAnswer}」：\n想一想，這個數字或選項是否有符合題目要求的單位或條件呢？回頭檢查草稿紙的算式符號是否有漏看！`);
    }

    // 3. 依據題目文本關鍵字追加步驟動作
    const qLower = qText.toLowerCase();
    if (subject === 'math') {
      if (qLower.includes('最大公因數') || qLower.includes('最小公倍數') || qLower.includes('短除法')) {
        step = '步驟：在草稿紙畫出短除法，從共同質因數 2、3 或 5 開始整除。';
      } else if (qLower.includes('速率') || qLower.includes('時速') || qLower.includes('距離') || qLower.includes('時間')) {
        step = '步驟：檢查「時間單位」（分/時）與「長度單位」（公尺/公里）是否統一。';
      } else if (qLower.includes('圓面積') || qLower.includes('扇形') || qLower.includes('圓周長')) {
        step = '步驟：確認題目給的是「半徑」還是「直徑」，再套用 3.14 公式。';
      } else if (qLower.includes('體積') || qLower.includes('表面積') || qLower.includes('柱體')) {
        step = '步驟：先算出底面積，體積＝底面積×柱高；表面積記得加上底面與側面。';
      } else if (qLower.includes('分數') || qLower.includes('小數') || qLower.includes('除法')) {
        step = '步驟：分數除法等於乘以倒數；小數除法記得先把除數化為整數。';
      } else if (qLower.includes('比值') || qLower.includes('比例尺')) {
        step = '步驟：比值＝前項÷後項，注意把兩邊的單位先換算成同一單位。';
      } else {
        step = '步驟：把題目的已知數字圈起來，列成關係等式反推求值。';
      }
    } else if (subject === 'nature') {
      step = '線索：回想自然實驗情境，找出題目要探討的操縱變因與不變量。';
    } else if (subject === 'english') {
      step = '線索：觀察英文例句中的上下文線索，並大聲朗讀體會自然發音。';
    } else {
      step = '線索：分析題幹前後文的因果關係與語氣情緒。';
    }

    if (guideParts.length === 0) {
      guideParts.push(`這道題目需要細心觀察喔！\n\n💡 試著先在草稿紙列出題目給的已知條件。\n剛剛作答的「${studentAnswer || '這個選項'}」可能在思考時漏掉了哪個線索呢？`);
    }

    return {
      title: '🦉 貓頭鷹小助教提點',
      guide: guideParts.join('\n\n'),
      hintStep: step
    };
  }

  // [POST /api/ai-tutor/guide] 取得蘇格拉底式啟發提問
  router.post('/ai-tutor/guide', async (req, res) => {
    const {
      subject = 'math',
      question = '',
      options = [],
      studentAnswer = '',
      correctAnswer = '',
      hint = '',
      explanation = '',
      unit = '',
      attemptCount = 1,
      chatHistory = [],
      userQuery = ''
    } = req.body || {};

    if (!question || String(question).trim() === '') {
      return res.status(400).json({ success: false, error: '缺少題目內容' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 若有設定 GEMINI_API_KEY，呼叫 Google Gemini API 進行真正的 LLM 智慧推理
    if (apiKey) {
      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const modelName of modelsToTry) {
        try {
          const systemPrompt = `你是一位專為台灣國小六年級學童（約11~12歲）設計的「酷學習 AI 貓頭鷹小助教🦉」。
你的教育哲學是頂尖的「蘇格拉底啟發式教學法」：
1. 【嚴格最高禁令】：絕對不能直接給出答案、最終數字計算結果或選項字母！
2. 【深度個別診斷】：請務必結合這題特定的數字、題目條件與學生填寫的錯誤答案「${studentAnswer || '尚未輸入'}」，分析學生可能在哪一步卡關或看漏了條件（例如：忘記單位換算、看錯半徑直徑、分子分母顛倒、短除法少乘因數等）。
3. 【具體啟發指引】：請提出 1~2 個帶有「這題具體數字/名詞」的啟發式問句，並告訴學生草稿紙上的第 1 步應該先做什麼。
4. 【語氣風格】：溫暖親切、幽默有趣、以繁體中文（台灣國小習慣用語）表達，絕不說教，鼓勵學童嘗試。
5. 【長度控制】：約 90~150 字，簡練有重點，包含問句與行動建議。`;

          const userPrompt = `【學科領域】：${subject}（單元主題：${unit || '六年級核心課程'}）
【當前題目】：${question}
${options && options.length > 0 ? `【選項清單】：${JSON.stringify(options)}` : ''}
【學生剛才嘗試的錯誤答案】：${studentAnswer || '（初次卡關）'}
【教材參考詳解（此為教師後台依據，嚴格保密不可直接洩漏）】：${explanation || '無'}
【教材提示要點】：${hint || '無'}
${chatHistory && chatHistory.length > 0 ? `【剛才的對話脈絡】：\n${chatHistory.map(m => `${m.role === 'user' ? '學生' : '貓頭鷹'}: ${m.text}`).join('\n')}` : ''}
${userQuery ? `【學生現在的進一步困惑】：${userQuery}` : ''}

請扮演貓頭鷹小助教，給予針對本題特定情境的啟發式引導：`;

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 350
              }
            })
          });

          if (response.ok) {
            const geminiData = await response.json();
            const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidateText && candidateText.trim()) {
              return res.json({
                success: true,
                source: `gemini-${modelName}`,
                title: '🦉 貓頭鷹 AI 助教',
                guide: candidateText.trim(),
                hintStep: '跟著小助教的引導在草稿紙上算算看，再試一次！'
              });
            }
          } else {
            const errBody = await response.text();
            console.warn(`Gemini 模型 ${modelName} 呼叫回應非 200:`, response.status, errBody);
          }
        } catch (geminiErr) {
          console.warn(`Gemini 模型 ${modelName} 呼叫異常:`, geminiErr.message);
        }
      }
    }

    // 降級為動態題幹教材解構的本機保底引擎（即使無 API key 也能針對本題詳解與 hint 產出客製引導）
    const fallback = generateFallbackGuidance({
      subject,
      question,
      studentAnswer,
      correctAnswer,
      hint,
      explanation,
      unit,
      userQuery,
      attemptCount
    });

    res.json({
      success: true,
      source: 'dynamic-pedagogical-engine',
      ...fallback
    });
  });

  return router;
};
