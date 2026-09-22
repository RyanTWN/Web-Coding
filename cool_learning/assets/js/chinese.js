// 國語文學科：三大版本課綱 20 題、成語 200 探索館、隨堂測驗評量。
// API_BASE_URL 定義於 config.js。
const DAILY_TOTAL = 20;
const ALLOWED_PUBLISHERS = ['康軒', '南一', '翰林'];
const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
let currentUser = (typeof sessionStorage !== 'undefined') ? JSON.parse(sessionStorage.getItem('g6_portal_user') || 'null') : null;
let selectedPublisher = '康軒';
let dailyState = null;
let history = [];
let todaySummary = { completedAttempts: 0, totalQuestions: 0, totalScore: 0, nextAttemptNo: 1 };
let wrongBank = [];
let calendarDate = new Date(`${todayKey}T12:00:00`);
let reviewQuestions = [];
let reviewIndex = 0;

// 成語 200 狀態管理
let idiomList = (typeof IDIOMS_200 !== 'undefined') ? IDIOMS_200 : [];
let idiomCurrentIndex = 0;
let starredIdiomIds = new Set();
let idiomFilterOnlyStarred = false;
let idiomSearchKeyword = '';
let isCardFlipped = false;
let selectedIdiomRange = { start: 1, end: 10 }; // 預設第 1 組 (1-10)，可為 null (全部 200 則)
let lastIdiomId = 1; // 記憶上次研讀停留的成語序號
let dailyIdiomHistory = []; // [{ date: '2026-09-23', viewedCount: 10, viewedIds: [1,2,...] }]
let allViewedIdiomIds = new Set(); // 累計研讀過的所有成語 ID (0~200)
let idiomCalendarDate = new Date(`${todayKey}T12:00:00`);
let idiomSyncTimer = null;

// 成語隨堂測驗狀態管理
let idiomQuizState = {
  active: false,
  questions: [],
  currentIndex: 0,
  score: 0,
  correctCount: 0,
  userAnswers: []
};

// 115 學年度國語六年級章節架構
const CURRICULUM = {
  '康軒': [
    ['[六上] 1. 心靈交響曲', ['growth_mindset', 'rhetoric_figures'], '自我成長、心情感受、字音字形與譬喻排比修辭'],
    ['[六上] 2. 土地的情懷', ['land_affection', 'text_comprehension'], '鄉土人文、寫景抒情散文、段落主旨與閱讀素養'],
    ['[六上] 3. 自然的啟示', ['nature_insight', 'grammar_clauses'], '大自然觀察、感悟哲理、因果與轉折複句辨析'],
    ['[六上] 4. 閱讀的世界', ['reading_world', 'classics_culture'], '多元閱讀、古典文學常識、文白對照與文化素養'],
    ['[六下] 1. 智慧的火花', ['wisdom_fables', 'idiom_application'], '寓言哲理、成語典故、象徵手法與為人處世智慧'],
    ['[六下] 2. 迎向挑戰', ['facing_challenges', 'argumentation'], '勇敢面對考驗、立志堅持、論說文論點與論據架構'],
    ['[六下] 3. 藝術與文化', ['arts_aesthetics', 'rhetoric_advanced'], '傳統文化遺產、書法與戲曲美學、意境品味與進階修辭']
  ],
  '南一': [
    ['[六上] 1. 走過成長', ['growth_mindset', 'text_comprehension'], '童年回憶、心理描寫細節、記敘文寫作手法與主旨'],
    ['[六上] 2. 觀察與感悟', ['nature_insight', 'rhetoric_figures'], '日常微觀、五感摹寫、擬人轉化與抒情寫作筆觸'],
    ['[六上] 3. 智慧的結晶', ['wisdom_fables', 'argumentation'], '古今智慧故事、名言佳句引用、邏輯思考與論證'],
    ['[六上] 4. 藝術的饗宴', ['arts_aesthetics', 'grammar_clauses'], '表演藝術、建築與工藝之美、複句層次與感官聯覺'],
    ['[六下] 1. 人間溫情', ['land_affection', 'rhetoric_figures'], '社會關懷、愛與奉獻、倒敘與插敘寫作技巧'],
    ['[六下] 2. 探索世界', ['reading_world', 'text_comprehension'], '多元文化采風、旅遊紀行、空間推移描寫與素養'],
    ['[六下] 3. 夢想起飛', ['facing_challenges', 'argumentation'], '生涯啟蒙、熱情實踐、演講修辭與論說文架構']
  ],
  '翰林': [
    ['[六上] 1. 探索與成長', ['growth_mindset', 'rhetoric_figures'], '探索自我、成長感悟、字音多音字辨析與修辭'],
    ['[六上] 2. 人間的溫情', ['land_affection', 'grammar_clauses'], '人情溫暖、生活動靜描寫、前後呼應結構與句型'],
    ['[六上] 3. 想像的世界', ['wisdom_fables', 'idiom_application'], '奇幻童話、寓意象徵、誇飾修辭與豐富情節鋪陳'],
    ['[六上] 4. 大自然的奧祕', ['nature_insight', 'text_comprehension'], '自然生態、科普小品、層遞修辭與閱讀理解推論'],
    ['[六下] 1. 文化的印記', ['arts_aesthetics', 'classics_culture'], '民俗節慶文化、成語由來、文史典故與文化認同'],
    ['[六下] 2. 生命的歌詠', ['land_affection', 'rhetoric_advanced'], '生命故事感動、現代詩歌律動、象徵修辭與意象'],
    ['[六下] 3. 迎向未來', ['facing_challenges', 'argumentation'], '科技時代反思、環境倫理、論說文反駁與綜合素養']
  ]
};

