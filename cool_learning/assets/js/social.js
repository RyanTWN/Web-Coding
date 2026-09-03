// API_BASE_URL 定義於 config.js（在這支檔案之前載入），不在這裡重複宣告。
const DAILY_TOTAL = 20;
const ALLOWED_PUBLISHERS = ['康軒', '南一', '翰林'];
const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
let currentUser = JSON.parse(sessionStorage.getItem('g6_portal_user') || 'null');
let selectedPublisher = '康軒';
let dailyState = null;
let history = [];
let todaySummary = { completedAttempts: 0, totalQuestions: 0, totalScore: 0, nextAttemptNo: 1 };
let wrongBank = [];
let calendarDate = new Date(`${todayKey}T12:00:00`);
let reviewQuestions = [];
let reviewIndex = 0;

// 115 學年度國小六年級社會領域章節架構，涵蓋 108 課綱核心學習內容。
const CURRICULUM = {
  '康軒': [
    ['[六上] 1. 臺灣的現代化歷程', ['history_modern'], '交通與公衛建設、日治現代化、戰後民主化與多元族群'],
    ['[六上] 2. 民主政府與公民生活', ['governance'], '憲法權利義務、中央與地方政府、五院職權與選舉投票'],
    ['[六上] 3. 經濟生活與聰明消費', ['economics'], '需求與供給、消費權益、家庭理財規劃與全球貿易合作'],
    ['[六下] 1. 走進世界的舞台', ['world_geography'], '七大洲五大洋、世界氣候帶、地形特色與大自然奧祕'],
    ['[六下] 2. 多元繽紛的世界文化', ['global_cultures'], '世界主要宗教、傳統節慶建築、多元文化包容與遺產保育'],
    ['[六下] 3. 地球村的挑戰與展望', ['global_issues', 'international_orgs'], '氣候變遷、國際組織、SDGs 永續目標與臺灣的全球貢獻'],
    ['[六下] 4. 守護美麗的家園', ['sustainable_island'], '臺灣土地倫理、綠色能源轉型、環境保育與永續發展未來']
  ],
  '南一': [
    ['[六上] 1. 臺灣的轉變與發展', ['history_modern'], '從傳統走向現代、戰後經濟起飛、高科技產業與社會變遷'],
    ['[六上] 2. 憲政民主與法治社會', ['governance'], '國家的組成、憲法與人權、政府運作體制與公民法治素養'],
    ['[六上] 3. 市場經濟與理財投資', ['economics'], '市場買賣關係、貨幣與價格、理財風險管理與國際分工'],
    ['[六下] 1. 環遊世界看地理', ['world_geography'], '認識各大洲地理環境、氣候地形分布與人文景觀特色'],
    ['[六下] 2. 認識世界文化的萬花筒', ['global_cultures'], '全球宗教信仰、食衣住行文化特質與世界文化遺產保存'],
    ['[六下] 3. 國際組織與地球村責任', ['international_orgs', 'global_issues'], '聯合國體系、國際合作救援、環境永續發展課題與公民責任'],
    ['[六下] 4. 邁向永續臺灣新未來', ['sustainable_island'], '國土保育思維、永續能源政策、社區營造與世代共好']
  ],
  '翰林': [
    ['[六上] 1. 民主憲政與公民參與', ['governance'], '中華民國憲法體系、五權分立、地方自治與公民民主參與'],
    ['[六上] 2. 臺灣的歷史記憶與展望', ['history_modern'], '現代化啟蒙、民主開展、多元文化交流與臺灣當代印記'],
    ['[六上] 3. 現代經濟活動與理財', ['economics'], '經濟資源配置、理性消費意識、理財規劃與全球經貿交流'],
    ['[六下] 1. 世界的地理風貌', ['world_geography'], '地球表面海陸分布、各大洲自然環境與人文聚落特徵'],
    ['[六下] 2. 璀璨的世界多元文化', ['global_cultures'], '世界宗教精神、民俗節慶祭典、文化遺產維護與尊重包容'],
    ['[六下] 3. 關懷全球議題與國際合作', ['global_issues', 'international_orgs'], '全球暖化、國際援助合作、跨國非政府組織與地球公民'],
    ['[六下] 4. 綠色生活與永續國土', ['sustainable_island'], '環境保護行動、綠能低碳生活、臺灣資源永續與生態關懷']
  ]
};

