/**
 * 酷學習 (Cool Learning) - LINE AI Bot「小酷」核心服務 (lineBotService.js)
 *
 * 功能範疇：
 * 1. LINE Webhook 簽章驗證 (HMAC-SHA256)
 * 2. 訊息發送與 Quick Reply 封裝 (原生 fetch，零依賴)
 * 3. 雙身分狀態機 (家長模式 / 學生模式)
 * 4. 學生專屬三大教育功能：
 *    - 🦉 蘇格拉底伴讀 (結合 Gemini + Groq 雙軌容錯)
 *    - 📝 隨堂智慧出卷 (數學、自然、成語國語)
 *    - ✍️ 即時智慧閱卷 (詳細批改、步驟推導、鼓舞叮嚀)
 * 5. 家長專屬功能：
 *    - 💳 訂閱方案與費用說明
 *    - 👶 子女綁定與管理導引
 *    - 📊 學習成效諮詢與客服支援
 */

const crypto = require('crypto');
const { callLLMWithFallback } = require('./llmService');

// 記憶體對話狀態管理 (以 userId 為鍵，具備自動過期機制)
const userSessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 2; // 2 小時有效

function getOrCreateSession(userId) {
  const now = Date.now();
  let session = userSessions.get(userId);
  if (!session || now - session.lastActiveAt > SESSION_TTL_MS) {
    session = {
      userId,
      mode: 'student', // 預設為學生模式
      currentQuiz: null, // 當前進行中的測驗卷
      chatHistory: [],
      lastActiveAt: now
    };
    userSessions.set(userId, session);
  } else {
    session.lastActiveAt = now;
  }
  return session;
}

/**
 * 驗證 LINE Webhook 簽章
 */
function verifyLineSignature(rawBody, signature, channelSecret = process.env.LINE_CHANNEL_SECRET) {
  if (!signature || !channelSecret) return false;
  try {
    const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody || '', 'utf8');
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(bodyBuffer)
      .digest('base64');
    return hash === signature;
  } catch (err) {
    console.error('[LINE/Signature] 驗證過程發生例外:', err.message);
    return false;
  }
}

/**
 * 封裝 LINE 文字訊息與快速回覆按鈕 (Quick Reply)
 */
function createTextMessage(text, quickReplies = []) {
  const msg = {
    type: 'text',
    text
  };

  if (Array.isArray(quickReplies) && quickReplies.length > 0) {
    msg.quickReply = {
      items: quickReplies.map(qr => ({
        type: 'action',
        action: {
          type: 'message',
          label: qr.label.slice(0, 20), // LINE 限制最多 20 字元
          text: qr.text
        }
      }))
    };
  }

  return msg;
}

/**
 * 依當前身分回傳預設 Quick Reply 按鈕清單
 */
function getDefaultQuickReplies(mode) {
  if (mode === 'guardian') {
    return [
      { label: '💳 訂閱方案諮詢', text: '請問訂閱方案與費用？' },
      { label: '👶 如何綁定子女', text: '家長如何綁定子女？' },
      { label: '📊 查看學習成果', text: '如何查看孩子的學習報告？' },
      { label: '🎒 切換學生模式', text: '切換學生模式' }
    ];
  }
  return [
    { label: '🦉 伴讀解惑', text: '我有題目想請教小助教' },
    { label: '📝 數學隨堂出卷', text: '出數學卷' },
    { label: '🔬 自然隨堂出卷', text: '出自然卷' },
    { label: '📖 成語隨堂出卷', text: '出成語卷' },
    { label: '👨‍👩‍👧 切換家長模式', text: '切換家長模式' }
  ];
}

/**
 * 呼叫 LINE Reply API 回覆訊息
 */