// 核心基礎題庫 (格式: [題幹, 正確答案, 誘答1, 誘答2, 誘答3, 解析])
const FACTS = {
  growth_mindset: [
    ['下列哪一組詞語中的「重」字，讀音前後「相同」？', '「重」整旗鼓／「重」見天日', '「重」量級／舊地「重」遊', '「重」頭開始／輕「重」緩急', '任「重」道遠／「重」蹈覆轍', '「重整旗鼓」與「重見天日」的「重」皆讀作 ㄔㄨㄥˊ（重複、再次）。'],
    ['「經過這場挫折後，他不但沒有氣餒，反而更加奮發向上。」這句話中「氣餒」的意思最接近下列何者？', '喪失勇氣與信心', '憤怒不滿', '大發雷霆', '洋洋得意', '「氣餒」指遇到挫折或困難時，失去了勇氣和鬥志。'],
    ['下列句子中，哪一個「相」字的讀音是第四聲（ㄒㄧㄤˋ）？', '伯樂「相」馬', '互相「相」愛', '情投意「相」投', '「相」親相愛', '伯樂「相」馬的「相」為審視、辨別之意，讀作第四聲 ㄒㄧㄤˋ。'],
    ['在描寫人物面對成長難題時，下列哪一個四字詞語最適合用來形容「遇事沉著，毫不慌亂」？', '泰然處之', '驚惶失措', '手足無措', '狼狽不堪', '「泰然處之」形容遇到重大變故或緊急事情時，態度鎮定安詳。'],
    ['下列文句中，哪一句「沒有」錯別字？', '只要秉持毅力，即使資質平庸也能迎頭趕上', '他做事情總是三心二意，一爆十寒', '面對長輩的諄諄教侮，我們要虛心受教', '這座建築外觀美倫美奐，令人讚嘆', 'B應為「一曝十寒」；C應為「教誨」；D應為「美輪美奐」。'],
    ['下列「」中的成語，哪一個使用「不恰當」？', '經過老師指點，他終於「吳下阿蒙」地考上好學校', '他平時苦練球技，這次奪冠可謂「水到渠成」', '面對困境，我們要抱持「鍥而不捨」的精神', '他平日「孜孜不倦」地讀書，成績名列前茅', '「吳下阿蒙」譏諷人毫無才學，不能用於考上好學校。'],
    ['「行不由徑」這則成語主要在稱讚一個人的品格如何？', '光明正大，心胸坦蕩', '思維敏捷，能言善辯', '身手矯健，動作迅速', '做事謹慎，臨深履薄', '「行不由徑」走路不走捷徑小路，比喻為人行事光明正大磊落。'],
    ['下列哪一組字在國語辭典中的部首「不相同」？', '「穎」與「頁」', '「韶」與「音」', '「韌」與「韋」', '「勘」與「力」', '「穎」的部首為「禾」部，並非「頁」部。'],
    ['在文章寫作時，若要表達「時光飛逝，歲月不饒人」，下列哪一個詞語最貼切？', '白駒過隙', '度日如年', '歷久彌新', '一日三秋', '「白駒過隙」比喻時間過得飛快，就像駿馬在縫隙前疾馳而過。'],
    ['「他做學問總是□□□□，從不肯囫圇吞棗。」空格中最適合填入哪一個成語？', '尋根究底', '走馬看花', '淺嘗輒止', '浮光掠影', '「尋根究底」指尋求根由、探究到底，與不肯囫圇吞棗文意契合。']
  ],
  rhetoric_figures: [
    ['「天上的星星像是一顆顆鑲嵌在黑絲絨上的鑽石。」這句話運用了哪一種修辭手法？', '譬喻修辭', '擬人修辭', '排比修辭', '倒反修辭', '將星星比喻為鑽石、夜空比喻為黑絲絨，並帶有喻詞「像」，屬於譬喻。'],
    ['「風兒在樹梢輕輕哼唱著催眠曲，哄著小草入睡。」這句話主要運用了哪一種修辭？', '擬人（轉化）', '誇飾修辭', '層遞修辭', '對偶修辭', '將無生命的「風」與「小草」賦予人類哼唱、入睡的情感行為，為擬人法。'],
    ['「燕子去了，有再來的時候；楊柳枯了，有再青的時候；桃花謝了，有再開的時候。」這段話主要運用了什麼修辭？', '排比修辭', '倒反修辭', '借代修辭', '感嘆修辭', '三個結構相同、語氣一致的句群排列出現，加強語勢，為典型的排比修辭。'],
    ['下列文句中，哪一句運用了「誇飾」修辭？', '這條街熱鬧非凡，擠得連一根針都插不進去', '秋風吹拂著金黃的稻穗，宛如金色的波浪', '天邊飄來了一朵白雲，優雅漫步', '失敗為成功之母，我們要再接再厲', '「連一根針都插不進去」刻意誇大擁擠程度，為誇飾修辭。'],
    ['「他雖然考了最後一名，卻自豪地說：『我今天可是拿到了壓軸大獎呢！』」這句話屬於哪種修辭？', '倒反修辭', '譬喻修辭', '映襯修辭', '層遞修辭', '正話反說、反話正說以達到諷刺或幽默效果，為倒反修辭。'],
    ['「知之者不如好之者，好之者不如樂之者。」這句話在結構上運用了什麼修辭手法？', '層遞修辭', '排比修辭', '對偶修辭', '誇飾修辭', '由淺入深、順序遞進地闡述求知的三個境界，屬於層遞修辭。'],
    ['「春天繁花似錦，夏日綠樹成蔭，秋季紅楓如火，冬夜白雪皚皚。」這句話既有對仗美感，又展現了什麼修辭？', '排比與摹寫', '頂真與雙關', '設問與倒反', '互文與誇飾', '結構勻稱排比，並透過豐富視覺詞彙描寫四季色彩景象。'],
    ['「自言自語」、「無憂無慮」、「人山人海」，這類詞語在造詞結構上屬於什麼疊字形式？', 'ABAC 式', 'AABB 式', 'ABB 式', 'AABC 式', '第 1、3 字相同，第 2、4 字不同，稱為 ABAC 式詞語。'],
    ['「他難道不知道按部就班的重要性嗎？」這種「心中已有答案，以反問口氣提出」的修辭是什麼？', '激問（反問）', '懸問（疑問）', '提問（設問）', '詰難', '激問是答案就在問題反面的設問修辭，答案顯而易見。'],
    ['「朱門酒肉臭，路有凍死骨。」杜甫這句名詩在修辭上運用了強烈的什麼手法？', '映襯（對比）', '譬喻', '擬人', '雙關', '將富貴人家的奢華與窮苦百姓的悲慘並列對比，形成強烈的映襯修辭。']
  ],
  land_affection: [
    ['臺灣早期農村常在曬穀場或三合院舉辦廟會活動，展現了什麼樣的人文情懷？', '互助合作與鄉土凝聚力', '盲目迷信與鋪張浪費', '封閉保守的排外心態', '重男輕女的宗族傳統', '鄉土文化凝聚了村民濃厚的情感，體現互助合作、敬天愛土的美德。'],
    ['作家在描摹臺灣東海岸壯麗海景時，常提到「斷崖如刀削般聳立於太平洋畔」，這指的是哪一處著名景觀？', '清水斷崖', '野柳岬角', '鵝鑾鼻鼻頭', '十分瀑布', '蘇花公路旁的清水斷崖緊臨太平洋，地勢險峻壯麗，為臺灣名景。'],
    ['「稻浪在晨曦中金黃翻滾，農夫戴著斗笠彎腰割稻。」這段文字主要透過何種感官進行描寫？', '視覺摹寫', '聽覺摹寫', '嗅覺摹寫', '味覺摹寫', '著重在金黃翻滾、斗笠、割稻等肉眼所見色彩與形貌，屬於視覺摹寫。'],
    ['文學作品中常以「綠葉對根的情意」來象徵什麼？', '遊子對故鄉土地的眷戀與感恩', '對金錢財富的無止盡追求', '植物光合作用的科學原理', '朋友之間利益交換的關係', '「落葉歸根」與「綠葉對根的情意」象徵外出遊子對故土與母體文化的依戀。'],
    ['下列哪一首唐詩最適合用來抒發「思念故鄉與遠方親人」的情懷？', '王維〈九月九日憶山東兄弟〉', '孟浩然〈春曉〉', '李白〈早發白帝城〉', '杜牧〈清明〉', '王維「獨在異鄉為異客，每逢佳節倍思親」是思鄉懷親的千古名句。'],
    ['描寫長輩對子女無私的付出時，常以「寸草春暉」為喻，此成語出自孟郊哪首詩？', '〈遊子吟〉', '〈登科後〉', '〈長恨歌〉', '〈靜夜思〉', '「誰言寸草心，報得三春暉」出自唐代詩人孟郊的〈遊子吟〉。'],
    ['在文章中適當引用鄉土俚語或俗諺，主要有什麼寫作優點？', '增加親切感與生活化底蘊', '讓文章變得艱深晦澀難懂', '拉長文章篇幅湊字數', '展示冷僻冷門的字詞知識', '俗諺富含民間生活智慧與鮮活語感，能使文字更加親切動人。'],
    ['「外婆親手醃製的醬筍，開罐時總飄散著濃醇的發酵香氣，那是童年最熟悉的滋味。」此處包含了哪些摹寫？', '嗅覺與味覺摹寫', '聽覺與觸覺摹寫', '觸覺與痛覺摹寫', '聽覺與視覺摹寫', '「發酵香氣」為嗅覺摹寫，「童年最熟悉的滋味」融入了味覺感受。'],
    ['臺灣俗諺「吃果子，拜樹頭」主要在傳達什麼道德觀念？', '飲水思源、心懷感恩', '講求效率、迅速收穫', '崇尚自然、不事農耕', '斤斤計較、錙銖必較', '「吃果子，拜樹頭」告誡人們享用成果時，要感念當初栽種付出的恩惠。'],
    ['「雨後的山嵐在翠綠的山谷間緩緩升起，宛如仙女飄舞的輕紗。」這句話的表達效果為何？', '營造靜謐出塵的朦朧意境', '表現山洪暴發的危急氣氛', '描寫烈日當空的炎熱景象', '批判空氣污染帶來的霾害', '透過山嵐與輕紗的譬喻，烘托出山林清幽秀麗的詩意美感。']
  ],
  nature_insight: [
    ['「只要用心觀察，哪怕是一隻小小的螞蟻搬家，也能啟發我們團隊合作的大道理。」這句話強調了什麼？', '格物致知的處處留心態度', '動物力量勝過人類科技', '只重視宏觀忽略微小事物', '盲目效法自然所有習性', '生活中處處有學問，細心觀察自然萬物即能領悟深刻的人生道理。'],
    ['下列文句中，哪一個成語形容人「能從極細微的徵兆看出未來的變化與危機」？', '見微知著', '掩耳盜鈴', '盲人摸象', '買櫝還珠', '「見微知著」指看見事情微小的苗頭，就能知道其本質和發展趨勢。'],
    ['「滴水穿石」這則成語在自然界現象與人生勉勵上，最具啟發性的哲理是什麼？', '持之以恆的力量遠勝於短暫的爆發力', '水比石頭更加堅硬銳利', '自然界力量不可抗拒', '做事情要速戰速決不能拖延', '一滴水的力量雖微小，但日積月累能穿透硬石，比喻恆心終能成事。'],
    ['「歲寒，然後知松柏之後彫也。」《論語》這句話藉由自然界松柏耐寒的特徵，寄託了什麼？', '君子在逆境中堅守節操的品格', '松柏植物冬季生長緩慢的科學現象', '鼓勵人們在寒冬砍伐松柏建屋', '春天百花盛開的美麗景象', '以歲暮天寒松柏不凋，比喻君子即使處於亂世逆境依然不失節操。'],
    ['下列哪一個字在文言文中常用來指稱「草木萌發的新芽」？', '萌', '落', '凋', '萎', '「萌」本義為草木發芽，引申為事物開始發生。'],
    ['「海納百川，有容乃大；壁立千仞，無欲則剛。」這副對聯勉勵我們要具備什麼樣的修養？', '包容寬廣的胸襟與剛正無私的操守', '建造寬闊大水庫匯聚雨水', '學習攀岩技巧征服崇山峻嶺', '追求龐大財富與土地', '上聯勉人像大海容納百川般寬宏大度，下聯勉人克服私欲剛直清廉。'],
    ['「春蠶到死絲方盡，蠟炬成灰淚始乾。」李商隱這句詩常被用來讚美什麼人的奉獻精神？', '辛勤育人、無私奉獻的師長', '精明能幹的商業經理人', '追求刺激的極限運動員', '善於發明專利的科技專家', '春蠶與蠟燭燃燒自我、造福他人的形象，常被比喻為老師春風化雨的奉獻。'],
    ['下列四組詞語中，何者「並非」近義關係？', '「滄海一粟」與「無足輕重」', '「拔山倒樹」與「排山倒海」', '「綠意盎然」與「生機蓬勃」', '「臨淵羨魚」與「腳踏實地」', '「臨淵羨魚」比喻徒有空想而不行動，與「腳踏實地」是反義詞。'],
    ['「山重水複疑無路，柳暗花明又一村。」陸游這句詩常被用來比喻什麼情況？', '絕處逢生，突然出現轉機與新天地', '登山迷路遇到危險', '大自然遭到嚴重破壞', '農村交通非常落後', '在似乎無路可走時峰迴路轉，突然豁然開朗迎來新希望。'],
    ['「水能載舟，亦能覆舟。」這句古訓運用了水的特性來說明什麼道理？', '事物的雙面性以及民心的重要性', '造船技術必須具備防沉浮力', '洪水來臨時必須緊急疏散', '划船運動需要極高體力', '水既能承載船隻前行也能將其掀翻，常比喻民心向背決定國家興衰。']
  ],
  grammar_clauses: [
    ['「這道題目□□看起來複雜，□□只要掌握關鍵公式便能迎刃而解。」空格中應填入哪一組關聯詞？', '雖然……但是……', '因為……所以……', '不但……而且……', '與其……不如……', '前後分句意思形成轉折對比，應選轉折關聯詞「雖然……但是……」。'],
    ['下列文句中，哪一句屬於「遞進複句」？', '他不僅學業成績優異，而且熱心公益參與志工服務', '如果明天下雨，戶外教學活動就必須延期舉行', '既然你已經答應別人，就應該說話算話', '與其在原地抱怨環境，不如主動採取改善行動', '「不僅……而且……」表示後者語意在前者的基礎上更進一步，為遞進複句。'],
    ['「只要明天天氣放晴，我們就去陽明山踏青。」這句話屬於什麼關係的複句？', '條件複句', '因果複句', '選擇複句', '並列複句', '「只要……就……」表示只要具備某項條件就會產生對應結果，為條件複句。'],
    ['下列句子中，哪一句存在「主謂搭配不當」或「語病」？', '這場精彩的演講開拓了同學們的視野與思想觀念', '在熱烈的掌聲中，獲獎代表走上講臺領取榮譽證書', '為了防止各類校園事故不再發生，學校加強了安全巡查', '透過持續的閱讀積累，他的寫作表達能力顯著提高', 'C選項「防止……不再發生」產生雙重否定矛盾，應改為「防止……再次發生」。'],
    ['「寧為玉碎，不為瓦全。」這句話在句型邏輯上屬於哪一種選擇複句？', '取捨複句', '假設複句', '因果複句', '承接複句', '「寧可……也不……」表示兩相衡量後選取前者、放棄後者，屬於取捨複句。'],
    ['「他既是我們班上的班長，也是籃球校隊的主力前鋒。」這句話屬於什麼複句？', '並列複句', '轉折複句', '遞進複句', '因果複句', '「既……也……」同時並列兩項特點或身分，無主次先後之分，為並列複句。'],
    ['「與其臨淵羨魚，不如退而結網。」這句名言的造句邏輯屬於：', '捨前取後的選擇複句', '假設複句', '承接複句', '轉折複句', '「與其……不如……」否定前項、肯定後項，為選擇取捨複句。'],
    ['下列各句中的成語，哪一句運用「最為恰當」？', '王同學演講時「口若懸河」，生動的肢體語言贏得全場喝采', '他犯了錯卻在老師面前「班門弄斧」，態度十分誠懇', '這本百科全書內容豐富，讀來真是「索然無味」', '他每天「一曝十寒」地練習琴藝，終於成了知名鋼琴家', 'A選項「口若懸河」形容能言善辯，使用完全恰當；其他選項皆有詞義矛盾。'],
    ['「因為平時做好了充分的準備，所以面對突發狀況時他才能好整以暇。」這句話屬於什麼複句？', '因果複句', '轉折複句', '遞進複句', '目的複句', '「因為……所以……」由原因推導出結果，屬於標準因果複句。'],
    ['下列標點符號的使用，哪一處最符合現代書寫規範？', '「學而時習之，不亦說乎？」孔子的這句話流傳了兩千多年。', '我最喜歡的水果有，西瓜、芒果、荔枝、香蕉等。', '他到底去哪裡了呢？我們都不知道。？', '這件事：真的很重要，大家要記住。', 'A選項雙引號、問號與句號使用規範正確。']
  ],
  reading_world: [
    ['閱讀記敘文時，通常要把握「記敘六要素」，下列何者「不屬於」這六要素？', '論點與論據', '時間與地點', '人物', '起因、經過與結果', '「論點與論據」是議論文的核心要素，並非記敘文要素。'],
    ['在閱讀長篇文章時，哪一種閱讀策略最適合用來「迅速了解全書或全文的主旨大意」？', '略讀（瀏覽目錄、小標題與首尾段）', '精讀（逐字逐句查字典註解）', '朗讀（大聲唸出每一段文字）', '背誦（反覆記憶全文句子）', '略讀著重快速掃視標題、首尾段與關鍵字，能在最短時間內掌握全貌。'],
    ['「讀一本好書，就像和許多高尚的人談話。」這句話告訴我們閱讀的主要價值在於：', '陶冶心靈、提升思想境界', '迅速背誦大量名人名言', '作為誇耀學識的工具', '消磨無聊時間的消遣', '閱讀優良書籍能使思想境界與心靈品質得到薰陶與昇華。'],
    ['在圖書館利用檢索系統找書時，最常用的三大檢索欄位通常是：', '書名、作者、關鍵字（主題）', '出版年份、頁數、定價', '字型大小、裝訂方式、封面顏色', '借閱次數、作者照片、館員姓名', '書名、作者與關鍵字主題是快速定位館藏書籍的最核心指標。'],
    ['閱讀科普文章時，遇到圖表或數據統計，最適當的閱讀方式是：', '結合文字說明比對圖表，理解其推論邏輯', '直接跳過圖表只看文字結論', '只看圖表完全不閱讀上下文說明', '將圖表所有數值默背下來', '科普文章的圖表與內文互為佐證，圖文對照才能建立完整正確的科學理解。'],
    ['「紙上得來終覺淺，絕知此事要躬行。」陸游這句名言主要勉勵讀書人要：', '將書本知識與實際行動相結合', '只靠讀書不必親自動手實踐', '多買紙張與文具寫作', '完全揚棄書本只憑直覺經驗', '書本知識固然重要，但唯有親身實踐檢驗，才能真正領會融會貫通。'],
    ['當閱讀寓言故事時，我們最應該探究的是文章的什麼層面？', '故事背後蘊含的哲理與諷喻意義', '故事中的動物到底會不會說話', '登場角色的年齡與身形大小', '故事發生所在的精確經緯度', '寓言的核心在於借事說理，重點是領會其背後深層的寓意與生活智慧。'],
    ['在評量一篇文章的「段落主旨」時，最具有指標意義的句子通常被稱為：', '主題句（通常位於段首或段尾）', '過渡句', '問句', '引述句', '主題句概括了一整個段落的核心焦點，多出現在段首開門見山或段尾總結。'],
    ['「溫故而知新，可以為師矣。」孔子這句話強調了什麼學習方法的重要性？', '複習舊知識並從中領會出新思考', '每天只學習全新未知的內容', '當老師必須記憶所有的古籍', '考試前臨時抱佛腳死記硬背', '溫習已學過的內容並能舉一反三融會貫通，是深度學習的關鍵。'],
    ['閱讀議論文時，作者用來支持自己「論點」的事實、數據或名人格言，稱為什麼？', '論據', '結論', '引言', '比喻', '「論點」是作者的主張，「論據」則是用來證明論點正確的客觀證據與理由。']
  ],
  wisdom_fables: [
    ['「守株待兔」這則寓言故事，主要在告誡人們什麼道理？', '不可心存僥倖，妄想不勞而獲', '在樹旁打獵收穫最豐富', '野兔撞樹是常見的自然現象', '遇事應當遵循古法不能變通', '守株待兔諷刺妄想不勞而獲、坐享其成的僥倖心態。'],
    ['「買櫝還珠」這則成語比喻人做事情往往：', '捨本逐末，取捨失當', '精明幹練，買賣公平', '勤儉持家，退還贈品', '珍惜友誼，互相饋贈', '買下精美木盒卻把真正珍貴的珍珠退還，比喻眼光短淺、本末倒置。'],
    ['「亡羊補牢，未為遲也。」這句話告訴我們犯錯時應當抱持什麼態度？', '及時挽救並採取補救措施，防患未然', '既然已經損失，就任由事情惡化', '責怪他人沒有幫忙看守羊群', '買更多羊隻填補空缺', '及時補正錯誤防範後續損失，為時不晚。'],
    ['「塞翁失馬，焉知非福。」這則故事主要體現了道家什麼樣的哲學思想？', '禍福相依、凡事保持樂觀豁達的心境', '養馬不如養牛羊安全', '失去財產就要立刻報官', '邊疆地區生活必定危險多變', '事情的得失禍福互相轉化，遇到挫折不必過度悲觀。'],
    ['「杞人憂天」這則成語在生活情境中，最適合用來形容哪種心理狀態？', '缺乏事實依據、毫無必要的過度擔憂', '居安思危、防患未然的謹慎規劃', '關心國家大事的愛國熱忱', '對天文學探索的濃厚興趣', '杞國人擔心天塌下來，比喻缺乏常識與根據的徒然自尋煩惱。'],
    ['「井底之蛙」故事中，青蛙見識淺陋的原因主要在於：', '生活環境狹隘且自滿自足', '天生視力不好看不清天空', '不喜歡和其他動物交朋友', '缺少攀爬井壁的工具', '長期居於井底視界受限，又自以為擁有一切，比喻見識狹隘之人。'],
    ['「刻舟求劍」的故事諷刺了哪種不合時宜的處事態度？', '拘泥固執、不知因應客觀環境變化調整', '做事精確細心、善於做記號', '擅長游泳潛水打撈寶物', '愛護工具器材的好習慣', '船已前行而劍沉江底，刻記號於船舷找劍，諷刺死板教條不察變遷。'],
    ['「南轅北轍」這則成語常用來形容：', '行動方向與心中目標完全相反', '車輛性能優良能跑南北各地', '道路四通八達交通便利', '出門遠遊沒有特定目的地', '想去南方卻駕車向北走，比喻手段與目的背道而馳。'],
    ['「鷸蚌相爭，漁翁得利。」這則寓言啟示我們在團體相處時應當：', '互相包容妥協，避免兩敗俱傷讓第三方得利', '堅持己見寸步不讓戰鬥到底', '學習漁夫捕魚的熟練技巧', '不與他人有任何合作關係', '雙方爭執互不相讓只會共同受損，最終便宜了坐收漁利的外人。'],
    ['「畫蛇添足」的故事主要告誡我們做事要：', '恰到好處，切忌多此一舉反而壞事', '豐富畫面細節使作品完美', '認真細緻對待每一個部件', '按照自己的喜好自由發揮', '蛇本無足而故意添足，比喻多此一舉，反將好事弄糟。']
  ],
  facing_challenges: [
    ['面對生活或學業上的逆境時，「臥薪嘗膽」啟發我們要具備什麼精神？', '刻苦自勵、奮發圖強的堅韌毅力', '享受舒適的起居生活條件', '遭遇失敗立刻放棄目標', '品嚐苦膽作為日常飲食養生', '越王勾踐忍辱負重、自律刻苦，終於復國，比喻艱苦奮鬥的堅毅。'],
    ['「鍥而不捨，金石可鏤。」這句名言強調了成功的哪一項關鍵特質？', '持之以恆、永不放棄的堅持態度', '金屬與石頭的雕刻技巧', '選擇容易達成的目標開始', '尋找走捷徑的巧妙方法', '只要不斷雕刻不放棄，連金石都能刻穿，比喻堅持到底的恆心。'],
    ['在遭遇重大挫折時，下列哪一種心理建設「最不健康」？', '怨天尤人、自怨自艾，將責任全推給外在運氣', '客觀分析失敗原因，調整學習策略', '向師長朋友請益，尋求心理支持', '把挑戰當作成熟進步的養分', '怨天尤人無法解決問題，只會消耗心志，是不健康的逃避心態。'],
    ['「疾風知勁草，板蕩識誠臣。」這句詩在人生哲理上的含義為：', '嚴峻考驗才能檢驗出真正的品格與節操', '強風只會吹折弱小的雜草', '在動盪時代每個人都會叛變', '自然災害能促進植物生長', '唯有經歷疾風考驗才知草之堅韌，比喻困境考驗出真正的忠誠與節操。'],
    ['下列哪一個成語用來形容人「雖然失敗但志氣不減，準備重新努力再來」？', '捲土重來', '一蹶不振', '銷聲匿跡', '望風披靡', '「捲土重來」比喻失敗後重新聚集力量，再次努力爭取成功。'],
    ['「天將降大任於是人也，必先苦其心志，勞其筋骨。」孟子這段話說明了：', '艱難困苦是對人才最好的磨礪與鍛鍊', '只要遇到困難就可以直接放棄責任', '上天偏愛某些人不給任何考驗', '人的體能是決定成就的唯一標準', '上天賦予重任前必定給予艱難磨練，以堅定其心志、增強其才能。'],
    ['「不經一番寒徹骨，怎得梅花撲鼻香。」這首詩句主要在表達什麼意境？', '卓越成就源於艱辛付出的千錘百煉', '冬季氣溫太低梅花無法開放', '只有在寒冷的地方才能讀好書', '賞花是人生最重要的一件事', '梅花歷經嚴寒才能散發撲鼻清香，比喻成功必須經歷嚴格磨難。'],
    ['在撰寫一篇題目為「迎向挑戰」的議論文時，下列哪一組素材「最不適合」作為論據？', '某富家子弟靠繼承祖產遊手好閒度日的故事', '海倫·凱勒克服盲聾障礙成為作家的經歷', '愛迪生歷經數千次實驗發明電燈泡的奮鬥過程', '史書華在體操受傷後苦練奪牌的感人事蹟', '依賴祖產遊手好閒與「迎向挑戰」主題背道而馳，不能做為正面論據。'],
    ['「山重水複疑無路，柳暗花明又一村。」這句詩常被用來勉勵人們在逆境中：', '保持希望與信心，堅持下去往往迎來轉機', '不要進入深山以防迷失方向', '多種植楊柳和花卉美化環境', '立刻掉頭回家不要繼續探險', '困境中只要不放棄探索，往往在轉折處看見光明坦途。'],
    ['面對團隊合作中的意見分歧與挫折，最成熟的處理方式是：', '理智溝通傾聽、尋求最大共識', '負氣退群不再參與任何討論', '大聲爭吵直到對方完全服從', '完全不發表意見任由他人擺布', '良好溝通是化解分歧、促進團隊合作共贏的最佳途徑。']
  ],
  arts_aesthetics: [
    ['中國書法字體演變中，由篆書簡化而來，字形扁平、蠶頭燕尾的字體是：', '隸書', '楷書', '草書', '行書', '隸書破圓為方，字形寬扁，筆畫具有「蠶頭燕尾、一波三折」的特徵。'],
    ['傳統戲曲中扮演性格剛烈、勇猛或奸詐角色的「花臉」，在行當分類中稱為什麼？', '淨', '生', '旦', '丑', '京劇等戲曲四大行當為「生（男主角）、旦（女主角）、淨（花臉）、丑（丑角）」。'],
    ['王羲之被尊稱為「書聖」，他最著名的行書天下第一名作是：', '〈蘭亭集序〉', '〈祭姪文稿〉', '〈寒食帖〉', '〈玄祕塔碑〉', '王羲之於會稽山陰蘭亭所寫的〈蘭亭集序〉，被譽為「天下第一行書」。'],
    ['下列傳統國畫常用的「四君子」題材中，象徵「淡泊名利、傲霜高潔」的花卉是：', '菊', '梅', '蘭', '竹', '梅蘭竹菊中，菊花開於深秋百花凋零之時，象徵淡泊幽貞、不畏風霜。'],
    ['「顏筋柳骨」這句書壇成語，指的是哪兩位著名楷書大家的風格特點？', '顏真卿與柳公權', '顏之推與柳宗元', '顏師古與柳永', '顏回與柳下惠', '顏真卿楷書厚重雄渾如筋腱，柳公權楷書瘦勁挺拔如骨骼，合稱顏筋柳骨。'],
    ['詩人王維的詩作常被蘇軾稱讚為「詩中有畫，畫中有詩」，這體現了什麼美學意境？', '詩歌語言生動形象，蘊含高遠清幽的繪畫空間美', '王維每寫一首詩必須在紙邊畫插圖', '讀詩時不用思考只要看字形線條', '古代畫家都不識字只能找詩人代題', '王維擅長將山水畫意象融入詩歌語言中，詩境與畫境完美交融。'],
    ['傳統工藝陶瓷中，「青花瓷」最著名且具代表性的裝飾色彩是：', '白底藍花', '紅底金花', '黑底綠花', '黃底紫花', '青花瓷以氧化鈷為著色劑，在白瓷胎上描繪紋飾，呈現經典的白底青藍花紋。'],
    ['「餘音繞梁，三日不絕。」這則成語主要在稱讚什麼藝術造詣達到極高境界？', '音樂歌唱美妙動聽、引人入勝', '建築樑柱雕刻工藝精巧', '廚師烹飪的菜餚香氣濃郁', '演員武打身手靈活矯捷', '形容歌聲或樂曲悠揚美妙，令人久久不能忘懷。'],
    ['古琴音樂追求「清、微、澹、遠」的意境，這體現了文人哪種精神追求？', '寧靜致遠、修身養性的高潔情操', '追求熱鬧喧囂的節慶氣氛', '追求快速高亢的音量炫技', '重視商業市場的點播熱銷', '文人琴樂重在陶冶心性、與自然天地精神相往還，追求清靜淡遠。'],
    ['「文房四寶」自古以來是文人墨客不可或缺的書寫工具，具體是指：', '筆、墨、紙、硯', '琴、棋、書、畫', '梅、蘭、竹、菊', '印、泥、紙、鎮', '「筆、墨、紙、硯」為傳統書寫繪畫必備之文房四寶。']
  ],
  idiom_application: [
    ['「這場科技博覽會展出的創新發明令人□□□□，深感時代進步之神速。」空格中最適當填入哪一個成語？', '目不暇給', '面面相覷', '臨淵羨魚', '班門弄斧', '「目不暇給」形容美好事物太多，眼睛來不及一一觀賞。'],
    ['下列文句中「」內的成語，哪一個使用「完全正確」？', '他在演藝圈默默耕耘多年，如今獲獎可謂「實至名歸」', '小明的文章寫得「行雲流水」，內容東拼西湊令人費解', '弟弟把家裡弄得一團亂，真是「美輪美奐」', '面對敵人的威脅利誘，他「一字千金」絕不妥協', 'A選項「實至名歸」指有真正的成就自然享有相當的聲譽，使用完全恰當。'],
    ['「斬釘截鐵」這個成語最適合用來形容一個人的：', '說話行事堅決果斷，毫不遲疑猶豫', '力氣強大能切斷鋼鐵器具', '廚藝精湛刀法神速', '身體虛弱禁不起考驗', '「斬釘截鐵」比喻說話或行事堅定果斷，絕不拖泥帶水。'],
    ['下列哪一組詞語屬於「反義」關係？', '「趨之若鶩」與「避之唯恐不及」', '「門可羅雀」與「冷冷清清」', '「甚囂塵上」與「沸沸揚揚」', '「披星戴月」與「夙夜匪懈」', '「趨之若鶩」形容爭相前往，「避之唯恐不及」形容躲避惟恐不及，為反義詞。'],
    ['「他說起話來總是□□□□，短短幾句便直擊問題的要害。」空格應填入：', '言簡意賅', '口若懸河', '滔滔不絕', '長篇大論', '「言簡意賅」指言語簡明而意思完備精當，符合題幹語境。'],
    ['下列哪一個成語形容人「為謀求利益急切地奔走追逐，片刻不停」？', '汲汲營營', '悠哉游哉', '不忮不求', '安貧樂道', '「汲汲營營」指熱衷於追逐名利，急切奔波不息。'],
    ['「只要平時按部就班累積實力，大考時自然能□□□□、考取好成績。」空格中最適當填入：', '水到渠成', '拔苗助長', '緣木求魚', '杯弓蛇影', '「水到渠成」比喻條件成熟，事情自然成功。'],
    ['「在辯論大賽上，他言詞犀利、□□□□，把對手駁斥得啞口無言。」空格應填入：', '滔滔雄辯', '張口結舌', '笨口拙舌', '語無倫次', '「滔滔雄辯」形容辯才無礙、發言有條有理，符合語境。'],
    ['「這對孿生兄弟的棋藝在□□□□，交手數十局依然難分高下。」空格應填入：', '伯仲之間', '天壤之別', '雲泥之差', '霄壤之別', '「伯仲之間」比喻實力不相上下、難分優劣。'],
    ['「看到有困難的同學，我們應當□□□□伸出援手，共同營造溫馨的班級。」空格應填入：', '古道熱腸', '自怨自艾', '獨善其身', '袖手旁觀', '「古道熱腸」形容人熱心善良、樂於助人，深富同情心。']
  ],
  classics_culture: [
    ['我國古代將一年分為二十四節氣，其中象徵「春雷初響、驚醒蟄伏冬眠昆蟲」的節氣是：', '驚蟄', '立春', '雨水', '春分', '「驚蟄」在國曆三月上旬，春雷始鳴，驚醒泥土中冬眠的蟲豸。'],
    ['古代歲數稱謂中，「及笄之年」指的是女子滿多少歲？', '十五歲', '十二歲', '十八歲', '二十歲', '古時女子年滿十五歲結髮加笄，稱為「及笄之年」。'],
    ['唐代被尊稱為「詩聖」，作品充滿社會寫實與憂國憂民情懷的偉大詩人是：', '杜甫', '李白', '白居易', '王維', '杜甫詩作反映安史之亂百姓疾苦，被譽為「詩史」，其人被尊為「詩聖」。'],
    ['中國古代文人雅士常稱的「歲寒三友」，是指哪三種耐寒植物？', '松、竹、梅', '梅、蘭、菊', '松、柏、杉', '蘭、荷、菊', '松、竹經冬不凋，梅花耐寒綻放，三者合稱「歲寒三友」。'],
    ['成語「世外桃源」的典故，出自東晉哪位文學家的經典名篇〈桃花源記〉？', '陶淵明', '王羲之', '謝靈運', '曹植', '隱士詩人陶淵明所作的〈桃花源記〉描繪了與世隔絕、安居樂業的理想社會。'],
    ['「弱冠之年」在古代傳統禮制中，指的是男子滿多少歲行冠禮？', '二十歲', '十六歲', '十八歲', '三十歲', '古時男子年滿二十歲行冠禮戴上成年帽，體猶未壯，稱為「弱冠」。'],
    ['宋代大文豪蘇軾與其父親蘇洵、弟弟蘇轍，在文學史上合稱為什麼？', '三蘇', '三曹', '初唐四傑', '宋代三傑', '蘇洵、蘇軾、蘇轍父子三人文采斐然，同列唐宋八大家，世稱「三蘇」。'],
    ['農曆五月初五端午節，傳統習俗包粽子與賽龍舟，相傳是為了紀念哪位愛國詩人？', '屈原', '李白', '賈誼', '陸游', '戰國楚國三閭大夫屈原投汨羅江殉國，百姓以粽子與龍舟悼念他。'],
    ['被魯迅評價為「史家之絕唱，無韻之離騷」的我國第一部紀傳體通史是：', '《史記》', '《漢書》', '《資治通鑑》', '《左傳》', '西漢司馬遷撰寫的《史記》，記載黃帝至漢武帝三千年史實，具有極高文學與史學成就。'],
    ['古典小說名著《三國演義》的開篇名句是：', '話說天下大勢，分久必合，合久必分', '滾滾長江東逝水，浪花淘盡英雄', '滿紙荒唐言，一把辛酸淚', '山重水複疑無路，柳暗花明又一村', '《三國演義》第一回正文開卷首句即為「話說天下大勢，分久必合，合久必分」。']
  ],
  argumentation: [
    ['議論文的三大核心要素，依序為下列哪一組？', '論點、論據、論證', '起承、轉合、抒情', '時間、人物、地點', '主題句、支持句、過渡句', '議論文以「論點（主張）」為核心，以「論據（證據）」為依託，以「論證（推理過程）」為連結。'],
    ['在議論文中，作者提出「失敗是成功之母」這句話，這句話在文章結構中屬於：', '論點（核心觀點）', '事實驗證', '數據圖表', '人物外貌描寫', '「失敗是成功之母」是作者表達的核心主張與看法，屬於論點。'],
    ['作者為了證明「勤能補拙」，列舉了匡衡鑿壁引光、車胤囊螢夜讀的真實故事，這屬於哪種論據？', '事實論據（事例）', '理論論據（道理論據）', '比喻論據', '問卷數據', '歷史名人真實發生的勤學事蹟，屬於事實論據。'],
    ['下列名人格言中，哪一句最適合用來支持「誠信是做人立足之本」的論點？', '人而無信，不知其可也。', '業精於勤，荒於嬉。', '溫故而知新，可以為師矣。', '敏而好學，不恥下問。', '《論語》「人而無信，不知其可也」直指一個人若沒有誠信，便無法立身處世。'],
    ['議論文中如果運用「譬喻論證」，其主要作用是什麼？', '化抽象深奧的道理為具體易懂的形象', '炫耀作者博學多聞', '湊足規定字數篇幅', '使讀者產生恐怖與威脅感', '以生活常見的事物設喻，能深入淺出地闡釋深奧抽象的論理。'],
    ['「有人認為玩手機遊戲只會荒廢學業，然而適度的益智遊戲其實能訓練反應力……」這段文字運用了哪種論證方式？', '駁論（立駁結合）', '舉例論證', '引證法', '類比論證', '先列出對立方的觀點再進行反駁與補充說明，屬於駁論手法。'],
    ['在論證「團隊合作力量大」時，下列哪一個比喻最恰當？', '一根筷子容易折斷，一把筷子難以摧折', '一滴水在陽光下迅速蒸發', '孤帆遠影碧空盡', '井底之蛙不知天地之大', '以「一把筷子緊密團結不易折斷」為喻，極具說服力。'],
    ['一篇優秀的議論文，其論據應當具備哪些特點？', '真實可靠、典型具代表性且切合論點', '道聽途說、只要篇幅長就好', '完全由作者自行憑空捏造', '與中心論點毫無因果關係', '論據必須客觀真實、具代表性，並且緊扣論點才能發揮強大說服力。'],
    ['議論文的結論部分通常承擔什麼功能？', '總結全文論述、重申深化論點或提出呼籲', '引進全新無關的話題展開討論', '推翻前文所有的論點主張', '詳細描寫人物的外表與服飾穿著', '結尾通常總攬全篇，呼應開篇論點，使結構嚴謹有力。'],
    ['「近朱者赤，近墨者黑。」這句古訓常用於論證哪一個主題？', '環境與同伴對個人品格成長的深遠影響', '不同顏色顏料混合時的物理化學變化', '如何挑選高品質的文房四寶', '練習毛筆書法時注意不要弄髒衣物', '說明外在人際環境與朋友圈對個人性格習慣潛移默化的重要作用。']
  ]
};