// 社會人文知識庫：每筆為 [題幹, 正確答案, 誘答1, 誘答2, 誘答3, 解析]
const FACTS = {
  governance: [
    ['我國國家的最高根本大法是什麼？', '中華民國憲法', '民法', '刑法', '地方制度法', '憲法是國家的根本大法，任何法律與命令牴觸憲法者皆無效。'],
    ['我國中央政府體制中，負責制定法律的是哪一個機關？', '立法院', '行政院', '司法院', '監察院', '立法院為我國最高立法機關，行使立法權與審查預算權。'],
    ['我國中央政府體制中，最高行政機關是哪一個？', '行政院', '立法院', '司法院', '考試院', '行政院為國家最高行政機關，負責推動政務與執行法律。'],
    ['我國司法院的主要職掌是什麼？', '行使審判權與解釋憲法', '編列國家預算', '彈劾違法官員', '舉辦國家公職考試', '司法院為最高司法機關，掌理民事、刑事、行政訴訟的審判及憲法審查。'],
    ['監察院的主要職責包含下列何者？', '行使彈劾、糾舉與審計權', '制定民刑法律', '統率全國軍隊', '徵收全國各類稅收', '監察院為最高監察機關，行使彈劾、糾舉、審計及糾正權。'],
    ['我國憲法保障人民的基本權利中，受國民教育屬於下列何者？', '既是權利也是義務', '純粹只有權利', '純粹只有義務', '非憲法所保障', '受國民教育在憲法規定中既是人民的基本權利，也是國民應盡的義務。'],
    ['我國公民參與民主選舉時，憲法保障的四大選舉原則是什麼？', '普通、平等、直接、無記名', '公開、記名、差額、間接', '限制、資產、抽籤、表決', '推薦、指派、審查、公告', '普通、平等、直接、無記名（秘密投票）是現代民主選舉的核心原則。'],
    ['地方政府中，負責審議地方自治法規與監督地方施政的是什麼機關？', '地方民意機關（如市議會）', '地方行政機關（如市政府）', '各地方法院', '地方警察局', '地方民意機關（縣市議會、鄉鎮市民代表會）代表人民監督地方政府並審議法規。'],
    ['公民透過連署提出政策或法律由全體人民直接表決，這項權利稱為什麼？', '公民投票（創制與複決）', '請願權', '訴願權', '罷免權', '公民投票是落實直接民主、行使創制與複決權的重要管道。'],
    ['當人民認為行政機關的違法或不當處分損害自身權益時，首先可提起什麼救濟？', '訴願', '刑事訴訟', '直接聲請國賠', '發起公民罷免', '對於行政機關的不當或違法處分，人民得依法先向原機關之上級機關提起訴願。']
  ],
  history_modern: [
    ['清末臺灣開港通商後，主要出口的「臺灣三寶」是哪三項商品？', '茶葉、糖、樟腦', '稻米、小麥、煤礦', '絲綢、瓷器、香料', '橡膠、石油、棉花', '19世紀下半葉開港後，茶、糖、樟腦大量外銷，帶動臺灣北部市街繁榮與經濟現代化。'],
    ['清末推動臺灣現代化建設，被稱為「臺灣近代化之父」的巡撫是誰？', '劉銘傳', '沈葆楨', '施琅', '鄭成功', '劉銘傳任臺灣巡撫期間，鋪設鐵路、架設電報線、設立西學堂與郵政，奠定現代化基礎。'],
    ['日治時期完成縱貫鐵路全線通車，貫通基隆至高雄是在哪一年？', '1908 年', '1895 年', '1945 年', '1970 年', '1908年西部縱貫鐵路全線通車，大幅縮短南北交通時間，促進島內物資交流與市場一體化。'],
    ['日治時期規劃興建嘉南大圳與烏山頭水庫，被尊稱為「嘉南大圳之父」的水利工程師是誰？', '八田與一', '後藤新平', '佐久間左馬太', '矢內原忠雄', '八田與一技師設計興建烏山頭水庫與嘉南大圳，大幅改善嘉南平原灌溉條件，使農產倍增。'],
    ['1920年代臺灣知識份子成立「臺灣文化協會」，其主要宗旨是什麼？', '啟蒙大眾思想與提升臺灣文化', '組織武裝起義革命', '向日本總督府爭取減稅', '協助推廣日語運動', '蔣渭水、林獻堂等人創立臺灣文化協會，透過演講、讀報社啟迪民智，推動文化啟蒙。'],
    ['臺灣在1970年代推動以高速公路、鐵路電氣化、大煉鋼廠為主的重大建設稱為什麼？', '十大建設', '土地改革', '九年國教', '亞太營運中心', '十大建設帶動臺灣重工業與交通現代化，奠定經濟起飛與工業升級的重要基石。'],
    ['臺灣自1987年解除長達38年的戒嚴令，主要象徵著什麼發展？', '邁向自由開放與政治民主化', '停止一切國際貿易', '實施新的戶口普查', '全面改用電子貨幣', '1987年解嚴後，開放黨禁、報禁，人民集會結社自由大幅開展，開啟民主轉型新頁。'],
    ['臺灣因高科技製造業而聞名全球，其中扮演半導體聚落關鍵推手的是哪一個園區？', '新竹科學園區', '駁二藝術特區', '台中港加工區', '華山文創園區', '1980年成立的新竹科學園區引進高科技人才與技術，奠定臺灣全球「晶圓代工與半導體王國」地位。'],
    ['臺灣社會具有多元族群，除了原住民族、閩南、客家與外省族群外，近年來增加的生力軍是哪一群體？', '新住民及其子女', '荷蘭移民', '西班牙商人', '琉球移工', '近年來自東南亞及世界各國的新住民為臺灣帶來豐富多元的語言、文化與飲食色彩。'],
    ['為維護原住民族文化並落實族群平等，政府設立專責推動原住民族事務的中央部會是什麼？', '原住民族委員會', '文化部', '內政部營建署', '蒙藏委員會', '原住民族委員會專責統籌原住民族教育、文化、土地與社會福利等各項權益保障。']
  ],
  economics: [
    ['在自由市場經濟中，決定商品價格的最主要機制是什麼？', '供給與需求的相互作用', '政府抽籤決定', '消費者單方面規定', '生產者任意隨機訂價', '當需求大於供給時價格容易上漲，當供給大於需求時價格容易下跌，兩者達到均衡。'],
    ['「機會成本」在經濟學上所代表的意涵是什麼？', '做出選擇時所放棄的代價中價值最高者', '購買商品時實際支付的金錢', '製造產品時消耗的所有原料成本', '銀行借款時收取的利息總和', '在面臨多種選擇時，選擇某一方案而放棄其他方案中價值最高的一項，即為機會成本。'],
    ['當市面上流通的貨幣過多，導致物價普遍且持續上漲的現象稱為什麼？', '通貨膨脹', '通貨緊縮', '經濟蕭條', '停滯性貿易', '通貨膨脹是指一般物價水準持續且顯著上漲，導致貨幣購買力相對縮水。'],
    ['我國專門負責保護消費者權益、處理消費申訴專線的機構或服務電話是哪一個？', '1950 全國消費者服務專線', '110 報案台', '119 救護台', '165 反詐騙諮詢', '1950是行政院消費者保護會與各縣市政府消保中心的全國專線，提供消費糾紛諮詢。'],
    ['消費者購買包裝食品時，下列哪一項標示是判斷新鮮度與安全最重要的依據？', '有效日期與保存期限', '包裝袋顏色與造型', '代言明星的姓名', '超市店員的個人推薦', '食品標籤上的有效日期、成分、營養標示是保障食用安全最重要的法規資訊。'],
    ['投資理財時常說「不要把雞蛋放在同一個籃子裡」，主要是為了達到什麼目的？', '分散風險', '節省手續費', '保證獲得最高暴利', '逃避政府合法稅收', '多元資產配置可以避免單一投資標的虧損造成致命損失，達成降低風險目標。'],
    ['國際貿易中，一個國家向其他國家購買商品或勞務的行為稱為什麼？', '進口', '出口', '轉運', '關稅', '自外國購入貨品稱為進口（Import），將本國生產貨物銷往國外稱為出口（Export）。'],
    ['各國依據自身資源、技術優勢生產最擅長的產品並互相貿易，這種經濟現象稱為什麼？', '國際分工與比較利益', '貿易障礙壁壘', '自給自足封閉經濟', '計畫配給制度', '各國專注生產具有相對優勢的商品並進行貿易交換，能提升全球整體經濟效益與福祉。'],
    ['日常生活中使用信用卡或行動支付購物，本質上屬於哪一種交易形式？', '非現金支付（信用消費）', '以物易物', '貴金屬交易', '無償贈與', '信用卡先由發卡機構代墊款項，持卡人日後依約清償，屬於延期付款的信用消費行為。'],
    ['政府為了提供公共建設與社會福利，依法向國民與企業徵收的財政收入稱為什麼？', '稅收', '捐款', '罰金', '利息', '租稅是國家的主要財政收入來源，用以興辦教育、醫療、國防與交通公共服務。']
  ],
  world_geography: [
    ['地球表面由陸地與海洋組成，其中陸地與海洋的面積比例大約是多少？', '陸地約 3 成，海洋約 7 成', '陸地約 5 成，海洋約 5 成', '陸地約 8 成，海洋約 2 成', '陸地約 1 成，海洋約 9 成', '地球表面約有 71% 是海洋，陸地僅占約 29%，因此地球常被稱為藍色星球。'],
    ['世界上總面積最大、人口最多的大洲是哪一個洲？', '亞洲', '非洲', '歐洲', '北美洲', '亞洲是世界第一大洲，地理範圍廣闊，人口超過世界總人口的一半。'],
    ['地球上平均海拔最高、被稱為「世界屋脊」的高原是什麼高原？', '青藏高原', '巴西高原', '德干高原', '東非高原', '青藏高原平均海拔在4000公尺以上，包含喜馬拉雅山脈與世界最高峰珠穆朗瑪峰。'],
    ['世界上長度最長、流經非洲東北部的著名河流是哪一條？', '尼羅河', '亞馬遜河', '長江', '密西西比河', '尼羅河全長超過6600公里，孕育了古埃及燦爛的文明。'],
    ['世界上面積最大、流經南美洲且流域水量最豐沛的熱帶雨林河流是哪一條？', '亞馬遜河', '剛果河', '萊茵河', '多瑙河', '南美洲的亞馬遜河擁有全球最大的流域面積與流量，其雨林被稱為「地球之肺」。'],
    ['赤道附近全年高溫多雨的氣候類型稱為什麼氣候？', '熱帶雨林氣候', '溫帶地中海型氣候', '寒帶苔原氣候', '熱帶沙漠氣候', '赤道兩側因太陽常年直射且對流旺盛，形成長年高溫、多雨的熱帶雨林氣候。'],
    ['歐洲西部常年受到哪一種風向吹拂與暖流調節，形成冬溫夏涼的溫帶海洋性氣候？', '西風與北大西洋暖流', '季風與親潮寒流', '信風與加利福尼亞寒流', '極地東風', '歐洲西部受北大西洋暖流增溫增濕及盛行西風吹拂，氣候溫和濕潤、年溫差較小。'],
    ['世界上面積最大、氣候極度乾燥炎熱的熱帶沙漠是哪一個？', '撒哈拉沙漠', '戈壁沙漠', '阿他加馬沙漠', '澳洲大沙漠', '非洲北部的撒哈拉沙漠面積超過900萬平方公里，是全球面積最大的熱帶沙漠。'],
    ['大洋洲中面積最大、擁有無尾熊與袋鼠等獨特有袋類動物的國家是哪一個？', '澳洲', '紐西蘭', '斐濟', '帛琉', '澳洲大陸長期與其他陸地隔離，保留了袋鼠、無尾熊、鴨嘴獸等眾多特有物種。'],
    ['環繞太平洋周圍、因板塊擠壓運動劇烈而地震與火山活動特別頻繁的區域稱為什麼？', '環太平洋地震火山帶（火環帶）', '大西洋中洋脊', '東非大裂谷', '阿爾卑斯褶曲帶', '全球約八成以上的淺層地震與活火山均分布在環太平洋板塊交界處的「火環帶」。']
  ],
  global_cultures: [
    ['發源於中東、信奉唯一真主阿拉，其經典為《古蘭經》的宗教是什麼？', '伊斯蘭教', '佛教', '印度教', '神道教', '伊斯蘭教信徒稱為穆斯林，遵守五功規範，不吃豬肉，每日面向麥加方向禮拜。'],
    ['發源於古印度、強調因果業報與慈悲智慧，其創始者為釋迦牟尼的宗教是什麼？', '佛教', '基督教', '道教', '猶太教', '佛教由釋迦牟尼創立，提倡四聖諦與八正道，在東亞與東南亞廣為流傳。'],
    ['全球信徒人數最多、以《聖經》為經典，紀念耶穌誕生的節慶為聖誕節的宗教是什麼？', '基督教（包含天主教、東正教、新教）', '伊斯蘭教', '印度教', '錫克教', '基督教以耶穌基督的博愛救贖為核心信仰，其文化深刻形塑了歐美社會的曆法與節慶。'],
    ['印度居民多數信奉印度教，在他們的傳統文化中，被視為神聖而受到尊重不食用的動物是什麼？', '牛', '馬', '羊', '駱駝', '印度教將黃牛視為神聖生命的象徵，因此虔誠的印度教徒多數不食用牛肉。'],
    ['聯合國教科文組織（UNESCO）為了保護全球珍貴的人類文化遺產與自然景觀，建立了什麼名錄？', '世界遺產名錄（World Heritage）', '世界吉尼斯紀錄', '諾貝爾和平獎名單', '奧林匹克榮譽榜', 'UNESCO的世界遺產公約旨在跨越國界，共同維護全人類共有的傑出文化與自然資產。'],
    ['面對世界上多元不同的文化、語言與風俗習慣，公民最適當的態度是什麼？', '相互尊重、理解與包容', '強迫他人接受自己的文化', '嘲笑甚至歧視不同的風俗', '拒絕與任何外國人交流', '多元文化的核心精神是平等互惠，以開闊視野理解差異，促進社會族群和諧。'],
    ['義大利威尼斯面臨地層下陷與海水倒灌，這座世界文化遺產城市所反映的危機提醒我們什麼？', '人類文化資產極易受氣候與環境威脅', '歷史建築永遠不會損壞', '海邊不應該建設任何城市', '觀光收入能自動修復一切古蹟', '全球暖化與極端氣候讓許多珍貴的世界文化與自然遺產正面臨存亡危機。'],
    ['日本在每年春季民眾習慣前往公園席地而坐欣賞花卉，這項傳統文化活動稱為什麼？', '花見（賞櫻文化）', '中秋賞月', '端午划船', '萬聖節變裝', '「花見」是日本春季象徵性的文化活動，人們在櫻花盛開之際與親友共聚感受大自然變化。'],
    ['拉丁美洲地區許多國家的官方語言為西班牙語或葡萄牙語，主要歷史原因是什麼？', '大航海時代歐洲殖民歷史的影響', '因為地理位置鄰近歐洲本土', '當地原住民自古流傳的母語', '聯合國強制推行的統一規定', '16世紀歐洲大航海時代西班牙與葡萄牙的探險與殖民統治，深刻影響了拉丁美洲的語言與宗教。'],
    ['伊斯蘭教齋戒月（Ramadan）期間，穆斯林信徒白天禁食，這項習俗的主要意涵是什麼？', '鍛鍊心志、體會貧困者飢餓並行善', '純粹為了減重保持身材', '避免浪費農產存糧', '慶祝農作物大豐收', '齋戒月旨在透過自律克制慾望、淨化心靈，並激發對弱勢與貧窮者的同理心與布施實踐。']
  ],
  global_issues: [
    ['溫室氣體過度排放導致大氣溫度上升的全球性環境危機稱為什麼？', '全球暖化（氣候變遷）', '地磁倒轉', '太陽黑子消失', '海水淡化過速', '燃燒石化燃料排放大量二氧化碳使溫室效應加劇，造成極端氣候頻傳與海平面上升。'],
    ['聯合國於2015年通過指導全球共同邁向永續發展的綱領共有幾項核心目標（SDGs）？', '17 項核心目標', '5 項核心目標', '100 項核心目標', '30 項核心目標', 'SDGs涵蓋消除貧窮、優質教育、性別平權、潔淨能源、氣候行動等17項永續發展目標。'],
    ['南北極與高山冰川快速融化，對低窪沿海地區與島嶼國家帶來的直接威脅是什麼？', '海平面上升引發國土淹沒危機', '海水全面乾涸乾旱', '海底地震完全停止', '沿海陸地面積大幅增加', '冰川消融與海水熱膨脹導致海平面升高，吐瓦魯等太平洋島國甚至面臨舉國遷徙的風險。'],
    ['海洋中累積大量塑膠垃圾裂解為微小粒子，被海洋生物誤食進入食物鏈，這種物質稱為什麼？', '微塑膠（塑膠微粒）', '浮游植物', '海洋礦物質', '天然珊瑚骨骼', '微塑膠難以自然降解且容易吸附有毒物質，透過生態食物網最終可能影響人類身體健康。'],
    ['因戰爭、迫害或嚴重天災被迫離開家鄉逃亡到其他國家的無辜民眾稱為什麼？', '難民', '遊客', '留學生', '外交特使', '難民問題是當代重大的人權與人道議題，需國際社會通力合作提供庇護與人道救援物資。'],
    ['全球各國貧富不均與資源分配失衡的現象，通常以什麼指標或名詞來探討？', '貧富差距（貧困線與分配正義）', '智力測驗平均數', '人均手機持有數量', '國家奧運金牌數目', '全球資源集中於少數已開發國家與富裕階層，如何落實公平貿易與扶貧是地球村共同課題。'],
    ['熱帶雨林（如亞馬遜雨林）遭到大量砍伐焚燒改闢農牧用地，對地球造成的嚴重後果是什麼？', '碳吸收量減少與生物多樣性急遽喪失', '全球降雨全面停止', '地球自轉速度顯著變快', '大氣中氧氣含量瞬間歸零', '雨林是全球重要的碳匯與物種基因庫，大規模濫伐會加速氣候變遷並使珍貴物種滅絕。'],
    ['地球公民在日常生活中落實減碳生活，下列何者屬於最具體且正向的做法？', '隨手關燈、搭乘大眾運輸與自備環保餐具', '天天購買拋棄式塑膠用具', '冷氣溫度調至最低且門窗大開', '出門短途也堅持開大排氣量汽車', '節能減碳始於生活點滴，減少一次性浪費並善用綠色運輸，人人都能為環境盡心力。'],
    ['過度抽取地下水與破壞水資源循環，在沿海地帶最容易引發什麼環境災害？', '地層下陷與海水倒灌', '火山爆發', '酸雨濃度下降', '日照時間縮短', '超抽地下水造成地層土壤孔隙壓密下陷，逢颱風暴雨極易引發海水倒灌造成長年水患。'],
    ['為減少石化能源對地球的污染與碳排放，各國積極發展的替代乾淨能源統稱為什麼？', '再生能源（綠色能源）', '煤炭與重油', '柴油與天然氣', '泥炭與木炭', '太陽能、風力、水力、地熱能等再生能源在使用過程中碳排放低且可自然補充。']
  ],
  international_orgs: [
    ['第二次世界大戰後成立、目前全球最具代表性且旨在維持國際和平與安全的國際組織是什麼？', '聯合國（UN）', '世界貿易組織（WTO）', '石油輸出國組織（OPEC）', '北大西洋公約組織（NATO）', '聯合國成立於1945年，總部設於紐約，宗旨在於維護全球安全、促進國際合作與人權發展。'],
    ['專門負責全球公共衛生防疫、協調跨國疾病防治工作的聯合國專門機構是什麼？', '世界衛生組織（WHO）', '國際貨幣基金（IMF）', '國際民航組織（ICAO）', '世界智慧財產權組織（WIPO）', 'WHO致力於全球流行病監測、疫苗分配與提升全民健康水準。'],
    ['致力於促進全球自由貿易、協調跨國貿易爭端並被譽為「經濟聯合國」的組織是什麼？', '世界貿易組織（WTO）', '亞太經濟合作會議（APEC）', '國際奧林匹克委員會（IOC）', '世界自然基金會（WWF）', 'WTO制定國際貿易規則並處理會員國間的貿易爭端，臺灣於2002年正式加入成為會員。'],
    ['臺灣以「中華台北」名義加入、聚焦亞太區域經濟整合與首長對話的區域組織是什麼？', '亞太經濟合作會議（APEC）', '東南亞國家協會（ASEAN）', '歐洲聯盟（EU）', '美洲國家組織（OAS）', 'APEC是亞太地區重要的官方經濟論壇，臺灣歷年均指派領袖代表參與年度峰會。'],
    ['由民間發起成立、不隸屬於政府且跨國推動人道援助、環境保育的組織統稱為什麼？', '非政府組織（NGO）', '國營事業機構', '跨國營利財團', '地方警察機關', 'NGO（如無國界醫生、綠色和平組織、臺灣慈濟與世界展望會）在國際社會扮演強大的非官方援助力量。'],
    ['獲頒諾貝爾和平獎、派遣志願醫護人員深入戰亂與疫病災區提供緊急醫療救援的國際NGO是哪一個？', '無國界醫生（MSF）', '國際扶輪社', '聯合國安全理事會', '世界銀行', '無國界醫生秉持人道主義與中立原則，超越種族、宗教與政治界線，救治戰火危難中的生命。'],
    ['臺灣雖然面臨外交處境挑戰，但在全球事務中常以什麼方式展現「Taiwan Can Help」的正面形象？', '提供人道醫療援助與分享農業科技技術', '發動跨國軍事對抗', '完全封閉拒絕與國際交往', '單方面退出所有國際公約', '臺灣派遣國際醫療團、農技團及捐贈救援物資，展現人道關懷與負責任地球公民的實力。'],
    ['專門負責保護戰亂中的平民與戰俘、以紅白十字或紅新月為標誌的國際人道組織是什麼？', '國際紅十字會（ICRC）', '世界旅遊組織', '國際郵政聯盟', '國際標準化組織（ISO）', '紅十字會依據日內瓦公約，在戰火衝突中提供中立的人道庇護、尋親與醫療救助服務。'],
    ['聯合國兒童基金會（UNICEF）的核心工作宗旨是什麼？', '保障全球兒童的生存權、教育權與免於受虐', '管理全球跨國銀行利率', '推動成人職業證照考試', '協調國際體育錦標賽', 'UNICEF專注於改善貧困、戰亂與災區兒童的營養、飲用水、疫苗接種與受教育權利。'],
    ['臺灣各民間志工團隊常在國際發生大地震等重大災害時迅速出動前往搜救，這展現了什麼公民素養？', '跨越國界的世界公民責任感與人道關懷', '僅僅為了宣傳知名度', '尋找廉價勞工的商業行為', '干預他國內政的政治目的', '天災無情但人間有愛，跨國搜救與物資捐贈是體現全球人道互助與地球公民意識的最佳典範。']
  ],
  sustainable_island: [
    ['臺灣為追求環境永續與降低對進口化石燃料的依賴，積極推動的兩大主力再生能源是什麼？', '太陽光電與離岸風力發電', '大量燃燒燃煤與木柴', '全面重啟石化煉油', '進口更多柴油發電機', '臺灣海峽擁有世界級優良風場，中南部具備充足日照，風電與光電是當前綠能轉型核心。'],
    ['為維護臺灣的高山水土與生物多樣性，由國家依法劃定並受到最嚴格保護的自然區域是什麼？', '國家公園與自然保留區', '工業特定開發區', '高爾夫球渡假村', '採礦砂石專用區', '我國依法設立墾丁、玉山、陽明山、太魯閣、雪霸等國家公園，保存珍貴生態景觀與物種。'],
    ['居民凝聚在地共識、發揮地方特色以改善居住環境與傳承文化的基層行動稱為什麼？', '社區總體營造', '都市強制拆遷', '商業促銷拍賣會', '封閉社區圍牆運動', '社區營造鼓勵居民共同參與地方公共事務，營造富有人情味與永續生機的在地生活圈。'],
    ['臺灣在日常生活中實施「垃圾強制分類」與資源回收政策，主要推動的是哪一種經濟模式？', '循環經濟（資源再利用）', '一次性線性消費經濟', '大量焚燒掩埋經濟', '全面棄置廢棄物經濟', '透過垃圾減量、資源回收再利用，讓物料在經濟系統中不斷循環，降低對天然資源的開採衝擊。'],
    ['購買當地且當季生產的食材（吃在地、食當季），在環境永續上有什麼顯著好處？', '縮短食物里程並減少碳足跡', '讓食品售價翻倍昂貴', '確保所有食物永不過期', '消滅所有農夫的辛勞', '減少長途冷鏈運輸與包裝所產生的碳排放，同時能支持在地小農與維護食品新鮮。'],
    ['臺灣原住民族傳統文化中對於土地與森林常懷抱敬畏感恩之心，這種智慧被稱為什麼？', '生態智慧與土地倫理', '掠奪性開發思維', '工業生產標準化', '單一作物密集種植', '原住民順應四季自然節律、適度狩獵採集讓土地休養生息，蘊含著深厚的生態永續倫理。'],
    ['臺灣四面環海，推動海洋永續發展（如永續漁業、海洋保育區），主要是為了避免什麼危機？', '海洋資源枯竭與過度捕撈', '海水潮汐停止運動', '海島面積快速沉沒', '海風停止吹拂陸地', '過度捕撈與棲地破壞導致全球漁業資源面臨危機，推動永續海鮮與海洋保護刻不容緩。'],
    ['我國推動的「國土計畫法」主要目的是為了達成什麼國家目標？', '引導土地合理配置、保育自然環境與防杜災害', '將所有山坡地全數鏟平建工廠', '全面禁止任何農業耕種', '強迫所有人口集中搬遷至同一城市', '國土計畫以確保國土安全、保育自然生態、維護糧食安全與引導城鄉永續發展為核心目標。'],
    ['現代公民在水資源管理上，除了節約用水外，家庭中常用來沖廁或澆花的水屬於哪一種？', '中水回收再利用（如雨水收集或洗澡水）', '高純度實驗室蒸餾水', '昂貴進口礦泉水', '含高濃度化學藥劑之廢水', '回收雨水或生活雜排水經簡易過濾後用於澆灌花木或沖洗地面，能大幅提升水資源利用效率。'],
    ['面對未來極端氣候挑戰，城市在規劃時增加綠地透水鋪面與滯洪池，讓城市像海綿一樣吸水的概念稱為什麼？', '海綿城市（韌性城市）', '水泥鋼鐵城堡', '玻璃全封閉巨蛋', '全柏油硬化市鎮', '海綿城市透過增加透水地面、雨水花園與滯洪設施，在暴雨時吸水蓄水、乾旱時釋水再利用，提升抗災韌性。']
  ]
};

function hashSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
  return Math.abs(hash);
}

function seededShuffle(items, seedText) {
  const output = [...items];
  let seed = hashSeed(seedText) || 1;
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 >>> 0; return seed / 4294967296; };
  for (let index = output.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function findChapter(publisher, title) {
  return (CURRICULUM[publisher] || []).find(item => item[0] === title);
}

function buildDailyQuestions(publisher, chapterTitle, attemptNo = 1) {
  const chapter = findChapter(publisher, chapterTitle);
  const publisherSlug = { '康軒': 'knsh', '南一': 'nani', '翰林': 'hanlin' }[publisher];
  const chapterNo = (CURRICULUM[publisher] || []).findIndex(item => item[0] === chapterTitle) + 1;
  const source = (chapter?.[1] || []).flatMap(topic => (FACTS[topic] || []).map((fact, index) => ({ topic, fact, index })));
  const expanded = source.flatMap(({ topic, fact, index }) => [0, 1].map(variant => {
    const [prompt, correct, ...rest] = fact;
    const explanation = rest.pop();
    const id = `soc-${publisherSlug}-${chapterNo}-${topic}-${index + 1}-${variant + 1}`;
    return {
      id,
      kind: variant ? '觀念確認' : '單元練習',
      question: variant ? `複習觀念：${prompt}` : prompt,
      options: seededShuffle([correct, ...rest], `${todayKey}-${currentUser?.seatNo || 'guest'}-${attemptNo}-${id}`),
      answer: correct,
      explanation
    };
  }));
  return seededShuffle(expanded, `${currentUser?.seatNo || 'guest'}-${todayKey}-${attemptNo}-${publisher}-${chapterTitle}`).slice(0, DAILY_TOTAL);
}

function getCalendarTotals(records, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  return records.filter(item => item.date.startsWith(prefix)).reduce((total, item) => ({
    completedAttempts: total.completedAttempts + Number(item.completedAttempts || 0),
    totalQuestions: total.totalQuestions + Number(item.totalQuestions || 0),
    totalScore: total.totalScore + Number(item.totalScore || 0)
  }), { completedAttempts: 0, totalQuestions: 0, totalScore: 0 });
}

function showToast(message, tone = 'slate') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toast-text').textContent = message;
  document.getElementById('toast-bg').className = `${tone === 'rose' ? 'bg-rose-600' : tone === 'emerald' ? 'bg-emerald-600' : 'bg-slate-800'} text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm`;
  toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
  setTimeout(() => toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none'), 2200);
}

function showView(id) {
  ['view-setup', 'view-quiz', 'view-result', 'view-review'].forEach(view => {
    const el = document.getElementById(view);
    if (el) el.classList.toggle('hidden', view !== id);
  });
}

function renderPublisherButtons() {
  const container = document.getElementById('publisher-list');
  if (!container) return;
  container.innerHTML = '';
  ALLOWED_PUBLISHERS.forEach(publisher => {
    const button = document.createElement('button');
    const active = publisher === selectedPublisher;
    button.className = `py-3 rounded-2xl border-2 font-black transition ${active ? 'border-orange-500 bg-orange-50 text-orange-800 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`;
    button.textContent = publisher;
    button.disabled = Boolean(dailyState);
    button.onclick = () => { selectedPublisher = publisher; renderPublisherButtons(); renderChapterOptions(); };
    container.appendChild(button);
  });
}

function renderChapterOptions(preferred) {
  const select = document.getElementById('chapter-select');
  if (!select) return;
  select.innerHTML = '';
  (CURRICULUM[selectedPublisher] || []).forEach(([title]) => select.add(new Option(title, title)));
  if (preferred && findChapter(selectedPublisher, preferred)) select.value = preferred;
  select.disabled = Boolean(dailyState);
  updateChapterSummary();
}

function updateChapterSummary() {
  const select = document.getElementById('chapter-select');
  const summaryEl = document.getElementById('chapter-summary');
  if (!select || !summaryEl) return;
  const chapter = findChapter(selectedPublisher, select.value);
  summaryEl.innerHTML = `<strong>${selectedPublisher}版課程重點：</strong>${chapter?.[2] || ''}<br><span class="text-orange-800/70">題庫版本：115-G6-SOCIAL-1</span>`;
}

async function loadProgress() {
  const response = await socialFetch(`/social-progress?seatNo=${encodeURIComponent(currentUser.seatNo)}&date=${todayKey}`);
  if (response.status === 401) return logout();
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || '無法載入社會人文學科進度');
  dailyState = result.data;
  history = result.history || [];
  todaySummary = result.todaySummary || todaySummary;
  wrongBank = result.wrongQuestions || [];
  const wrongCountEl = document.getElementById('wrong-count');
  if (wrongCountEl) wrongCountEl.textContent = wrongBank.length;
  if (dailyState) {
    if (!dailyState.completed && dailyState.answers.length > dailyState.currentIndex) {
      dailyState.currentIndex = Math.min(DAILY_TOTAL, dailyState.answers.length);
    }
    selectedPublisher = dailyState.publisher;
    renderPublisherButtons();
    renderChapterOptions(dailyState.chapter);
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.innerHTML = dailyState.completed
        ? `今日第 ${dailyState.attemptNo} 回合已完成，點此再測 20 題 <i class="fa-solid fa-arrow-rotate-right ml-1"></i>`
        : `繼續今日第 ${dailyState.attemptNo} 回合練習（已完成 ${dailyState.answers.length}/${DAILY_TOTAL} 題） <i class="fa-solid fa-arrow-right ml-1"></i>`;
    }
  } else {
    renderPublisherButtons();
    renderChapterOptions();
    const startBtn = document.getElementById('btn-start');
    if (startBtn) {
      startBtn.innerHTML = `開始今日 20 題（第 ${todaySummary.nextAttemptNo} 回合） <i class="fa-solid fa-arrow-right ml-1"></i>`;
    }
  }
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const title = document.getElementById('cal-title');
  const summaryEl = document.getElementById('completion-count');
  if (!grid || !title) return;
  grid.innerHTML = '';
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  title.textContent = `${year} 年 ${month + 1} 月`;
  const totals = getCalendarTotals(history, year, month);
  if (summaryEl) summaryEl.textContent = `${totals.totalQuestions} 題・${totals.totalScore} 分`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const recordsByDate = new Map(history.map(item => [item.date, item]));
  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell rounded-xl bg-slate-50/50';
    grid.appendChild(cell);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = recordsByDate.get(cellDate);
    const isToday = cellDate === todayKey;
    const button = document.createElement('button');
    button.className = `calendar-cell rounded-xl text-xs font-black flex flex-col items-center justify-center transition border ${record ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : isToday ? 'border-orange-400 bg-orange-50 text-orange-800' : 'bg-slate-50 border-transparent text-slate-600'}`;
    button.innerHTML = `<span>${day}</span>${record ? `<span class="text-[9px] opacity-90">${record.completedAttempts}次</span>` : ''}`;
    button.onclick = () => {
      const detailEl = document.getElementById('calendar-detail');
      if (detailEl) {
        detailEl.textContent = record
          ? `${cellDate}：完成 ${record.completedAttempts} 次，共 ${record.totalQuestions} 題、得分 ${record.totalScore} 分`
          : `${cellDate}：尚無測驗紀錄`;
      }
    };
    grid.appendChild(button);
  }
  const todayRecord = recordsByDate.get(todayKey);
  const todayStatus = document.getElementById('today-status');
  if (todayStatus) {
    todayStatus.textContent = todayRecord
      ? `今日已累積 ${todayRecord.completedAttempts} 次測驗（${todayRecord.totalQuestions} 題・${todayRecord.totalScore} 分）`
      : '完成今日 20 題即可點亮日曆';
  }
}