async function replyLineMessage({
  replyToken,
  messages,
  accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN,
  fetchFn = fetch
}) {
  if (!replyToken) return { success: false, error: '缺少 replyToken' };
  if (!accessToken) {
    console.warn('[LINE/Reply] 尚未配置 LINE_CHANNEL_ACCESS_TOKEN，略過發送');
    return { success: false, error: '未配置 LINE_CHANNEL_ACCESS_TOKEN' };
  }

  const payloadMessages = Array.isArray(messages) ? messages : [messages];

  try {
    const res = await fetchFn('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        replyToken,
        messages: payloadMessages
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[LINE/Reply] 失敗 HTTP ${res.status}:`, errBody);
      return { success: false, status: res.status, error: errBody };
    }

    return { success: true };
  } catch (err) {
    console.error('[LINE/Reply] 發送異常:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 家長模式客服回覆核心 (結合酷學習產品資訊與雙軌 LLM)
 */
async function handleGuardianInquiry({ session, userText }) {
  const t = userText.toLowerCase();

  // 1. 常見情境快速回覆
  if (t.includes('方案') || t.includes('費用') || t.includes('多少錢') || t.includes('價格') || t.includes('訂閱')) {
    return `👨‍👩‍👧 【酷學習家長會員方案說明】\n\n` +
      `酷學習專為國小六年級學童打造跨學科自主學習，提供高完整度的微學習體驗：\n\n` +
      `✨ 【方案亮點】：\n` +
      `1. 英語天地：每日 30 字循環與 3D 翻轉字卡、發音評量\n` +
      `2. 數學天地：110 組國小六年級核心題型、零重複隨機題庫\n` +
      `3. 自然實驗室：康軒/南一/翰林三大版本每日分層測驗\n` +
      `4. 智慧錯題本：答錯自動收錄，複習精熟自動移出\n` +
      `5. 貓頭鷹博士 AI：24 小時啟發式助教陪伴解題\n\n` +
      `📱 訂閱方式：\n` +
      `家長可透過「酷學習 App」登入家長帳號，前往【家長中心】→【訂閱方案】直接以 Google Play / Apple In-App Purchase 輕鬆訂閱！`;
  }

  if (t.includes('綁定') || t.includes('子女') || t.includes('小孩') || t.includes('座號')) {
    return `👨‍👩‍👧 【家長如何綁定子女？】\n\n` +
      `1. 下載並打開「酷學習 App」，以家長身分（Google / Apple 帳號）登入。\n` +
      `2. 點擊右上角【家長中心】→【子女管理】。\n` +
      `3. 點選「新增子女」，輸入孩子的姓名與年級，系統將為孩子自動建立專屬的「學習代碼」！\n` +
      `4. 若學校課堂已具備 5 碼班級座號，也可在後台輸入學校座號進行跨平台學習進度對接！`;
  }

  if (t.includes('報告') || t.includes('成果') || t.includes('進度') || t.includes('成績')) {
    return `📊 【如何查看孩子的學習報告？】\n\n` +
      `登入家長帳號後，您可以在【家長中心】點擊子女檔案，即時查閱：\n` +
      `• 本月每日打卡出席日曆\n` +
      `• 各學科（國語、數學、英語、自然、社會）答題正確率與練習回合\n` +
      `• 錯題本掌握度（已精熟題 vs. 待複習題）\n\n` +
      `讓您隨時掌握孩子的自主學習節奏！`;
  }

  // 2. 其它自由提問：調用 LLM 扮演酷學習專業客服顧問
  const systemPrompt = `你是一位親切、專業的「酷學習 (Cool Learning) 家長客服小顧問 - 小酷」。
產品背景：
- 酷學習是專為台灣國小六年級學童設計的自主學習網站與行動 App。
- 涵蓋五大學科（國語成語、數學、英語、自然三版本、社會）。
- 具備家長 B2C 帳號管理多名子女與查看學習歷程之功能。
- 教育理念強調「每日微學習、防挫折兩次提示、錯題本精熟複習、蘇格拉底啟發教學」。
回覆規範：
- 語氣溫暖、體貼、專業，以繁體中文（台灣用語）回覆。
- 控制在 120~200 字之間，若遇到金流或帳號異常，請提醒家長可於 App 內【意見反應】留下聯絡 Email 由專人為您服務。`;

  const llmRes = await callLLMWithFallback({
    systemPrompt,
    userPrompt: userText,
    temperature: 0.6,
    maxTokens: 350
  });

  if (llmRes.success && llmRes.text) {
    return llmRes.text;
  }

  return '您好！我是酷學習家長客服小酷 🦉。關於您的問題，歡迎隨時在下方點選功能選單，或至酷學習 App【家長中心】查閱相關設定喔！';
}

/**
 * 學生模式：智慧出卷模組 (產出 3 題國小六年級題目並記錄到 Session)
 */
async function generateQuizForStudent(subject, session) {
  let promptSubject = '國小六年級數學科';
  let unitHint = '比與比值、圓面積與扇形、速率或分數小數運算';

  if (subject === 'nature') {
    promptSubject = '國小六年級自然科學';
    unitHint = '水溶液酸鹼性質、地層與岩石、電磁鐵與電路';
  } else if (subject === 'chinese') {
    promptSubject = '國小六年級國語文與成語';
    unitHint = '國小必學成語理解、修辭判斷、字形辨析';
  }

  const systemPrompt = `你是一位專業的台灣國小出題老師。請出一份包含「3 道小題目」的隨堂測驗卷。
【學科】：${promptSubject}（單元範圍：${unitHint}）
【輸出規範】：
請嚴格以 JSON 格式回傳，格式如下：
{
  "title": "測驗卷名稱",
  "questions": [
    {
      "id": 1,
      "question": "題目描述（請給出具體數字或情境）",
      "options": ["(A)...", "(B)...", "(C)...", "(D)..."], // 若是填空題可為空陣列
      "answer": "正確答案（數字或選項）",
      "explanation": "詳細解析與思考步驟"
    }
  ]
}
注意：絕不要在 JSON 外附加任何 markdown 或文字，只輸出合法 JSON。`;

  const llmRes = await callLLMWithFallback({
    systemPrompt,
    userPrompt: `請立即生成一份難度適中、符合國小六年級課綱的 3 題測驗卷。`,
    temperature: 0.7,
    maxTokens: 600
  });

  let quizData = null;
  if (llmRes.success && llmRes.text) {
    try {
      const cleanJson = llmRes.text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      quizData = JSON.parse(cleanJson);
    } catch (_) {
      // 解析失敗時使用本機備用題庫
    }
  }

  // 本機保底題庫 (確保無 API 或解析異常時仍 100% 正常出卷)
  if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length < 3) {
    if (subject === 'nature') {
      quizData = {
        title: '六年級自然科學隨堂快測',
        questions: [
          {
            id: 1,
            question: '滴入藍色石蕊試紙會呈現「紅色」的水溶液呈現什麼性質？',
            options: ['(A) 酸性', '(B) 鹼性', '(C) 中性', '(D) 導電性'],
            answer: 'A',
            explanation: '石蕊試紙口訣「酸紅鹼藍」，讓藍色變紅色的為酸性水溶液。'
          },
          {
            id: 2,
            question: '通電的螺線管內部插入哪種金屬棒，可以大幅增強磁力？',
            options: ['(A) 鋁棒', '(B) 鐵棒', '(C) 銅棒', '(D) 塑膠棒'],
            answer: 'B',
            explanation: '鐵屬於鐵磁性材料，通電時會被磁化形成強力的電磁鐵。'
          },
          {
            id: 3,
            question: '在正常未受地殼變動翻轉的地層中，通常哪一層的年代較古老？',
            options: ['(A) 最上層', '(B) 中間層', '(C) 最下層', '(D) 無法判斷'],
            answer: 'C',
            explanation: '根據地層疊置定律，沉積岩通常由下而上依序堆疊，故下層較古老。'
          }
        ]
      };
    } else if (subject === 'chinese') {
      quizData = {
        title: '國語文與成語隨堂快測',
        questions: [
          {
            id: 1,
            question: '「臥薪嘗膽」這則成語主要形容人具備何種精神？',
            options: ['(A) 喜愛美食', '(B) 刻苦自勵，發憤圖強', '(C) 貪圖安逸', '(D) 身體虛弱'],
            answer: 'B',
            explanation: '越王勾踐臥薪嘗膽，形容刻苦自勵、立志雪恥圖強。'
          },
          {
            id: 2,
            question: '下列各組詞語中，何者「並非」相反詞？',
            options: ['(A) 井井有條／雜亂無章', '(B) 滔滔不絕／沉默寡言', '(C) 聚精會神／專心致志', '(D) 雪中送炭／落井下石'],
            answer: 'C',
            explanation: '「聚精會神」與「專心致志」為同義詞，均形容極為專注。'
          },
          {
            id: 3,
            question: '請選出用字完全正確的句子：',
            options: ['(A) 他做事總是不厭其煩', '(B) 這件事真是不可思義', '(C) 大家一定要好好珍惜光因', '(D) 請別再自暴自氣了'],
            answer: 'A',
            explanation: '不可思議、光陰、自暴自棄。故(A)為完全正確。'
          }
        ]
      };
    } else {
      quizData = {
        title: '六年級數學隨堂快測',
        questions: [
          {
            id: 1,
            question: '一個圓形水池直徑為 20 公尺，請問水池面積是多少平方公尺？（圓周率請以 3.14 計算）',
            options: [],
            answer: '314',
            explanation: '直徑 20 公尺，半徑為 10 公尺。面積＝半徑×半徑×3.14＝10×10×3.14＝314 平方公尺。'
          },
          {
            id: 2,
            question: '小明從學校騎腳踏車回家，距離 3 公里，共花了 15 分鐘，請問小明的時速是多少公里？',
            options: [],
            answer: '12',
            explanation: '15 分鐘＝0.25 小時。時速＝距離÷時間＝3÷0.25＝12 公里/時。'
          },
          {
            id: 3,
            question: '將比 15 : 25 化為最簡整數比，其比值為何？（請填寫分數或小數）',
            options: [],
            answer: '0.6',
            explanation: '15:25 前後同除以 5 得 3:5，比值為 3÷5＝3/5 或 0.6。'
          }
        ]
      };
    }
  }

  // 儲存於 Session 供後續閱卷比對
  session.currentQuiz = {
    subject,
    title: quizData.title,
    questions: quizData.questions,
    createdAt: Date.now()
  };

  let msgText = `📝 【${quizData.title}】出卷完畢！\n\n`;
  quizData.questions.forEach((q, idx) => {
    msgText += `第 ${idx + 1} 題：${q.question}\n`;
    if (q.options && q.options.length > 0) {
      msgText += `${q.options.join('  ')}\n`;
    }
    msgText += '\n';
  });

  msgText += `💡 請直接回覆你的答案（例如：『1. 314, 2. 12, 3. 0.6』或『1. A, 2. B, 3. C』），小酷小助教馬上為你閱卷評分喔！`;
  return msgText;
}

/**
 * 學生模式：智慧閱卷模組
 */
async function gradeStudentQuiz(session, userText) {
  const quiz = session.currentQuiz;
  if (!quiz || !Array.isArray(quiz.questions)) return null;

  const systemPrompt = `你是一位親切、具備高度教學熱忱的台灣國小六年級教師。
現在你要為學生剛繳交的隨堂小測驗進行「批改與閱卷」。
【測驗名稱】：${quiz.title}
【原始考卷題目與標準答案】：
${JSON.stringify(quiz.questions, null, 2)}

【學生作答內容】：
"${userText}"

【閱卷任務規範】：
1. 逐題核對學生的作答與正確答案（數值與分數等價容錯，如 3/5 等價於 0.6，選項 A 等價於 (A)）。
2. 計算總分（共 3 題，每題約 33~34 分，滿分 100 分）。
3. 逐題給予批改狀態（✅ 正確 / ❌ 答錯），答錯題目請用溫暖親切的口吻指出解題關鍵步驟與易錯陷阱。
4. 結尾給予一句鼓舞人心的學習叮嚀。
5. 以繁體中文（台灣習慣用語）輸出，排版清晰美觀。`;

  const llmRes = await callLLMWithFallback({
    systemPrompt,
    userPrompt: '請為學生完成閱卷評分：',
    temperature: 0.5,
    maxTokens: 500
  });

  // 閱卷完成後清空當前試卷
  session.currentQuiz = null;

  if (llmRes.success && llmRes.text) {
    return `🦉 【小酷閱卷成績單出爐】\n\n${llmRes.text}`;
  }

  // 本機簡易保底閱卷
  return `🦉 【小酷隨堂閱卷完畢】\n\n` +
    `你已經完成作答囉！小助教已將你的答案記錄在學習系統中。\n` +
    `💡 參考正確答案如下：\n` +
    quiz.questions.map((q, i) => `第 ${i + 1} 題：${q.answer}（解析：${q.explanation}）`).join('\n') +
    `\n\n隨時可以再點選下方按鈕，挑戰下一份測驗喔！`;
}

/**
 * 學生模式：蘇格拉底啟發式伴讀解題 (不直接給答案)
 */
async function handleStudentCompanion({ session, userText }) {
  const systemPrompt = `你是一位專為台灣國小六年級學童設計的「酷學習 AI 貓頭鷹小助教🦉 - 小酷」。
你的核心教學原則是「蘇格拉底啟發法」：
1. 【最高禁令】：絕對不能直接給出答案、最終數字或選項！
2. 【診斷與拆解】：仔細分析學生的題目或困惑，指出解題第 1 步應該先注意什麼（如：單位換算、公式原理、觀察題幹線索）。
3. 【親切問句】：提出 1~2 個具有思考線索的啟發問句，引導孩子拿草稿紙動筆推導。
4. 【語氣風格】：幽默活潑、充滿鼓勵、繁體中文（台灣國小習慣用語），約 100~150 字。`;

  const llmRes = await callLLMWithFallback({
    systemPrompt,
    userPrompt: userText,
    temperature: 0.7,
    maxTokens: 350
  });

  if (llmRes.success && llmRes.text) {
    return `🦉 貓頭鷹小助教提點：\n\n${llmRes.text}`;
  }

  return `🦉 貓頭鷹小助教提點：\n\n` +
    `這道題目很有挑戰性喔！💡 試著先把題目中的已知條件和數字在草稿紙上圈起來。\n` +
    `想一想：這題考驗的核心觀念是什麼呢？第一步先整理單位，你一定可以自己推導出來的！`;
}

/**
 * 處理來自 LINE Webhook 的單一文字訊息事件
 */
async function processLineTextMessage({
  event,
  pool,
  fetchFn = fetch,
  accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
}) {
  const isGroupChat = event.source?.type === 'group' || event.source?.type === 'room';
  const sessionId = isGroupChat
    ? (event.source?.groupId || event.source?.roomId || 'anonymous-group')
    : (event.source?.userId || 'anonymous-user');
  const replyToken = event.replyToken;
  const rawText = String(event.message?.text || '').trim();

  if (!rawText) return;

  const session = getOrCreateSession(sessionId);

  // 群組防洗版過濾：在群組內需喚醒「@小酷」、「小酷」、「小助教」或特定指令，避免插話打擾群內成員
  let cleanText = rawText;
  let isInvoked = !isGroupChat;

  const invokePrefixRegex = /^(@?小酷|@?貓頭鷹|@?小助教)\s*[,，:：]?\s*/i;
  if (isGroupChat) {
    if (invokePrefixRegex.test(rawText)) {
      isInvoked = true;
      cleanText = rawText.replace(invokePrefixRegex, '').trim();
    } else if (rawText.startsWith('出') && rawText.includes('卷')) {
      isInvoked = true;
    } else if (rawText === '切換家長模式' || rawText === '切換學生模式' || rawText === '家長模式' || rawText === '學生模式') {
      isInvoked = true;
    } else if (session.currentQuiz) {
      isInvoked = true;
    }
  }

  // 群組內未被呼叫時保持靜音
  if (isGroupChat && !isInvoked) {
    return;
  }

  // 若群組中僅輸入「@小酷」或「小酷」而無後續內容，給予告知導引
  if (isGroupChat && !cleanText) {
    const reply = createTextMessage(
      '🦉 嗨！我是酷學習 AI 助教「小酷」！\n在群組中您可以隨時呼叫我：\n• 輸入「出數學卷 / 出自然卷 / 出成語卷」進行群內隨堂快測\n• 輸入「@小酷 這題怎麼算？」進行伴讀思考引導喔！',
      getDefaultQuickReplies(session.mode)
    );
    return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
  }

  // 1. 處理模式切換指令
  if (cleanText === '切換家長模式' || cleanText === '家長模式') {
    session.mode = 'guardian';
    session.currentQuiz = null; // 切換時清空未完成測驗
    const reply = createTextMessage(
      '👨‍👩‍👧 已成功切換為【家長模式】！\n我是酷學習家長客服小顧問，您可以在此查詢子女學習、訂閱方案與平台使用說明。',
      getDefaultQuickReplies('guardian')
    );
    return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
  }

  if (cleanText === '切換學生模式' || cleanText === '學生模式') {
    session.mode = 'student';
    session.currentQuiz = null;
    const reply = createTextMessage(
      '🎒 已成功切換為【學生模式】！\n我是貓頭鷹小助教小酷 🦉，準備好開始今日的微學習了嗎？你可以找我伴讀解題，或點選下方隨堂出卷測驗喔！',
      getDefaultQuickReplies('student')
    );
    return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
  }

  // 2. 學生模式：出卷指令
  if (session.mode === 'student') {
    if (cleanText === '出數學卷' || cleanText.includes('數學測驗') || cleanText === '我要測驗數學') {
      const quizText = await generateQuizForStudent('math', session);
      const reply = createTextMessage(quizText, [
        { label: '✏️ 放棄重出', text: '出數學卷' },
        { label: '🎒 切換學科', text: '出自然卷' }
      ]);
      return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
    }

    if (cleanText === '出自然卷' || cleanText.includes('自然測驗') || cleanText === '我要測驗自然') {
      const quizText = await generateQuizForStudent('nature', session);
      const reply = createTextMessage(quizText, [
        { label: '✏️ 放棄重出', text: '出自然卷' },
        { label: '🎒 切換學科', text: '出成語卷' }
      ]);
      return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
    }

    if (cleanText === '出成語卷' || cleanText.includes('成語測驗') || cleanText === '出國語卷') {
      const quizText = await generateQuizForStudent('chinese', session);
      const reply = createTextMessage(quizText, [
        { label: '✏️ 放棄重出', text: '出成語卷' },
        { label: '🎒 切換學科', text: '出數學卷' }
      ]);
      return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
    }

    // 3. 學生模式：若目前正在測驗中，且輸入了答案，觸發閱卷
    if (session.currentQuiz) {
      const isAnswering = /^[1-3一二三]\s*[\.、:]|^\s*[a-d1-9]/i.test(cleanText) || cleanText.length < 50;
      if (isAnswering) {
        const gradeText = await gradeStudentQuiz(session, cleanText);
        const reply = createTextMessage(gradeText, getDefaultQuickReplies('student'));
        return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
      }
    }

    // 4. 學生模式：一般提問或伴讀
    const companionText = await handleStudentCompanion({ session, userText: cleanText });
    const reply = createTextMessage(companionText, getDefaultQuickReplies('student'));
    return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
  }

  // 5. 家長模式：客服諮詢
  const guardianText = await handleGuardianInquiry({ session, userText: cleanText });
  const reply = createTextMessage(guardianText, getDefaultQuickReplies('guardian'));
  return replyLineMessage({ replyToken, messages: reply, accessToken, fetchFn });
}

module.exports = {
  getOrCreateSession,
  verifyLineSignature,
  createTextMessage,
  getDefaultQuickReplies,
  replyLineMessage,
  handleGuardianInquiry,
  generateQuizForStudent,
  gradeStudentQuiz,
  handleStudentCompanion,
  processLineTextMessage
};