// 統整加深題庫 (配對、克漏字、多層次推論)
const INTEGRATION_FACTS = {
  rhetoric_advanced: [
    ['【修辭多選判讀】下列四個句子中，哪一句「同時」運用了譬喻與擬人修辭？', '歡樂的溪水像活潑的小孩，一路唱著清脆的歌兒奔向大海', '太陽是一個大火球，高掛在湛藍的天空中', '秋天的楓葉紅了，微風吹過飄落滿地', '他跑得比火箭還要快，一眨眼就不見蹤影', '「像活潑的小孩」為譬喻，「唱著清脆的歌兒奔向大海」賦予溪水生命情態，為擬人修辭。'],
    ['【字義語境辨析】「他行事一絲不苟，深受長官器重。」這句話中的「苟」字意思與下列何者「相同」？', '「苟」且偷安', '「苟」富貴，勿相忘', '不「苟」言笑', '一絲不「苟」', '「一絲不苟」與「苟且偷安」的「苟」皆為「隨便、草率」之意。'],
    ['【成語克漏字】「面對種種流言蜚語，他始終□□□□，深信清者自清。」空格中應填入：', '處之泰然', '心驚膽戰', '七上八下', '魂不附體', '「處之泰然」形容面對困境或非議依然泰然自若、鎮定沉著。'],
    ['【近義詞多層配對】下列哪一組近義成語配對「完全正確」？', '「一言九鼎」對應「一諾千金」', '「緣木求魚」對應「水到渠成」', '「望塵莫及」對應「並駕齊驅」', '「班門弄斧」對應「深藏不露」', '「一言九鼎」與「一諾千金」皆形容說話極有分量、言而有信。'],
    ['【成語反義辨析】下列哪一組詞語是標準的「反義詞」？', '「高瞻遠矚」與「鼠目寸光」', '「臨淵羨魚」與「坐而論道」', '「疾風勁草」與「歲寒松柏」', '「兢兢業業」與「小心翼翼」', '「高瞻遠矚」形容眼光遠大，「鼠目寸光」形容目光短淺，為反義詞。'],
    ['【句型邏輯改寫】「只要大家齊心協力，再大的困難也能克服。」這句話若改寫為反問語氣，何者最貼切？', '難道只要大家齊心協力，還有什麼克服不了的困難嗎？', '大家就算齊心協力，也不一定能克服困難吧？', '如果大家不齊心協力，能克服什麼困難呢？', '難道我們不需要齊心協力嗎？', '將原句改為肯定反問句，語意加強且意思保持一致。']
  ]
};