async function startQuiz() {
  const chapterTitle = document.getElementById('chapter-select').value;
  if (!dailyState || dailyState.completed) {
    const attemptNo = dailyState?.completed ? todaySummary.nextAttemptNo : (dailyState?.attemptNo || todaySummary.nextAttemptNo);
    const questions = buildDailyQuestions(selectedPublisher, chapterTitle, attemptNo);
    dailyState = {
      date: todayKey,
      attemptNo,
      publisher: selectedPublisher,
      chapter: chapterTitle,
      curriculumVersion: '115-G6-SOCIAL-1',
      questions,
      answers: [],
      wrongQuestions: [],
      currentIndex: 0,
      completed: false,
      score: 0
    };
    await saveProgress();
  }
  showView('view-quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const question = dailyState.questions[dailyState.currentIndex];
  if (!question) return;
  const progressText = `第 ${dailyState.currentIndex + 1} / ${DAILY_TOTAL} 題`;
  document.getElementById('quiz-progress').textContent = progressText;
  document.getElementById('quiz-badge').textContent = `${dailyState.publisher}・${dailyState.chapter}`;
  document.getElementById('quiz-bar').style.width = `${((dailyState.currentIndex + 1) / DAILY_TOTAL) * 100}%`;
  document.getElementById('question-kind').textContent = question.kind || '單元練習';
  document.getElementById('question-text').textContent = question.question;
  const list = document.getElementById('answer-list');
  list.innerHTML = '';
  const feedback = document.getElementById('feedback');
  feedback.className = 'hidden mt-5 rounded-2xl p-4 text-sm leading-relaxed';
  feedback.textContent = '';
  const nextBtn = document.getElementById('btn-next');
  nextBtn.classList.add('hidden');
  const answered = dailyState.answers[dailyState.currentIndex];
  question.options.forEach((option, idx) => {
    const button = document.createElement('button');
    const label = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;
    button.className = 'answer-option w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-orange-50/50 text-left font-bold transition flex items-start gap-3';
    button.innerHTML = `<span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">${label}</span><span>${option}</span>`;
    if (answered) {
      button.disabled = true;
      if (option === question.answer) button.classList.add('is-correct');
      if (option === answered.selected && !answered.isCorrect) button.classList.add('is-wrong');
    } else {
      button.onclick = () => selectAnswer(option);
    }
    list.appendChild(button);
  });
  if (answered) {
    feedback.classList.remove('hidden');
    feedback.classList.add(answered.isCorrect ? 'bg-emerald-50' : 'bg-rose-50', answered.isCorrect ? 'text-emerald-900' : 'text-rose-900', answered.isCorrect ? 'border-emerald-200' : 'border-rose-200', 'border');
    feedback.innerHTML = `<strong>${answered.isCorrect ? '<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i> 答對了！' : '<i class="fa-solid fa-circle-xmark text-rose-500 mr-1"></i> 答錯了！正確答案是：' + question.answer}</strong><p class="mt-2 text-xs opacity-90">${question.explanation}</p>`;
    nextBtn.classList.remove('hidden');
  }
}

async function selectAnswer(selected) {
  const question = dailyState.questions[dailyState.currentIndex];
  const isCorrect = selected === question.answer;
  dailyState.answers[dailyState.currentIndex] = {
    id: question.id,
    selected,
    isCorrect
  };
  if (!isCorrect && !dailyState.wrongQuestions.some(item => item.id === question.id)) {
    dailyState.wrongQuestions.push(question);
  }
  await saveProgress();
  renderQuizQuestion();
}

async function finishQuiz() {
  const correctCount = dailyState.answers.filter(item => item.isCorrect).length;
  dailyState.completed = true;
  dailyState.score = Math.round((correctCount / DAILY_TOTAL) * 100);
  await saveProgress();
  document.getElementById('result-attempt').textContent = `本日第 ${dailyState.attemptNo} 回合測驗紀錄`;
  document.getElementById('result-correct').textContent = `${correctCount} / ${DAILY_TOTAL} 題`;
  document.getElementById('result-score').textContent = `${dailyState.score} 分`;
  const todayTotalCount = (todaySummary.totalQuestions || 0);
  const todayTotalScore = (todaySummary.totalScore || 0);
  document.getElementById('result-today-total').textContent = `今日累計：完成 ${todaySummary.completedAttempts} 回合・${todayTotalCount} 題・總分 ${todayTotalScore} 分`;
  showView('view-result');
}

async function saveProgress() {
  const payload = {
    seatNo: currentUser.seatNo,
    date: dailyState.date,
    attemptNo: dailyState.attemptNo,
    publisher: dailyState.publisher,
    chapter: dailyState.chapter,
    questions: dailyState.questions,
    answers: dailyState.answers,
    wrongQuestions: dailyState.wrongQuestions,
    currentIndex: dailyState.currentIndex,
    completed: dailyState.completed,
    score: dailyState.score
  };
  const response = await socialFetch('/social-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (response.status === 401) return logout();
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || '儲存社會人文學科進度失敗');
  todaySummary = result.todaySummary || todaySummary;
}

function startReview() {
  if (wrongBank.length === 0) {
    showToast('目前沒有待複習的錯題！', 'emerald');
    return;
  }
  reviewQuestions = [...wrongBank];
  reviewIndex = 0;
  showView('view-review');
  renderReviewQuestion();
}

function renderReviewQuestion() {
  const emptyEl = document.getElementById('review-empty');
  const contentEl = document.getElementById('review-content');
  const metaEl = document.getElementById('review-meta');
  if (reviewQuestions.length === 0 || reviewIndex >= reviewQuestions.length) {
    emptyEl.classList.remove('hidden');
    contentEl.classList.add('hidden');
    metaEl.textContent = '所有錯題皆已精熟！';
    document.getElementById('wrong-count').textContent = '0';
    return;
  }
  emptyEl.classList.add('hidden');
  contentEl.classList.remove('hidden');
  const question = reviewQuestions[reviewIndex];
  metaEl.textContent = `待複習：${reviewIndex + 1} / ${reviewQuestions.length} 題`;
  document.getElementById('review-badge').textContent = question.kind || '錯題複習';
  document.getElementById('review-question').textContent = question.question;
  const list = document.getElementById('review-answers');
  list.innerHTML = '';
  const feedback = document.getElementById('review-feedback');
  feedback.className = 'hidden mt-5 rounded-2xl p-4 text-sm';
  feedback.textContent = '';
  const nextBtn = document.getElementById('review-next');
  nextBtn.classList.add('hidden');
  question.options.forEach((option, idx) => {
    const button = document.createElement('button');
    const label = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;
    button.className = 'review-answer-option w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-orange-50/50 text-left font-bold transition flex items-start gap-3';
    button.innerHTML = `<span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-black shrink-0">${label}</span><span>${option}</span>`;
    button.onclick = () => selectReviewAnswer(option);
    list.appendChild(button);
  });
}

async function selectReviewAnswer(selected) {
  const question = reviewQuestions[reviewIndex];
  const isCorrect = selected === question.answer;
  const list = document.getElementById('review-answers');
  list.querySelectorAll('button').forEach(btn => {
    btn.disabled = true;
    if (btn.innerText.includes(question.answer)) btn.classList.add('is-correct');
    if (btn.innerText.includes(selected) && !isCorrect) btn.classList.add('is-wrong');
  });
  const feedback = document.getElementById('review-feedback');
  feedback.classList.remove('hidden');
  feedback.classList.add(isCorrect ? 'bg-emerald-50' : 'bg-rose-50', isCorrect ? 'text-emerald-900' : 'text-rose-900', isCorrect ? 'border-emerald-200' : 'border-rose-200', 'border');
  feedback.innerHTML = `<strong>${isCorrect ? '<i class="fa-solid fa-circle-check text-emerald-500 mr-1"></i> 答對了！已標記為精熟掌握' : '<i class="fa-solid fa-circle-xmark text-rose-500 mr-1"></i> 答錯了！正確答案是：' + question.answer}</strong><p class="mt-2 text-xs opacity-90">${question.explanation}</p>`;
  if (isCorrect) {
    try {
      await socialFetch('/social-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNo: currentUser.seatNo, questionIds: [question.id] })
      });
      wrongBank = wrongBank.filter(item => item.id !== question.id);
      document.getElementById('wrong-count').textContent = wrongBank.length;
    } catch (e) {
      console.error('錯題掌握標記失敗:', e);
    }
  }
  const nextBtn = document.getElementById('review-next');
  nextBtn.classList.remove('hidden');
}

