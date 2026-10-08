/**
 * 酷學習 (Cool Learning) - AI 蘇格拉底智能學科助教模組
 * 專為國小六年級設計，透過啟發性問答（不直接給出答案）引導學生主動思考步驟。
 */
const express = require('express');

module.exports = function createAiTutorRouter({ pool }) {
  const router = express.Router();

  // 內建智慧啟發式規則庫（當未設定 GEMINI_API_KEY 或網路離線時的降級保底機制）
  function generateFallbackGuidance({ subject, question = '', studentAnswer = '', attemptCount = 1 }) {
    const qLower = String(question).toLowerCase();

    // 依學科與題型關鍵字匹配引導思維
    if (subject === 'math' || qLower.includes('公因數') || qLower.includes('速率') || qLower.includes('比例') || qLower.includes('體積') || qLower.includes('圓面積')) {
      if (qLower.includes('公因數') || qLower.includes('公倍數')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '先別急著猜答案喔！我們可以先用「短除法」列出這兩個數字的共同質因數。\n\n💡 想想看：要找的是「能同時整除它們的最大數字」，還是「它們共同的倍數」呢？試著把質因數相乘看看！',
          hintStep: '步驟一：觀察兩個數能否同時被 2、3、5 整除。'
        };
      }
      if (qLower.includes('速率') || qLower.includes('時速') || qLower.includes('距離') || qLower.includes('時間')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '還記得速率的三兄弟三角關係嗎？\n\n💡 距離 ＝ 速率 × 時間。\n先檢查題目給的單位：時間是「小時」還是「分鐘」？距離是「公里」還是「公尺」？先統一單位再計算就不會算錯囉！',
          hintStep: '步驟一：確認「時間單位」與「速率單位」是否一致。'
        };
      }
      if (qLower.includes('圓') || qLower.includes('扇形') || qLower.includes('3.14')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '計算圓形或扇形時，最容易忘記的是「直徑」還是「半徑」喔！\n\n💡 圓面積是「半徑 × 半徑 × 3.14」，圓周長則是「直徑 × 3.14」。\n題目問的是面積還是周長？給你的線索是半徑還是直徑呢？',
          hintStep: '步驟一：先把直徑換算成半徑，再套入公式。'
        };
      }
      if (qLower.includes('柱體') || qLower.includes('表面積') || qLower.includes('體積')) {
        return {
          title: '🦉 貓頭鷹小助教提點',
          guide: '柱體體積的秘密口訣是：底面積 × 柱高！\n\n💡 如果算表面積，記得要拆成「2 個底面積 ＋ 側面積（底面周長 × 柱高）」。先在草稿紙畫出展開圖會更清楚喔！',
          hintStep: '步驟一：先算出底面底形（三角形或圓形）的面積。'
        };
      }
      return {
        title: '🦉 貓頭鷹小助教提點',
        guide: `這題的題目條件很豐富喔！\n\n💡 試著把題目裡的已知數字圈起來，列成關係算式。\n剛剛填寫的「${studentAnswer || '這個答案'}」可能在哪個步驟的單位或符號漏看了呢？再檢驗一次草稿紙！`,
        hintStep: '先列出關係式，再逐步反求未知數。'
      };
    }

    if (subject === 'nature' || qLower.includes('酸') || qLower.includes('鹼') || qLower.includes('電') || qLower.includes('水溶液') || qLower.includes('月相') || qLower.includes('動物')) {
      if (qLower.includes('水溶液') || qLower.includes('酸') || qLower.includes('鹼') || qLower.includes('石蕊')) {
        return {
          title: '🦉 貓頭鷹實驗小助教',
          guide: '回想一下自然課實驗室的情境！\n\n💡 紅色石蕊試紙變藍色代表什麼性？（口訣：藍色是鹼性，像大海一樣鹹/鹼）。\n如果是檸檬酸或醋，試紙會呈現什麼顏色呢？',
          hintStep: '實驗線索：酸性讓藍色變紅，鹼性讓紅色變藍。'
        };
      }
      if (qLower.includes('導電') || qLower.includes('電解質')) {
        return {
          title: '🦉 貓頭鷹實驗小助教',
          guide: '發光的小燈泡在提醒我們：水溶液裡有沒有帶電的離子可以移動？\n\n💡 純水本身不容易導電，但加了食鹽或醋之後呢？再想一想「糖水」會不會導電？',
          hintStep: '實驗線索：食鹽水、小蘇打水可導電；純糖水不導電。'
        };
      }
      return {
        title: '🦉 貓頭鷹實驗小助教',
        guide: '觀察自然現象時，科學家最重視「對照組與實驗變因」喔！\n\n💡 題目描述的關鍵現象是什麼？再仔細讀一次題幹中的條件提示！',
        hintStep: '從日常生活經驗聯想科學原理。'
      };
    }

    if (subject === 'english') {
      return {
        title: '🦉 貓頭鷹英語小助教',
        guide: `別氣餒！英文單字常有字根與拼音規律。\n\n💡 試著在心裡大聲朗讀這個單字的發音，觀察字母組合對應的自然發音音標（Phonics），再結合例句的上下文情境推敲字義！`,
        hintStep: '邊聽發音邊拼寫，記憶力會加倍喔！'
      };
    }

    if (subject === 'chinese' || subject === 'social') {
      return {
        title: '🦉 貓頭鷹學科小助教',
        guide: '閱讀題目的語境是解題的金鑰匙！\n\n💡 句子前後文要表達的是褒義（稱讚）還是貶義（批評）？觀察前後句的因果關係，答案就在上下文的字裡行間！',
        hintStep: '推敲語意情緒與時間脈絡。'
      };
    }

    return {
      title: '🦉 貓頭鷹小助教提點',
      guide: '好問題！做錯是學習最強大的催化劑。\n\n💡 先把題目拆解成兩個小問題，你覺得第一步應該先確認什麼線索呢？',
      hintStep: '靜下心重新審題，成功就在下一步！'
    };
  }

  // [POST /api/ai-tutor/guide] 取得蘇格拉底式啟發提問
  router.post('/ai-tutor/guide', async (req, res) => {
    const { subject = 'math', question = '', options = [], studentAnswer = '', attemptCount = 1, userQuery = '' } = req.body || {};

    if (!question || String(question).trim() === '') {
      return res.status(400).json({ success: false, error: '缺少題目內容' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // 若有設定 GEMINI_API_KEY，呼叫 Google Gemini API
    if (apiKey) {
      try {
        const systemPrompt = `你是一位專為台灣國小六年級學童（約11~12歲）設計的「酷學習 AI 貓頭鷹小助教🦉」。
你的教育哲學是「蘇格拉底啟發式教學法」：
1. 【嚴格禁止】：絕對不可以直接說出正確答案、計算結果或選項字母！
2. 【引導核心】：透過 1~2 個簡單、溫暖、有畫面感的啟發提問或思考步驟，引導學生自行推導出正確觀念。
3. 【語氣風格】：親切鼓勵、幽默有趣、使用正體中文繁體，多用正向比喻，降低學童挫折感。
4. 【輸出格式】：請直接輸出一段約 80~140 字的引導內容，包含一個「思考小問題」與一個「行動步驟提示」。`;

        const userPrompt = `學科：${subject}
題目內容：${question}
${options && options.length > 0 ? `選項清單：${JSON.stringify(options)}` : ''}
學生剛才嘗試的錯誤答案：${studentAnswer || '（初次卡關）'}
作答次數：第 ${attemptCount} 次嘗試
${userQuery ? `學生提出的困惑：${userQuery}` : ''}

請扮演貓頭鷹小助教，給予啟發性的蘇格拉底式引導，不給答案：`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
              maxOutputTokens: 300
            }
          })
        });

        if (response.ok) {
          const geminiData = await response.json();
          const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            return res.json({
              success: true,
              source: 'gemini',
              title: '🦉 貓頭鷹 AI 助教',
              guide: candidateText.trim(),
              hintStep: '跟著小助教的引導思考，再嘗試一次看看！'
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API 呼叫失敗，切換至內建啟發規則引擎:', geminiErr.message);
      }
    }

    // 降級為內建智慧啟發式規則庫
    const fallback = generateFallbackGuidance({ subject, question, studentAnswer, attemptCount });
    res.json({
      success: true,
      source: 'rule-engine',
      ...fallback
    });
  });

  return router;
};