// 素養挑戰題庫 (生活情境、題組閱讀、綜合思辨)
const COMPETENCY_FACTS = {
  competency_reading: [
    ['【長文閱讀理解】「閱讀不僅僅是獲取資訊的手段，更是心靈與經典跨越時空的對話。每一本經典名著，都是前人智慧的沉澱結晶。透過閱讀，我們得以跳脫個人有限的視野，體會多元人生，滋養豐盈的精神世界。」根據這段文字，作者認為閱讀的最核心價值在於什麼？', '跨越時空與前人智慧對話，滋養心靈與拓展視野', '記住大量資訊以應付升學考試', '學會高超的寫作套路以獲取高分', '購買大量紙本書籍擺放在書架裝飾', '作者明確指出閱讀是跨越時空的對話，能跳脫個人視野侷限並滋養精神世界。'],
    ['【生活情境素養】小華在撰寫國小畢業感言時，想向六年來悉心教導的師長表達最深切的感激與不捨，下列哪一組詩詞成語最適合放在感言核心？', '春風化雨・桃李芬芳・寸草春暉', '班門弄斧・走馬看花・浮光掠影', '臨渴掘井・緣木求魚・杯弓蛇影', '同床異夢・分道揚鑣・各奔前程', '「春風化雨」形容良師教導，「桃李芬芳」形容學生眾多且成材，「寸草春暉」感念師恩如父母。'],
    ['【成語應用思辨】校園自治會競選時，某候選人提出「只要我當選，每週五全校都不用穿校服、每天下課延長至半小時」等不切實際的政見。同學們議論紛紛，下列哪一個成語最能客觀評論這種現象？', '譁眾取寵', '推己及人', '高瞻遠矚', '實事求是', '「譁眾取寵」指用誇大浮華不切實際的言行迎合大眾以博取歡心。'],
    ['【資訊判讀與推論】圖書館公告：「本館即日起推行『漂書計畫』，歡迎全校師生將家中八成新以上、適合國小學童閱讀的好書攜至閱覽室投入漂書箱，供全校自由取閱，閱畢後請放回原處或轉漂他人。」這項計畫的主要推廣宗旨是什麼？', '好書共享、循環閱讀與誠信傳遞', '向全校學生收取二手舊書販售換錢', '強迫學生在規定期限內讀完書籍', '清除圖書館多餘的書架空間', '漂書計畫核心在於知識共享、推動閱讀風氣，並仰賴大家誠信自律歸還。']
  ]
};