async function socialFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (currentUser?.token) headers.set('Authorization', `Bearer ${currentUser.token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

function logout() {
  sessionStorage.removeItem('g6_portal_user');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!currentUser || !currentUser.seatNo) {
    window.location.href = 'index.html';
    return;
  }
  const headerName = document.getElementById('header-name');
  const headerSeat = document.getElementById('header-seat');
  if (headerName) headerName.textContent = currentUser.name || '學生';
  if (headerSeat) headerSeat.textContent = `座號：${currentUser.seatNo}`;
  document.getElementById('btn-home')?.addEventListener('click', () => window.location.href = 'index.html');
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('chapter-select')?.addEventListener('change', updateChapterSummary);
  document.getElementById('btn-start')?.addEventListener('click', startQuiz);
  document.getElementById('btn-next')?.addEventListener('click', async () => {
    if (dailyState.currentIndex + 1 < DAILY_TOTAL) {
      dailyState.currentIndex++;
      await saveProgress();
      renderQuizQuestion();
    } else {
      await finishQuiz();
    }
  });
  document.getElementById('btn-review')?.addEventListener('click', startReview);
  document.getElementById('result-review')?.addEventListener('click', startReview);
  document.getElementById('result-home')?.addEventListener('click', () => {
    dailyState = null;
    showView('view-setup');
    loadProgress();
  });
  document.getElementById('review-back')?.addEventListener('click', () => {
    showView('view-setup');
    loadProgress();
  });
  document.getElementById('review-next')?.addEventListener('click', () => {
    reviewIndex++;
    renderReviewQuestion();
  });

  try {
    await loadProgress();
  } catch (err) {
    showToast(err.message, 'rose');
  }
});