// 產生每日固定 20 題 (12 核心基礎 + 6 統整加深 + 2 素養挑戰，同輪 0 重複)
function buildDailyQuestions(publisher, chapter, attemptNo = 1) {
  const seedBase = `${todayKey}_${publisher}_${chapter}_${attemptNo}`;
  const seenPrompts = new Set();
  const questions = [];

  // 1. 查找章節標籤
  const chapterConfig = (CURRICULUM[publisher] || []).find(c => c[0] === chapter);
  const tags = chapterConfig ? chapterConfig[1] : ['growth_mindset', 'rhetoric_figures'];

  // 2. 核心基礎 12 題
  let corePool = [];
  tags.forEach(t => {
    if (FACTS[t]) corePool = corePool.concat(FACTS[t]);
  });
  if (corePool.length < 12) {
    Object.values(FACTS).forEach(list => { corePool = corePool.concat(list); });
  }

  let coreIndex = 0;
  for (let i = 0; i < corePool.length && questions.length < 12; i++) {
    const raw = corePool[(i + attemptNo * 3) % corePool.length];
    const [prompt, correct, d1, d2, d3, explanation] = raw;
    if (seenPrompts.has(prompt)) continue;
    seenPrompts.add(prompt);

    const options = [correct, d1, d2, d3].sort(() => 0.5 - Math.random());
    questions.push({
      id: `chi_core_${attemptNo}_${++coreIndex}`,
      kind: '核心基礎',
      prompt,
      correct,
      options,
      explanation
    });
  }

  // 3. 統整加深 6 題
  let integPool = INTEGRATION_FACTS.rhetoric_advanced || [];
  let integIndex = 0;
  for (let i = 0; i < integPool.length && questions.length < 18; i++) {
    const raw = integPool[(i + attemptNo * 2) % integPool.length];
    const [prompt, correct, d1, d2, d3, explanation] = raw;
    if (seenPrompts.has(prompt)) continue;
    seenPrompts.add(prompt);

    const options = [correct, d1, d2, d3].sort(() => 0.5 - Math.random());
    questions.push({
      id: `chi_integ_${attemptNo}_${++integIndex}`,
      kind: '統整加深',
      prompt,
      correct,
      options,
      explanation
    });
  }

  // 4. 素養挑戰 2 題
  let compPool = COMPETENCY_FACTS.competency_reading || [];
  let compIndex = 0;
  for (let i = 0; i < compPool.length && questions.length < 20; i++) {
    const raw = compPool[(i + attemptNo) % compPool.length];
    const [prompt, correct, d1, d2, d3, explanation] = raw;
    if (seenPrompts.has(prompt)) continue;
    seenPrompts.add(prompt);

    const options = [correct, d1, d2, d3].sort(() => 0.5 - Math.random());
    questions.push({
      id: `chi_comp_${attemptNo}_${++compIndex}`,
      kind: '素養挑戰',
      prompt,
      correct,
      options,
      explanation
    });
  }

  return questions;
}

// 動態從成語 200 抽取產生隨堂測驗題目 (10 或 20 題)
function buildIdiomQuizQuestions(count = 10) {
  if (!idiomList || idiomList.length < count) return [];
  const shuffled = [...idiomList].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  const quiz = [];

  selected.forEach((target, idx) => {
    // 隨機題型：
    // Type 1: 釋義選成語
    // Type 2: 成語選釋義
    // Type 3: 克漏字填空
    const qType = idx % 3;
    const distractors = idiomList.filter(item => item.id !== target.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    if (qType === 0) {
      // 釋義選成語
      const options = [target.name, ...distractors.map(d => d.name)].sort(() => 0.5 - Math.random());
      quiz.push({
        id: `idiom_q_${idx + 1}`,
        type: 'meaning_to_idiom',
        prompt: `下列成語釋義：「${target.meaning}」最貼切的成語是哪一個？`,
        correct: target.name,
        options,
        explanation: `【${target.name}】（${target.bopomofo}）：${target.meaning}`
      });
    } else if (qType === 1) {
      // 成語選釋義
      const options = [target.meaning, ...distractors.map(d => d.meaning)].sort(() => 0.5 - Math.random());
      quiz.push({
        id: `idiom_q_${idx + 1}`,
        type: 'idiom_to_meaning',
        prompt: `成語「${target.name}」（${target.bopomofo}）的意思是：`,
        correct: target.meaning,
        options,
        explanation: `【${target.name}】：${target.meaning}`
      });
    } else {
      // 克漏字情境填空
      let sentence = target.example || `我們在生活中要深刻體會「${target.name}」的意涵。`;
      sentence = sentence.replace(target.name, '（　　）');
      const options = [target.name, ...distractors.map(d => d.name)].sort(() => 0.5 - Math.random());
      quiz.push({
        id: `idiom_q_${idx + 1}`,
        type: 'cloze_sentence',
        prompt: `請選出最適合填入句中括號的成語：\n「${sentence}」`,
        correct: target.name,
        options,
        explanation: `正確填入成語為【${target.name}】。\n釋義：${target.meaning}`
      });
    }
  });

  return quiz;
}

// 學習日曆數據彙總
function getCalendarTotals(historyRows = []) {
  return historyRows.reduce(
    (acc, row) => {
      acc.completedAttempts += Number(row.completedAttempts || 0);
      acc.totalQuestions += Number(row.totalQuestions || 0);
      acc.totalScore += Number(row.totalScore || 0);
      return acc;
    },
    { completedAttempts: 0, totalQuestions: 0, totalScore: 0 }
  );
}

// TTS 繁體中文語音朗讀
function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('您的瀏覽器不支援語音合成功能');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-TW';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function showToast(message, tone = 'slate') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-text').textContent = message;
  document.getElementById('toast-bg').className = `${tone === 'rose' ? 'bg-rose-600' : tone === 'emerald' ? 'bg-emerald-600' : 'bg-slate-800'} text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 font-bold text-sm`;
  toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
  setTimeout(() => toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none'), 2200);
}

function showCurriculumView(id) {
  ['view-setup', 'view-quiz', 'view-result', 'view-review'].forEach(view => {
    const el = document.getElementById(view);
    if (el) el.classList.toggle('hidden', view !== id);
  });
}

function switchMainTab(tab) {
  const isCurriculum = tab === 'curriculum';
  document.getElementById('section-curriculum')?.classList.toggle('hidden', !isCurriculum);
  document.getElementById('section-idioms')?.classList.toggle('hidden', isCurriculum);

  const btnCurriculum = document.getElementById('tab-curriculum');
  const btnIdioms = document.getElementById('tab-idioms');

  if (isCurriculum) {
    btnCurriculum.className = 'flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-white text-rose-700 shadow-md';
    btnIdioms.className = 'flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 text-rose-900 hover:text-rose-700 hover:bg-white/50';
  } else {
    btnCurriculum.className = 'flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 text-rose-900 hover:text-rose-700 hover:bg-white/50';
    btnIdioms.className = 'flex-1 py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 bg-white text-rose-700 shadow-md';
    renderIdiomCard();
  }
}

function getFilteredIdioms() {
  let list = idiomList;
  if (idiomFilterOnlyStarred) {
    list = list.filter(item => starredIdiomIds.has(item.id));
  } else if (selectedIdiomRange) {
    list = list.filter(item => item.id >= selectedIdiomRange.start && item.id <= selectedIdiomRange.end);
  }
  if (idiomSearchKeyword) {
    const kw = idiomSearchKeyword.toLowerCase();
    list = list.filter(item =>
      item.name.toLowerCase().includes(kw) ||
      (item.bopomofo && item.bopomofo.toLowerCase().includes(kw)) ||
      (item.meaning && item.meaning.toLowerCase().includes(kw))
    );
  }
  return list;
}

function renderIdiomRangeButtons() {
  const container = document.getElementById('idiom-range-container');
  if (!container) return;
  container.innerHTML = '';

  for (let start = 1; start <= 200; start += 10) {
    const end = Math.min(start + 9, 200);
    const isSelected = !idiomFilterOnlyStarred && selectedIdiomRange && selectedIdiomRange.start === start && selectedIdiomRange.end === end;
    const btn = document.createElement('button');
    btn.dataset.start = String(start);
    btn.dataset.end = String(end);
    btn.className = isSelected
      ? 'px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-xs shadow-sm whitespace-nowrap transition-all'
      : 'px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-rose-700 font-bold text-xs shadow-xs border border-slate-200/60 whitespace-nowrap transition-all';
    btn.textContent = `${start}-${end}`;

    btn.addEventListener('click', () => {
      selectedIdiomRange = { start, end };
      idiomFilterOnlyStarred = false;
      
      const filterAll = document.getElementById('filter-all');
      if (filterAll) filterAll.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 transition';
      const filterStarred = document.getElementById('filter-starred');
      if (filterStarred) filterStarred.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 transition flex items-center gap-1';

      renderIdiomRangeButtons();

      const filtered = getFilteredIdioms();
      let targetIdx = 0;
      if (lastIdiomId >= start && lastIdiomId <= end) {
        const found = filtered.findIndex(item => item.id === lastIdiomId);
        if (found !== -1) targetIdx = found;
      }
      idiomCurrentIndex = targetIdx;
      renderIdiomCard();
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });

    container.appendChild(btn);
  }
}

function renderIdiomCard() {
  const filtered = getFilteredIdioms();
  const cardInner = document.getElementById('idiom-card-inner');
  if (isCardFlipped) {
    cardInner?.classList.remove('is-flipped');
    isCardFlipped = false;
  }

  if (filtered.length === 0) {
    document.getElementById('idiom-seq-badge').textContent = '#000 / 0';
    document.getElementById('idiom-name').textContent = idiomFilterOnlyStarred ? '尚無收藏成語' : '無符合成語';
    document.getElementById('idiom-bopomofo').textContent = idiomFilterOnlyStarred ? '請在字卡右上角點擊星號收藏' : '請嘗試更換關鍵字';
    document.getElementById('idiom-counter-text').textContent = '0 / 0';
    return;
  }

  if (idiomCurrentIndex >= filtered.length) idiomCurrentIndex = 0;
  if (idiomCurrentIndex < 0) idiomCurrentIndex = filtered.length - 1;

  const idiom = filtered[idiomCurrentIndex];
  const isStarred = starredIdiomIds.has(idiom.id);

  // Front
  document.getElementById('idiom-seq-badge').textContent = `#${String(idiom.id).padStart(3, '0')} / 200`;
  document.getElementById('idiom-name').textContent = idiom.name;
  document.getElementById('idiom-bopomofo').textContent = idiom.bopomofo;
  
  // 組別徽章
  const groupStart = Math.floor((idiom.id - 1) / 10) * 10 + 1;
  const groupEnd = Math.min(groupStart + 9, 200);
  const groupBadge = document.getElementById('idiom-group-badge');
  if (groupBadge) groupBadge.textContent = `第 ${groupStart}-${groupEnd} 則`;

  const starBtn = document.getElementById('btn-star-idiom');
  if (starBtn) {
    starBtn.className = `w-10 h-10 rounded-md flex items-center justify-center text-lg shadow-sm border transition ${isStarred ? 'bg-amber-50 text-amber-500 border-amber-300' : 'bg-white/80 text-slate-300 hover:text-amber-400 border-slate-200/60'}`;
  }

  // Back
  document.getElementById('idiom-back-name').textContent = idiom.name;
  document.getElementById('idiom-back-bpmf').textContent = idiom.bopomofo;
  document.getElementById('idiom-meaning').textContent = idiom.meaning;
  
  const notesBox = document.getElementById('idiom-notes-box');
  const notesEl = document.getElementById('idiom-notes');
  if (idiom.notes) {
    notesBox.classList.remove('hidden');
    notesEl.textContent = idiom.notes;
  } else {
    notesBox.classList.add('hidden');
  }

  const synContainer = document.getElementById('idiom-synonyms');
  synContainer.innerHTML = '';
  if (idiom.synonyms && idiom.synonyms.length > 0) {
    idiom.synonyms.forEach(s => {
      const tag = document.createElement('span');
      tag.className = 'px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold';
      tag.textContent = s;
      synContainer.appendChild(tag);
    });
  } else {
    synContainer.innerHTML = '<span class="text-slate-400">暫無特別近義標註</span>';
  }

  const antContainer = document.getElementById('idiom-antonyms');
  antContainer.innerHTML = '';
  if (idiom.antonyms && idiom.antonyms.length > 0) {
    idiom.antonyms.forEach(a => {
      const tag = document.createElement('span');
      tag.className = 'px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold';
      tag.textContent = a;
      antContainer.appendChild(tag);
    });
  } else {
    antContainer.innerHTML = '<span class="text-slate-400">暫無特別反義標註</span>';
  }

  document.getElementById('idiom-example').textContent = idiom.example || `我們在寫作時應當靈活理解「${idiom.name}」的語境。`;

  // Controls counter
  document.getElementById('idiom-counter-text').textContent = `${String(idiomCurrentIndex + 1).padStart(3, '0')} / ${filtered.length}`;

  // 記憶研讀進度與更新累計/今日日曆打卡
  recordDailyIdiomView(todayKey, idiom.id);
}

function recordDailyIdiomView(date, idiomId) {
  lastIdiomId = idiomId;
  allViewedIdiomIds.add(idiomId);

  // 更新記憶卡片視覺
  const resumeBadge = document.getElementById('idiom-resume-badge');
  if (resumeBadge) resumeBadge.textContent = `第 #${String(idiomId).padStart(3, '0')} 則`;
  const resumeName = document.getElementById('idiom-resume-name');
  const curIdiom = idiomList.find(i => i.id === idiomId);
  if (resumeName && curIdiom) resumeName.textContent = curIdiom.name;

  // 累計總進度條
  const totalCount = allViewedIdiomIds.size;
  const pct = Math.min(100, Math.round((totalCount / 200) * 100));
  const progText = document.getElementById('idiom-total-progress-text');
  if (progText) progText.textContent = `${totalCount} / 200 (${pct}%)`;
  const progBar = document.getElementById('idiom-total-progress-bar');
  if (progBar) progBar.style.width = `${pct}%`;

  // 記入今日研讀歷史
  let entry = dailyIdiomHistory.find(d => d.date === date);
  if (!entry) {
    entry = { date, viewedCount: 1, viewedIds: [idiomId] };
    dailyIdiomHistory.push(entry);
  } else {
    entry.viewedIds = entry.viewedIds || [];
    if (!entry.viewedIds.includes(idiomId)) {
      entry.viewedIds.push(idiomId);
    }
    entry.viewedCount = entry.viewedIds.length;
  }

  // 今日打卡狀態更新
  const todayEntry = dailyIdiomHistory.find(d => d.date === todayKey);
  const todayCount = todayEntry ? todayEntry.viewedCount : 0;
  const statusEl = document.getElementById('idiom-today-status');
  if (statusEl) {
    statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i>今日已研讀 ${todayCount} 則成語`;
    statusEl.className = 'mt-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-center text-xs font-bold';
  }

  saveIdiomProgress();
  renderIdiomCalendar();
}

function saveIdiomProgress() {
  if (!currentUser?.seatNo) return;
  const storageKey = `cool_idiom_progress_${currentUser.seatNo}`;
  const payload = {
    lastIdiomId,
    dailyIdiomHistory,
    allViewed: Array.from(allViewedIdiomIds)
  };
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (e) {
    console.warn('localStorage save failed', e);
  }

  if (idiomSyncTimer) clearTimeout(idiomSyncTimer);
  idiomSyncTimer = setTimeout(async () => {
    if (currentUser?.token && currentUser?.seatNo) {
      try {
        await chineseFetch('/chinese/idiom-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seatNo: currentUser.seatNo,
            lastIdiomId,
            date: todayKey,
            idiomId: lastIdiomId
          })
        });
      } catch (err) {
        console.warn('後端成語進度同步失敗:', err);
      }
    }
  }, 1000);
}

function renderIdiomCalendar() {
  const grid = document.getElementById('idiom-calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const y = idiomCalendarDate.getFullYear();
  const m = idiomCalendarDate.getMonth();
  document.getElementById('idiom-cal-title').textContent = `${y} 年 ${m + 1} 月`;

  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell';
    grid.appendChild(empty);
  }

  let monthStudiedDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('button');
    cell.className = 'calendar-cell rounded-xl flex flex-col items-center justify-center text-xs font-black transition';
    const rec = dailyIdiomHistory.find(h => h.date === key);

    if (rec && rec.viewedCount > 0) {
      monthStudiedDays++;
      cell.classList.add('bg-rose-500', 'text-white', 'shadow-sm');
      cell.innerHTML = `<span>${d}</span><span class="text-[9px] font-normal opacity-90">${rec.viewedCount}則</span>`;
    } else if (key === todayKey) {
      cell.classList.add('bg-rose-100', 'text-rose-800', 'border-2', 'border-rose-400');
      cell.textContent = d;
    } else {
      cell.classList.add('bg-slate-50', 'text-slate-500');
      cell.textContent = d;
    }

    cell.onclick = () => {
      const dt = document.getElementById('idiom-calendar-detail');
      if (rec && rec.viewedCount > 0) {
        dt.textContent = `${key}：已研讀 ${rec.viewedCount} 則成語圖卡`;
      } else {
        dt.textContent = `${key}：當天尚無研讀紀錄`;
      }
    };
    grid.appendChild(cell);
  }

  const compCount = document.getElementById('idiom-completion-count');
  if (compCount) compCount.textContent = `本月 ${monthStudiedDays} 天研讀`;
}

async function loadIdiomProgress() {
  if (!currentUser?.seatNo) return;
  const storageKey = `cool_idiom_progress_${currentUser.seatNo}`;
  
  // 1. 本機快取瞬時載入
  let localData = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  if (localData) {
    if (localData.lastIdiomId) lastIdiomId = localData.lastIdiomId;
    if (Array.isArray(localData.dailyIdiomHistory)) dailyIdiomHistory = localData.dailyIdiomHistory;
    if (Array.isArray(localData.allViewed)) allViewedIdiomIds = new Set(localData.allViewed);
  }

  // 2. 異步讀取後端資料庫
  if (currentUser?.token) {
    try {
      const res = await chineseFetch(`/chinese/idiom-progress?seatNo=${encodeURIComponent(currentUser.seatNo)}`);
      const json = await res.json();
      if (json.success) {
        if (json.lastIdiomId) lastIdiomId = json.lastIdiomId;
        if (Array.isArray(json.dailyHistory)) {
          json.dailyHistory.forEach(remoteEntry => {
            let localEntry = dailyIdiomHistory.find(d => d.date === remoteEntry.date);
            if (!localEntry) {
              dailyIdiomHistory.push(remoteEntry);
            } else {
              const mergedIds = new Set([...(localEntry.viewedIds || []), ...(remoteEntry.viewedIds || [])]);
              localEntry.viewedIds = Array.from(mergedIds);
              localEntry.viewedCount = localEntry.viewedIds.length;
            }
          });
        }
      }
    } catch (err) {
      console.warn('載入後端成語進度失敗:', err);
    }
  }

  // 重建累計已讀成語 Set
  dailyIdiomHistory.forEach(entry => {
    if (Array.isArray(entry.viewedIds)) {
      entry.viewedIds.forEach(id => allViewedIdiomIds.add(id));
    }
  });

  // 計算最後停留的成語組別 (例如第 25 則對應 21-30)
  const start = Math.floor((lastIdiomId - 1) / 10) * 10 + 1;
  const end = Math.min(start + 9, 200);
  selectedIdiomRange = { start, end };

  renderIdiomRangeButtons();

  const filtered = getFilteredIdioms();
  const targetIdx = filtered.findIndex(item => item.id === lastIdiomId);
  idiomCurrentIndex = targetIdx !== -1 ? targetIdx : 0;

  renderIdiomCard();
  renderIdiomCalendar();

  // 若上次研讀序號大於 1，顯示溫馨接續提示
  const currentIdiom = idiomList.find(i => i.id === lastIdiomId);
  if (currentIdiom && lastIdiomId > 1) {
    showToast(`歡迎回來！已接續上次研讀：第 #${String(lastIdiomId).padStart(3, '0')} 則「${currentIdiom.name}」`, 'rose');
  }

  setTimeout(() => {
    const activeBtn = document.querySelector(`#idiom-range-container button[data-start="${start}"]`);
    activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, 350);
}

function toggleCardFlip() {
  const cardInner = document.getElementById('idiom-card-inner');
  if (!cardInner) return;
  isCardFlipped = !isCardFlipped;
  cardInner.classList.toggle('is-flipped', isCardFlipped);
}

function nextIdiom() {
  const filtered = getFilteredIdioms();
  if (filtered.length <= 1) return;
  idiomCurrentIndex = (idiomCurrentIndex + 1) % filtered.length;
  renderIdiomCard();
}

function prevIdiom() {
  const filtered = getFilteredIdioms();
  if (filtered.length <= 1) return;
  idiomCurrentIndex = (idiomCurrentIndex - 1 + filtered.length) % filtered.length;
  renderIdiomCard();
}

function shuffleIdiom() {
  const filtered = getFilteredIdioms();
  if (filtered.length <= 1) return;
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * filtered.length);
  } while (newIdx === idiomCurrentIndex);
  idiomCurrentIndex = newIdx;
  renderIdiomCard();
}

async function toggleStarCurrentIdiom() {
  const filtered = getFilteredIdioms();
  if (filtered.length === 0) return;
  const idiom = filtered[idiomCurrentIndex];
  const willBeStarred = !starredIdiomIds.has(idiom.id);

  if (willBeStarred) {
    starredIdiomIds.add(idiom.id);
  } else {
    starredIdiomIds.delete(idiom.id);
  }
  document.getElementById('star-count-badge').textContent = starredIdiomIds.size;
  renderIdiomCard();

  if (currentUser?.token && currentUser?.seatNo) {
    try {
      await chineseFetch('/chinese/idiom-stars/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNo: currentUser.seatNo, idiomId: idiom.id })
      });
      showToast(willBeStarred ? `已收藏「${idiom.name}」` : `已取消收藏「${idiom.name}」`, 'rose');
    } catch (err) {
      console.warn('星號狀態同步失敗:', err);
    }
  }
}

// 成語隨堂測驗評量 (Idiom Quiz)
function startIdiomQuiz(count = 10) {
  const questions = buildIdiomQuizQuestions(count);
  if (!questions || questions.length === 0) {
    showToast('成語題庫載入中，請稍候');
    return;
  }
  idiomQuizState = {
    active: true,
    questions,
    currentIndex: 0,
    score: 0,
    correctCount: 0,
    userAnswers: []
  };

  document.getElementById('idiom-card-container').classList.add('hidden');
  document.getElementById('view-idiom-quiz-result').classList.add('hidden');
  document.getElementById('view-idiom-quiz').classList.remove('hidden');
  renderIdiomQuizQuestion();
}

function renderIdiomQuizQuestion() {
  const { questions, currentIndex } = idiomQuizState;
  const q = questions[currentIndex];
  if (!q) return finishIdiomQuiz();

  document.getElementById('idiom-quiz-progress').textContent = `第 ${currentIndex + 1} / ${questions.length} 題`;
  document.getElementById('idiom-quiz-bar').style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
  document.getElementById('idiom-quiz-prompt').textContent = q.prompt;

  const optionsContainer = document.getElementById('idiom-quiz-options');
  optionsContainer.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'answer-option w-full p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-rose-300 text-left font-bold transition flex items-center';
    btn.innerHTML = `<span class="inline-flex w-7 h-7 mr-3 rounded-lg bg-slate-100 items-center justify-center text-xs font-black text-slate-600">${String.fromCharCode(65 + idx)}</span><span>${opt}</span>`;
    btn.onclick = () => answerIdiomQuiz(opt, btn);
    optionsContainer.appendChild(btn);
  });

  document.getElementById('idiom-quiz-feedback').classList.add('hidden');
  document.getElementById('btn-idiom-quiz-next').classList.add('hidden');
}

function answerIdiomQuiz(selectedOption, selectedBtn) {
  const { questions, currentIndex } = idiomQuizState;
  const q = questions[currentIndex];
  const isCorrect = selectedOption === q.correct;

  document.querySelectorAll('#idiom-quiz-options .answer-option').forEach(btn => {
    btn.disabled = true;
    const text = btn.querySelector('span:last-child').textContent.trim();
    if (text === q.correct) btn.classList.add('is-correct');
  });

  if (!isCorrect) selectedBtn.classList.add('is-wrong');

  if (isCorrect) idiomQuizState.correctCount++;
  idiomQuizState.userAnswers.push({ questionId: q.id, selected: selectedOption, isCorrect });

  const fb = document.getElementById('idiom-quiz-feedback');
  fb.className = `mt-5 rounded-lg p-4 text-sm leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
  fb.innerHTML = `<strong>${isCorrect ? '答對了！' : `正確答案：${q.correct}`}</strong><br>${q.explanation}`;
  fb.classList.remove('hidden');

  const btnNext = document.getElementById('btn-idiom-quiz-next');
  btnNext.classList.remove('hidden');
}

function advanceIdiomQuiz() {
  idiomQuizState.currentIndex++;
  if (idiomQuizState.currentIndex >= idiomQuizState.questions.length) {
    finishIdiomQuiz();
  } else {
    renderIdiomQuizQuestion();
  }
}

function finishIdiomQuiz() {
  const { questions, correctCount } = idiomQuizState;
  const finalScore = Math.round((correctCount / questions.length) * 100);
  document.getElementById('view-idiom-quiz').classList.add('hidden');
  document.getElementById('view-idiom-quiz-result').classList.remove('hidden');

  document.getElementById('idiom-quiz-result-correct').textContent = `${correctCount} / ${questions.length}`;
  document.getElementById('idiom-quiz-result-score').textContent = `${finalScore} 分`;
}

function exitIdiomQuiz() {
  document.getElementById('view-idiom-quiz').classList.add('hidden');
  document.getElementById('view-idiom-quiz-result').classList.add('hidden');
  document.getElementById('idiom-card-container').classList.remove('hidden');
  renderIdiomCard();
}

// 課本練習題庫與渲染
function renderPublisherButtons() {
  const container = document.getElementById('publisher-list');
  if (!container) return;
  container.innerHTML = '';
  ALLOWED_PUBLISHERS.forEach(pub => {
    const btn = document.createElement('button');
    const active = pub === selectedPublisher;
    btn.className = `py-3 rounded-lg border-2 font-black transition ${active ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`;
    btn.textContent = pub;
    btn.onclick = () => {
      selectedPublisher = pub;
      renderPublisherButtons();
      renderChapters();
    };
    container.appendChild(btn);
  });
}

function renderChapters() {
  const select = document.getElementById('chapter-select');
  if (!select) return;
  select.innerHTML = '';
  const chapters = CURRICULUM[selectedPublisher] || [];
  chapters.forEach(([name]) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  updateChapterSummary();
}

function updateChapterSummary() {
  const select = document.getElementById('chapter-select');
  const summaryEl = document.getElementById('chapter-summary');
  if (!select || !summaryEl) return;
  const chapters = CURRICULUM[selectedPublisher] || [];
  const found = chapters.find(c => c[0] === select.value);
  summaryEl.textContent = found ? `單元核心重點：${found[2]}` : '每日固定 20 題，包含字音字形、詞義成語、修辭句型與素養閱讀。';
}

function getCorrectCount(state = dailyState) {
  return (state?.answers || []).filter(a => a.correct).length;
}

function renderQuestion() {
  const q = dailyState.questions[dailyState.currentIndex];
  if (!q) return finishQuiz();

  document.getElementById('quiz-badge').textContent = `${dailyState.publisher}・${dailyState.chapter}`;
  document.getElementById('quiz-progress').textContent = `第 ${dailyState.currentIndex + 1} / ${DAILY_TOTAL} 題`;
  document.getElementById('quiz-bar').style.width = `${((dailyState.currentIndex + 1) / DAILY_TOTAL) * 100}%`;

  const kindEl = document.getElementById('question-kind');
  kindEl.textContent = q.kind || '核心基礎';
  if (q.kind === '素養挑戰') {
    kindEl.className = 'inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 tracking-wider mb-2';
  } else if (q.kind === '統整加深') {
    kindEl.className = 'inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 tracking-wider mb-2';
  } else {
    kindEl.className = 'inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 tracking-wider mb-2';
  }

  document.getElementById('question-text').textContent = q.prompt || q.question;
  const list = document.getElementById('answer-list');
  list.innerHTML = '';
  const opts = q.options || [];
  opts.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'answer-option w-full p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-rose-300 text-left font-bold transition flex items-center';
    btn.innerHTML = `<span class="inline-flex w-7 h-7 mr-3 rounded-lg bg-slate-100 items-center justify-center text-xs font-black text-slate-600">${String.fromCharCode(65 + idx)}</span><span>${opt}</span>`;
    btn.onclick = () => answerDailyQuestion(opt, btn);
    list.appendChild(btn);
  });

  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');
}

async function answerDailyQuestion(option, selectedBtn) {
  const q = dailyState.questions[dailyState.currentIndex];
  const targetAns = q.correct || q.answer;
  const isCorrect = option === targetAns;

  document.querySelectorAll('#answer-list .answer-option').forEach(btn => {
    btn.disabled = true;
    const text = btn.querySelector('span:last-child').textContent.trim();
    if (text === targetAns) btn.classList.add('is-correct');
  });

  if (!isCorrect) selectedBtn.classList.add('is-wrong');

  dailyState.answers.push({ questionId: q.id, selected: option, correct: isCorrect });
  if (!isCorrect && !dailyState.wrongQuestions.some(item => item.id === q.id)) {
    dailyState.wrongQuestions.push({ ...q, publisher: dailyState.publisher, chapter: dailyState.chapter });
  }

  const fb = document.getElementById('feedback');
  fb.className = `mt-5 rounded-lg p-4 text-sm leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
  fb.innerHTML = `<strong>${isCorrect ? '答對了！' : `正確答案：${targetAns}`}</strong><br>${q.explanation}`;
  fb.classList.remove('hidden');

  const btnNext = document.getElementById('btn-next');
  btnNext.classList.remove('hidden');

  try {
    await syncState(false);
  } catch (err) {
    console.warn('國語答題進度同步失敗:', err);
  }
}

async function advanceQuestion() {
  document.getElementById('btn-next')?.classList.add('hidden');
  dailyState.currentIndex += 1;
  if (dailyState.currentIndex >= DAILY_TOTAL) return finishQuiz();

  renderQuestion();
  try {
    await syncState(false);
  } catch (err) {
    console.warn('國語進度同步失敗:', err);
  }
}

async function finishQuiz() {
  dailyState.completed = true;
  dailyState.currentIndex = DAILY_TOTAL;
  dailyState.score = Math.round((getCorrectCount() / DAILY_TOTAL) * 100);
  try {
    const res = await syncState(true);
    todaySummary = res.todaySummary || todaySummary;
  } catch (err) {
    console.warn('國語完成狀態同步失敗:', err);
  }
  history = [{ date: todayKey, ...todaySummary }, ...history.filter(i => i.date !== todayKey)];
  wrongBank = [...new Map([...wrongBank, ...dailyState.wrongQuestions].map(i => [i.id, i])).values()];
  const wrongEl = document.getElementById('wrong-count');
  if (wrongEl) wrongEl.textContent = wrongBank.length;

  renderResult();
  renderCalendar();
}

function renderResult() {
  document.getElementById('result-attempt').textContent = `第 ${dailyState.attemptNo} 次測驗（12基礎＋6加深＋2素養）`;
  document.getElementById('result-correct').textContent = `${getCorrectCount()} / ${DAILY_TOTAL}`;
  document.getElementById('result-score').textContent = `${dailyState.score} 分`;
  document.getElementById('result-today-total').textContent = `今日累計：${todaySummary.completedAttempts} 次・${todaySummary.totalQuestions} 題・${todaySummary.totalScore} 分`;
  showCurriculumView('view-result');
}

async function syncState(completed) {
  const res = await chineseFetch('/chinese-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: completed,
    body: JSON.stringify({
      seatNo: currentUser.seatNo,
      date: todayKey,
      attemptNo: dailyState.attemptNo,
      publisher: dailyState.publisher,
      chapter: dailyState.chapter,
      questions: dailyState.questions,
      currentIndex: dailyState.currentIndex,
      answers: dailyState.answers,
      wrongQuestions: dailyState.wrongQuestions,
      completed,
      score: dailyState.score || 0
    })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.error || `國語進度同步失敗 (HTTP ${res.status})`);
  if (json.attemptNo) dailyState.attemptNo = Number(json.attemptNo);
  return json;
}

async function startOrResume() {
  if (dailyState?.completed) return renderResult();
  if (!dailyState) {
    const chapter = document.getElementById('chapter-select').value;
    dailyState = {
      date: todayKey,
      attemptNo: todaySummary.nextAttemptNo || 1,
      publisher: selectedPublisher,
      chapter,
      questions: buildDailyQuestions(selectedPublisher, chapter, todaySummary.nextAttemptNo || 1),
      answers: [],
      wrongQuestions: [],
      currentIndex: 0,
      completed: false,
      score: 0
    };
    try {
      await syncState(false);
    } catch (err) {
      console.warn('建立國語每日題組失敗:', err);
    }
  }
  showCurriculumView('view-quiz');
  renderQuestion();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const y = calendarDate.getFullYear();
  const m = calendarDate.getMonth();
  document.getElementById('cal-title').textContent = `${y} 年 ${m + 1} 月`;

  const firstDay = new Date(y, m, 1).getDay();
  const totalDays = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell';
    grid.appendChild(empty);
  }

  const totals = getCalendarTotals(history);
  document.getElementById('completion-count').textContent = `${totals.totalQuestions} 題・${totals.totalScore} 分`;

  for (let d = 1; d <= totalDays; d++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement('button');
    cell.className = 'calendar-cell rounded-xl flex flex-col items-center justify-center text-xs font-black transition';
    const rec = history.find(h => h.date === key);

    if (rec && rec.completedAttempts > 0) {
      cell.classList.add('bg-rose-500', 'text-white', 'shadow-sm');
      cell.innerHTML = `<span>${d}</span><span class="text-[9px] font-normal opacity-90">${rec.totalScore}分</span>`;
    } else if (key === todayKey) {
      cell.classList.add('bg-rose-100', 'text-rose-800', 'border-2', 'border-rose-400');
      cell.textContent = d;
    } else {
      cell.classList.add('bg-slate-50', 'text-slate-500');
      cell.textContent = d;
    }

    cell.onclick = () => {
      const dt = document.getElementById('calendar-detail');
      if (rec && rec.completedAttempts > 0) {
        dt.textContent = `${key}：完成 ${rec.completedAttempts} 回合，共 ${rec.totalQuestions} 題，得分 ${rec.totalScore} 分`;
      } else {
        dt.textContent = `${key}：當天尚無完成練習記錄`;
      }
    };
    grid.appendChild(cell);
  }
}

// 錯題複習模式
function startReview() {
  if (wrongBank.length === 0) {
    showToast('目前沒有待複習的國語錯題！', 'emerald');
    return;
  }
  reviewQuestions = [...wrongBank];
  reviewIndex = 0;
  showCurriculumView('view-review');
  renderReviewQuestion();
}

function renderReviewQuestion() {
  const panel = document.getElementById('review-panel');
  const empty = document.getElementById('review-empty');
  if (reviewIndex >= reviewQuestions.length) {
    panel.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  panel.classList.remove('hidden');
  empty.classList.add('hidden');

  const q = reviewQuestions[reviewIndex];
  document.getElementById('review-meta').textContent = `題號 ${reviewIndex + 1} / ${reviewQuestions.length}（${q.publisher || ''} ${q.chapter || ''}）`;
  document.getElementById('review-question').textContent = q.prompt || q.question;

  const list = document.getElementById('review-answer-list');
  list.innerHTML = '';
  const targetAns = q.correct || q.answer;
  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'review-answer-option w-full p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-rose-300 text-left font-bold transition flex items-center';
    btn.innerHTML = `<span class="inline-flex w-7 h-7 mr-3 rounded-lg bg-slate-100 items-center justify-center text-xs font-black text-slate-600">${String.fromCharCode(65 + idx)}</span><span>${opt}</span>`;
    btn.onclick = () => answerReviewQuestion(opt, btn, q, targetAns);
    list.appendChild(btn);
  });

  document.getElementById('review-feedback').classList.add('hidden');
  document.getElementById('review-next').classList.add('hidden');
}

async function answerReviewQuestion(option, btn, q, targetAns) {
  const isCorrect = option === targetAns;
  document.querySelectorAll('#review-answer-list .review-answer-option').forEach(b => {
    b.disabled = true;
    const text = b.querySelector('span:last-child').textContent.trim();
    if (text === targetAns) b.classList.add('is-correct');
  });

  if (!isCorrect) btn.classList.add('is-wrong');

  const fb = document.getElementById('review-feedback');
  fb.className = `mt-5 rounded-lg p-4 text-sm leading-relaxed ${isCorrect ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
  fb.innerHTML = `<strong>${isCorrect ? '答對了！已從錯題本精熟移除。' : `正確答案：${targetAns}`}</strong><br>${q.explanation}`;
  fb.classList.remove('hidden');

  if (isCorrect) {
    wrongBank = wrongBank.filter(item => item.id !== q.id);
    document.getElementById('wrong-count').textContent = wrongBank.length;
    if (currentUser?.seatNo) {
      try {
        await chineseFetch('/chinese-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seatNo: currentUser.seatNo, questionId: q.id })
        });
      } catch (err) {
        console.warn('錯題精熟標記失敗:', err);
      }
    }
  }

  document.getElementById('review-next').classList.remove('hidden');
}

function advanceReview() {
  reviewIndex++;
  renderReviewQuestion();
}

async function chineseFetch(endpoint, options = {}) {
  const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
  const token = currentUser?.token;
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${base}${endpoint}`, { ...options, headers });
}

// 頁面初次載入啟動
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    if (!currentUser) {
      currentUser = (typeof sessionStorage !== 'undefined') ? JSON.parse(sessionStorage.getItem('g6_portal_user') || 'null') : null;
    }
  // 本機開發測試環境友善：若無 session 自動套用測試學童身分，避免轉址中斷測試
  if (!currentUser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    currentUser = { name: '本機測試生', seatNo: '60101', token: 'mock-dev-token' };
    sessionStorage.setItem('g6_portal_user', JSON.stringify(currentUser));
  }
  if (!currentUser) {
    window.location.replace('index.html');
    return;
  }

  document.getElementById('header-name').textContent = currentUser.name || '學生';
  document.getElementById('header-seat').textContent = `座號: ${currentUser.seatNo || '-'}`;

  // 登出與大廳
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem('g6_portal_user');
    window.location.replace('index.html');
  });

  // 分頁籤切換
  document.getElementById('tab-curriculum')?.addEventListener('click', () => switchMainTab('curriculum'));
  document.getElementById('tab-idioms')?.addEventListener('click', () => switchMainTab('idioms'));
  document.getElementById('banner-idiom-go')?.addEventListener('click', () => switchMainTab('idioms'));

  // 出版社與章節
  renderPublisherButtons();
  renderChapters();
  document.getElementById('chapter-select')?.addEventListener('change', updateChapterSummary);

  // 課本練習控制
  document.getElementById('btn-start')?.addEventListener('click', startOrResume);
  document.getElementById('btn-next')?.addEventListener('click', advanceQuestion);
  document.getElementById('result-home')?.addEventListener('click', () => {
    dailyState = null;
    showCurriculumView('view-setup');
  });
  document.getElementById('result-review')?.addEventListener('click', startReview);
  document.getElementById('btn-review')?.addEventListener('click', startReview);
  document.getElementById('review-back')?.addEventListener('click', () => showCurriculumView('view-setup'));
  document.getElementById('review-next')?.addEventListener('click', advanceReview);

  // 日曆切換
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });

  // 成語字卡控制
  document.getElementById('idiom-card-inner')?.addEventListener('click', (e) => {
    // 忽略按鈕上的點擊防觸發翻面
    if (e.target.closest('button')) return;
    toggleCardFlip();
  });
  document.getElementById('btn-flip-back')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCardFlip();
  });
  document.getElementById('btn-next-idiom')?.addEventListener('click', nextIdiom);
  document.getElementById('btn-prev-idiom')?.addEventListener('click', prevIdiom);
  document.getElementById('btn-shuffle-idiom')?.addEventListener('click', shuffleIdiom);
  document.getElementById('btn-star-idiom')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleStarCurrentIdiom();
  });
  document.getElementById('btn-speak-idiom')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const filtered = getFilteredIdioms();
    if (filtered[idiomCurrentIndex]) {
      speakText(filtered[idiomCurrentIndex].name);
    }
  });

  // 成語搜尋
  document.getElementById('idiom-search-input')?.addEventListener('input', (e) => {
    idiomSearchKeyword = e.target.value.trim();
    idiomCurrentIndex = 0;
    renderIdiomCard();
  });

  // 成語分組與收藏篩選
  document.getElementById('filter-all')?.addEventListener('click', () => {
    selectedIdiomRange = null; // 清除每 10 則限制，顯示全部 200 則
    idiomFilterOnlyStarred = false;
    document.getElementById('filter-all').className = 'px-3 py-1.5 rounded-lg bg-white text-rose-700 shadow-sm transition';
    document.getElementById('filter-starred').className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 transition flex items-center gap-1';
    renderIdiomRangeButtons();
    const filtered = getFilteredIdioms();
    const found = filtered.findIndex(item => item.id === lastIdiomId);
    idiomCurrentIndex = found !== -1 ? found : 0;
    renderIdiomCard();
  });
  document.getElementById('filter-starred')?.addEventListener('click', () => {
    selectedIdiomRange = null;
    idiomFilterOnlyStarred = true;
    document.getElementById('filter-starred').className = 'px-3 py-1.5 rounded-lg bg-white text-rose-700 shadow-sm transition flex items-center gap-1';
    document.getElementById('filter-all').className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 transition';
    renderIdiomRangeButtons();
    idiomCurrentIndex = 0;
    renderIdiomCard();
  });

  // 成語日曆月份切換
  document.getElementById('idiom-cal-prev')?.addEventListener('click', () => {
    idiomCalendarDate.setMonth(idiomCalendarDate.getMonth() - 1);
    renderIdiomCalendar();
  });
  document.getElementById('idiom-cal-next')?.addEventListener('click', () => {
    idiomCalendarDate.setMonth(idiomCalendarDate.getMonth() + 1);
    renderIdiomCalendar();
  });

  // 成語測驗控制
  document.getElementById('btn-open-idiom-quiz')?.addEventListener('click', () => startIdiomQuiz(10));
  document.getElementById('btn-idiom-quiz-next')?.addEventListener('click', advanceIdiomQuiz);
  document.getElementById('btn-idiom-quiz-restart')?.addEventListener('click', () => startIdiomQuiz(10));
  document.getElementById('btn-idiom-quiz-back-cards')?.addEventListener('click', exitIdiomQuiz);

  // 鍵盤左右鍵切換字卡
  window.addEventListener('keydown', (e) => {
    const isIdiomsTab = !document.getElementById('section-idioms')?.classList.contains('hidden');
    const isQuizActive = !document.getElementById('view-idiom-quiz')?.classList.contains('hidden');
    if (isIdiomsTab && !isQuizActive && !document.activeElement?.matches('input, textarea')) {
      if (e.key === 'ArrowRight') nextIdiom();
      if (e.key === 'ArrowLeft') prevIdiom();
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleCardFlip();
      }
    }
  });

  // 後端資料載入 (國語進度)
  try {
    const res = await chineseFetch(`/chinese-progress?seatNo=${encodeURIComponent(currentUser.seatNo)}&date=${todayKey}`);
    const json = await res.json();
    if (json.success) {
      if (json.data) {
        dailyState = json.data;
        selectedPublisher = dailyState.publisher || selectedPublisher;
        renderPublisherButtons();
        renderChapters();
        const chSelect = document.getElementById('chapter-select');
        if (chSelect) chSelect.value = dailyState.chapter;
        updateChapterSummary();
      }
      todaySummary = json.todaySummary || todaySummary;
      history = json.history || [];
      wrongBank = json.wrongQuestions || [];
      document.getElementById('wrong-count').textContent = wrongBank.length;
      renderCalendar();
    }
  } catch (err) {
    console.warn('載入國語學習進度失敗:', err);
  }

  // 載入成語星號收藏
  try {
    const starRes = await chineseFetch(`/chinese/idiom-stars?seatNo=${encodeURIComponent(currentUser.seatNo)}`);
    const starJson = await starRes.json();
    if (starJson.success && Array.isArray(starJson.starredIds)) {
      starredIdiomIds = new Set(starJson.starredIds);
      document.getElementById('star-count-badge').textContent = starredIdiomIds.size;
    }
  } catch (err) {
    console.warn('載入成語收藏清單失敗:', err);
  }

  // 載入成語學習進度、承續上次圖卡數與初始化日曆
  await loadIdiomProgress();
  });
}

// Node.js 單元測試匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DAILY_TOTAL,
    ALLOWED_PUBLISHERS,
    CURRICULUM,
    FACTS,
    INTEGRATION_FACTS,
    COMPETENCY_FACTS,
    buildDailyQuestions,
    buildIdiomQuizQuestions,
    getCalendarTotals
  };
}

