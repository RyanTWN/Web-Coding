const API_BASE_URL = 'https://learning.ifit.myds.me:4061/api';
const DAILY_TOTAL = 20;
const ALLOWED_PUBLISHERS = ['康軒', '南一', '翰林'];
const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
let currentUser = JSON.parse(sessionStorage.getItem('g6_portal_user') || 'null');
let selectedPublisher = '康軒';
let dailyState = null;
let history = [];
let wrongBank = [];
let calendarDate = new Date(`${todayKey}T12:00:00`);
let reviewQuestions = [];
let reviewIndex = 0;

// 115 學年度六年級章節架構。題目以各版單元所涵蓋的 108 課綱學習內容分類。
const CURRICULUM = {
  '康軒': [
    ['[六上] 1. 探索天氣的變化', ['weather'], '大氣中的水、天氣圖、鋒面與颱風'],
    ['[六上] 2. 熱對物質的影響', ['heat'], '物質受熱變化、熱傳播、保溫與散熱'],
    ['[六上] 3. 動物大解密', ['animals'], '動物運動、繁殖育幼、覓食與求生行為'],
    ['[六上] 4. 電磁作用', ['magnet'], '地磁、電磁鐵與電磁應用'],
    ['[六下] 1. 簡單機械', ['machines'], '槓桿、輪軸、滑輪、齒輪與動力傳送'],
    ['[六下] 2. 能量與生活', ['energy', 'sound'], '能量形式、轉換、聲音與節能生活'],
    ['[六下] 3. 地球的生態', ['ecology', 'sustainability'], '族群、群集、生態系與環境永續']
  ],
  '南一': [
    ['[六上] 1. 多樣的天氣變化', ['weather'], '大氣中的水、天氣圖與天氣變化、颱風'],
    ['[六上] 2. 熱對物質的影響', ['heat'], '物質受熱變化、熱的傳播、保溫與散熱'],
    ['[六上] 3. 變動的大地', ['earth'], '流水作用、岩石與礦物、土壤與化石'],
    ['[六上] 4. 奇妙的電磁世界', ['magnet'], '指北針與地磁、電磁鐵、電磁波'],
    ['[六下] 1. 巧妙的施力工具', ['machines'], '槓桿、滑輪、輪軸與動力傳送'],
    ['[六下] 2. 地球的環境與生態', ['ecology'], '族群與群集、生物交互作用、生態系'],
    ['[六下] 3. 我們只有一個地球', ['sustainability', 'energy'], '人類活動、環境影響與永續家園']
  ],
  '翰林': [
    ['[六上] 1. 熱的影響與傳播', ['heat'], '物質受熱變化、熱傳播、保溫與散熱'],
    ['[六上] 2. 多變的天氣', ['weather'], '大氣中的水、天氣圖、鋒面與颱風'],
    ['[六上] 3. 發現大地的奧祕', ['earth'], '地表變化、岩石礦物、土壤與化石'],
    ['[六上] 4. 電磁與生活', ['magnet'], '磁力、電磁鐵與生活應用'],
    ['[六下] 1. 簡單機械', ['machines'], '槓桿、輪軸、滑輪、齒輪與鏈條'],
    ['[六下] 2. 生活中的聲音', ['sound'], '聲音產生、傳播、性質與樂器'],
    ['[六下] 3. 寰宇永續護地球', ['ecology', 'sustainability'], '生物與環境、生態影響、資源與永續']
  ]
};

// 每筆為「題幹、答案、三個誘答、解析」。每日依座號/日期/版本/章節固定抽題。
const FACTS = {
  animals: [
    ['脊椎動物的共同特徵是什麼？', '體內具有脊椎骨', '都會飛行', '都生活在水中', '身體都有硬殼', '魚類、兩生類、爬蟲類、鳥類與哺乳類體內都具有脊椎骨。'],
    ['人體骨骼肌通常如何帶動骨骼運動？', '肌肉收縮牽引骨骼', '骨骼自行發電', '皮膚推動骨骼', '血液使骨骼融化', '肌肉連接骨骼，收縮時可牽引骨骼繞關節運動。'],
    ['關節在動物運動中主要有什麼功能？', '讓相連骨骼能相對活動', '製造消化液', '儲存空氣', '產生毛髮顏色', '關節是骨骼連接處，提供彎曲或轉動等活動。'],
    ['鳥類求偶時展示羽毛或鳴叫，主要目的通常是什麼？', '吸引配偶', '降低體溫', '磨碎食物', '製造巢材', '求偶行為有助尋找與選擇配偶，完成繁殖。'],
    ['青蛙產下許多卵，但只有部分長大，這種繁殖策略與什麼有關？', '提高部分後代存活機會', '每顆卵都由親代孵化', '後代完全不受環境影響', '卵不需要水分', '大量產卵可在高死亡率環境中增加部分後代存活的機會。'],
    ['企鵝輪流孵蛋、餵養幼鳥，屬於哪一類行為？', '育幼行為', '冬眠行為', '偽裝行為', '領域標記', '親代保護、餵食或教導幼體都屬於育幼行為。'],
    ['竹節蟲外形像樹枝，主要有什麼生存功能？', '偽裝以躲避天敵', '增加飛行速度', '吸引所有掠食者', '製造磁場', '外形或體色融入環境可降低被天敵發現的機會。'],
    ['候鳥隨季節長距離移動，這種行為稱為什麼？', '遷徙', '蛻皮', '發芽', '凝結', '動物為尋找食物、繁殖地或適宜氣候而週期移動，稱為遷徙。'],
    ['蜘蛛結網捕捉昆蟲屬於哪一種行為？', '覓食行為', '育幼行為', '求偶行為', '冬眠行為', '利用網捕捉獵物是取得食物的覓食行為。'],
    ['研究動物行為時，較合適的科學方法是哪一項？', '在不干擾下持續觀察並記錄', '只憑一次印象下結論', '任意破壞巢穴', '用想像代替證據', '重複、客觀記錄時間、環境與行為，才能形成可靠證據。']
  ],
  weather: [
    ['空氣中的水蒸氣遇冷變成小水滴，稱為什麼現象？', '凝結', '蒸發', '融化', '昇華', '水蒸氣遇冷由氣態變成液態小水滴，稱為凝結。'],
    ['雲中的小水滴或冰晶變大，重到空氣托不住時，最可能形成什麼？', '降水', '蒸發', '潮汐', '地震', '水滴或冰晶落到地面，形成雨、雪等降水。'],
    ['地面天氣圖上的 H 通常表示什麼中心？', '高氣壓', '低氣壓', '颱風眼', '暖鋒', 'H 是 high pressure，高氣壓中心常帶來較穩定天氣。'],
    ['冷氣團主動推進，使暖空氣抬升形成的鋒面稱為什麼？', '冷鋒', '暖鋒', '滯留鋒', '高壓脊', '冷空氣推進的交界面稱為冷鋒。'],
    ['臺灣梅雨季常見、容易帶來持續降雨的是哪一種鋒面？', '滯留鋒', '冷鋒', '暖鋒', '颱風眼', '冷暖氣團勢力相當，鋒面徘徊而形成持續降雨。'],
    ['颱風接近前，最適當的防颱行動是哪一項？', '固定招牌並準備防災物資', '到海邊觀浪', '打開所有門窗', '前往山區露營', '應固定易墜物、備妥物資並留意官方警報。'],
    ['衛星雲圖主要可以觀察什麼？', '雲層分布與移動', '地下水深度', '岩石硬度', '地磁方向', '連續衛星雲圖可判讀雲系位置和移動。'],
    ['自然界水循環的主要能量來源是什麼？', '太陽能', '地磁', '月球引力', '電池', '太陽加熱水面促進蒸發，驅動水循環。'],
    ['露通常形成在什麼情況？', '近地面水蒸氣遇冷凝結', '雨滴在高空結冰', '海水受熱沸騰', '地下水噴出', '夜間物體表面降溫，水蒸氣凝結成露。'],
    ['氣象預報中，等壓線越密集通常代表什麼？', '氣壓差較大、風可能較強', '一定沒有風', '溫度完全相同', '降雨必定停止', '相同距離內氣壓差越大，風通常越強。']
  ],
  heat: [
    ['金屬湯匙一端放入熱湯，握柄也逐漸變熱，主要是哪種熱傳播？', '傳導', '對流', '輻射', '蒸發', '熱沿固體由高溫處傳到低溫處，屬於傳導。'],
    ['煮水時，鍋內熱水上升、冷水下降的循環屬於什麼？', '對流', '傳導', '輻射', '凝結', '液體因溫度造成密度差而循環，是對流。'],
    ['太陽的熱穿過太空到達地球，主要是哪種方式？', '輻射', '傳導', '對流', '擴散', '輻射不需要介質，可以穿越真空。'],
    ['下列哪一種材料通常較適合做鍋子的隔熱握把？', '木材', '銅', '鋁', '鐵', '木材是熱的不良導體，可降低燙傷風險。'],
    ['多數物質受熱時，體積通常會如何變化？', '膨脹', '縮小', '完全不變', '立刻消失', '多數固體、液體和氣體具有熱脹冷縮現象。'],
    ['保溫瓶內膽做成光亮表面，主要是為了減少哪種熱傳播？', '輻射', '對流', '蒸發', '凝固', '光亮表面較能反射熱輻射。'],
    ['將冰塊放在室溫中變成水，這種狀態變化稱為什麼？', '融化', '凝固', '凝結', '蒸發', '固態變成液態稱為融化。'],
    ['想讓熱湯散熱更快，下列做法何者較有效？', '倒入寬口淺盤並攪拌', '蓋緊厚棉被', '裝入保溫瓶', '放進密閉保麗龍箱', '增加表面積與空氣流動可加快散熱。'],
    ['蠟燭燃燒後無法只靠冷卻恢復成原本蠟燭，表示發生什麼？', '產生新物質的變化', '只有形狀改變', '只有熱脹冷縮', '只是凝固', '燃燒產生新物質，通常無法以冷卻還原。'],
    ['雙層窗中間留空氣層有助隔熱，主要因為空氣如何？', '不易傳導熱', '會大量產熱', '能完全阻隔光', '溫度永遠不變', '靜止空氣的導熱能力較差，可減少熱傳導。']
  ],
  earth: [
    ['河流上游坡度大、水流快，常以哪種作用較明顯？', '侵蝕', '堆積', '凝結', '磁化', '流速快時搬運能力強，侵蝕作用通常較明顯。'],
    ['河流進入平坦地區流速變慢，砂石最可能發生什麼？', '堆積', '蒸發', '熔化', '發光', '流速下降時搬運能力減弱，泥沙容易堆積。'],
    ['岩石由一種或多種什麼物質組成？', '礦物', '細胞', '塑膠', '雲滴', '礦物是構成岩石的基本材料。'],
    ['要比較礦物硬度，可用什麼方法？', '互相刻畫觀察刮痕', '只比較顏色', '聞氣味', '放入冰箱', '以已知硬度材料刻畫可比較礦物相對硬度。'],
    ['土壤中對植物生長很重要、由生物遺體分解形成的是什麼？', '腐植質', '玻璃', '塑膠', '食鹽結晶', '腐植質可增加土壤養分並改善土質。'],
    ['化石最常保存在下列哪一類岩石中？', '沉積岩', '岩漿', '金屬', '玻璃', '生物遺體被沉積物掩埋後，較可能在沉積岩中形成化石。'],
    ['下列哪一項可減少山坡土壤被雨水沖刷？', '保留植被', '全面移除植物', '加大坡度', '挖除表土', '植物根系能固定土壤，植被也能減緩雨滴沖擊。'],
    ['海蝕平臺主要由哪一種外力長期作用形成？', '海浪侵蝕', '風吹堆沙', '地磁作用', '月光照射', '海浪反覆侵蝕海岸，可能形成海蝕地形。'],
    ['鵝卵石常呈圓滑形狀，主要原因是什麼？', '搬運中互相碰撞磨蝕', '吸收陽光', '受到磁力', '被植物染色', '石塊隨流水搬運、碰撞與磨蝕後逐漸圓滑。'],
    ['觀察不明礦物時，下列哪一項屬於可記錄的性質？', '條痕、光澤與硬度', '售價與品牌', '發現者姓名', '包裝顏色', '條痕、光澤和硬度是辨識礦物的重要性質。']
  ],
  magnet: [
    ['指北針能指示南北方向，主要是受到什麼影響？', '地球磁場', '太陽光', '空氣壓力', '地球重力方向', '地球像大磁鐵，磁場使磁針大致指向南北。'],
    ['通電線圈中放入鐵芯，通常會形成什麼？', '電磁鐵', '永久電池', '溫度計', '槓桿', '通電線圈與鐵芯組合可產生較強磁力。'],
    ['要讓電磁鐵磁力變強，可採取哪一種方法？', '增加線圈圈數', '切斷電流', '改用木芯', '減少電池且反接', '在安全範圍內增加圈數或電流可增強磁力。'],
    ['改變電磁鐵線圈中的電流方向，最可能改變什麼？', '磁極方向', '鐵芯質量', '線圈圈數', '導線長度', '電流方向反轉會使電磁鐵南北極互換。'],
    ['電磁起重機適合搬運廢鐵，主要優點是什麼？', '可用通斷電控制磁力', '不需要能源', '能吸起所有材料', '磁力永不消失', '通電吸附、斷電放下，便於控制。'],
    ['下列哪一種物品最容易被一般磁鐵吸引？', '鐵釘', '鋁箔', '塑膠尺', '木筷', '鐵、鈷、鎳等材料較容易受磁鐵吸引。'],
    ['兩個磁鐵的同名磁極靠近時會如何？', '互相排斥', '互相吸引', '失去質量', '產生水滴', '磁鐵同極相斥、異極相吸。'],
    ['使用指北針時，應避免靠近通電導線，原因是什麼？', '電流產生磁場會干擾磁針', '導線會吸收水分', '指北針需要陽光', '導線會改變重力', '電流的磁效應可能讓磁針偏轉。'],
    ['下列哪一項利用了電磁鐵？', '電鈴', '玻璃杯', '木製尺', '放大鏡', '電鈴以電磁鐵吸引撞槌，反覆敲擊發聲。'],
    ['電磁波的共同特性之一是什麼？', '能在真空中傳播', '一定需要空氣', '都能被肉眼看見', '只能在水中傳播', '無線電波、可見光等電磁波可在真空中傳播。']
  ],
  machines: [
    ['使用槓桿時，支撐槓桿轉動的位置稱為什麼？', '支點', '施力點', '抗力點', '重心線', '槓桿繞支點轉動。'],
    ['想用較小的力抬起重物，槓桿的施力臂應如何調整？', '加長', '縮短', '變成零', '與抗力臂無關', '施力臂越長，通常越省力。'],
    ['固定滑輪的主要功能是什麼？', '改變施力方向', '一定省一半力', '增加物體重量', '儲存電能', '理想固定滑輪不省力，但能改變施力方向。'],
    ['動滑輪的主要優點是什麼？', '可以省力', '只改變方向', '增加摩擦', '讓重物變重', '理想動滑輪可由多段繩子分擔重量。'],
    ['門把手運用了哪一種簡單機械原理？', '輪軸', '斜面', '滑輪', '楔子', '門把是輪，中央轉軸是軸。'],
    ['腳踏車以鏈條連接齒輪，主要用途是什麼？', '傳送動力', '產生磁力', '測量溫度', '製造光線', '鏈條與齒輪能把踏板的轉動傳到車輪。'],
    ['兩個互相咬合的齒輪轉動方向通常如何？', '相反', '相同', '都不轉', '隨機改變', '相鄰咬合齒輪的轉動方向相反。'],
    ['螺絲可視為哪一種簡單機械繞在圓柱上？', '斜面', '滑輪', '槓桿', '輪軸', '螺紋相當於繞在圓柱上的斜面。'],
    ['剪刀主要結合了哪兩種簡單機械概念？', '槓桿與楔子', '滑輪與輪軸', '齒輪與斜面', '電磁鐵與槓桿', '剪刀把手與支點形成槓桿，刀刃可視為楔子。'],
    ['機械可以省力，但通常需要付出什麼代價？', '增加施力距離', '讓能量憑空增加', '完全不必做功', '重物質量消失', '理想機械不會無中生有能量，省力常需增加距離。']
  ],
  energy: [
    ['電風扇運轉時，主要把電能轉換成什麼？', '動能', '化學能', '核能', '位能', '馬達把電能轉換成扇葉運動的動能。'],
    ['植物行光合作用時，主要把太陽能轉成什麼能量儲存？', '化學能', '聲能', '核能', '磁能', '植物將光能轉為有機物中的化學能。'],
    ['下列哪一項屬於再生能源？', '太陽能', '煤', '石油', '天然氣', '太陽能可持續補充，屬於再生能源。'],
    ['電池中的能量主要以哪一種形式儲存？', '化學能', '聲能', '光能', '風能', '電池透過化學反應提供電能。'],
    ['關閉不用的燈具，主要可以達到什麼目的？', '節約能源', '增加耗電', '製造化石燃料', '改變地磁', '減少不必要用電可節能並降低環境負擔。'],
    ['水力發電主要利用水的哪一種能量帶動渦輪？', '位能與動能', '聲能', '磁能', '核能', '高處水的位能轉成流動動能，再帶動發電機。'],
    ['能量轉換過程中，部分能量常散失成哪一種形式？', '熱能', '質量', '元素', '真空', '摩擦等常使部分能量轉成較難利用的熱能。'],
    ['下列哪一種交通方式在短程移動時通常較節能？', '步行或騎自行車', '一人開大型汽車', '讓車輛原地怠速', '繞遠路行駛', '步行和自行車不需燃燒交通燃料。'],
    ['太陽能板主要將光能轉換成什麼？', '電能', '聲能', '位能', '磁鐵', '太陽能電池可把光能直接轉成電能。'],
    ['能源使用效率提高代表什麼？', '相同投入得到更多有效產出', '使用更多能源卻做更少事', '能量可以憑空產生', '不會有任何熱損失', '效率描述輸入能量中成為有效輸出的比例。']
  ],
  sound: [
    ['聲音是由物體的什麼現象產生？', '振動', '凝結', '生鏽', '蒸發', '發聲體振動並使周圍介質振動，形成聲音。'],
    ['太空是真空，兩位太空人無法直接用一般說話方式交談，原因是什麼？', '聲音需要介質傳播', '太空沒有光', '聲音只向下傳', '耳朵失去質量', '聲音是機械波，需要空氣、液體或固體等介質。'],
    ['聲音的音調高低主要和振動的什麼有關？', '快慢', '振幅大小', '顏色', '傳播方向', '振動越快，頻率越高，音調通常越高。'],
    ['聲音的大小通常和振動的什麼有關？', '振幅', '頻率', '顏色', '質量單位', '振幅越大，聲音通常越大。'],
    ['吉他弦拉得更緊，彈奏時音調通常如何？', '變高', '變低', '完全消失', '音量必定相同', '弦越緊振動頻率通常越高，音調上升。'],
    ['敲擊鼓面後用手按住鼓面，聲音很快停止，主要原因是什麼？', '鼓面停止振動', '空氣消失', '鼓面溫度下降', '重力變小', '按住鼓面抑制振動，發聲就停止。'],
    ['回聲是聲音遇到障礙物後發生什麼現象？', '反射', '折射成光', '凝固', '燃燒', '聲波遇到大面積障礙物反射，延遲傳回形成回聲。'],
    ['在學校附近設置隔音牆，主要目的是什麼？', '減少噪音傳入', '提高所有音調', '製造真空', '增加聲速', '隔音材料可吸收或反射部分聲音，降低噪音。'],
    ['直笛按住較多音孔，使有效空氣柱變長，音調通常如何？', '變低', '變高', '不會發聲', '只變大聲', '空氣柱較長時振動頻率通常較低，音調較低。'],
    ['下列哪一項是保護聽力的正確做法？', '降低耳機音量並適時休息', '長時間最大音量', '靠近爆竹聆聽', '用尖物清耳道', '避免長時間暴露於高音量，可降低聽力傷害。']
  ],
  ecology: [
    ['同一時間生活在同一地區的同種生物集合稱為什麼？', '族群', '群集', '生態系', '棲地以外', '例如同一池塘中的所有吳郭魚可視為一個族群。'],
    ['同一地區中所有不同生物族群的集合稱為什麼？', '群集', '族群', '個體', '礦物', '群集包含該地區各種生物族群。'],
    ['生態系包含哪些部分？', '生物與非生物環境', '只有動物', '只有植物', '只有陽光', '生態系由生物群集與光、水、土壤等非生物環境組成。'],
    ['食物鏈中能自行製造養分的生物稱為什麼？', '生產者', '消費者', '分解者', '掠食者', '綠色植物等可行光合作用，是生產者。'],
    ['分解者在生態系中的重要功能是什麼？', '分解遺體並讓物質循環', '製造陽光', '停止所有呼吸', '增加塑膠垃圾', '細菌與真菌等分解者使養分回到環境。'],
    ['兩種生物都因互動而獲益，稱為什麼關係？', '互利共生', '競爭', '寄生', '掠食', '互利共生中，雙方都獲得好處。'],
    ['外來種缺乏天敵而大量繁殖，可能造成什麼影響？', '排擠原生種並破壞平衡', '一定增加所有物種', '完全沒有影響', '使氣候立即停止變化', '入侵外來種可能競爭資源、捕食原生種。'],
    ['食物網比單一食物鏈更能表示什麼？', '生物間複雜取食關係', '只有一種生物', '岩石形成過程', '天氣預報', '自然界多條食物鏈彼此連結，形成食物網。'],
    ['生物棲地遭破壞，最直接可能造成什麼？', '族群數量下降', '礦物變多', '地磁消失', '所有氣溫相同', '失去食物、遮蔽或繁殖場所會威脅生物生存。'],
    ['池塘中的陽光、水溫與溶氧屬於哪一類因子？', '非生物因子', '生產者', '消費者', '分解者', '光、水、溫度和空氣等屬於非生物環境因子。']
  ],
  sustainability: [
    ['永續發展的核心概念最接近哪一項？', '滿足當代需求且不損害後代需求', '只追求眼前利益', '停止所有科技活動', '無限制使用資源', '永續需兼顧環境、社會、經濟與世代公平。'],
    ['下列哪一項最符合減少一次性垃圾的作法？', '自備水壺與餐具', '每天使用新塑膠杯', '可用物品立刻丟棄', '購買過度包裝商品', '重複使用能從源頭減少資源消耗與廢棄物。'],
    ['保育瀕危生物時，最根本的措施通常是什麼？', '保護與恢復棲地', '只在網路分享照片', '移除所有植物', '增加光害', '完整棲地提供食物、繁殖與躲藏空間。'],
    ['垃圾分類與資源回收的主要目的之一是什麼？', '讓材料循環再利用', '增加掩埋量', '把垃圾丟入河川', '消耗更多原料', '回收可減少原生資源開採與廢棄物。'],
    ['過度砍伐森林可能造成什麼？', '棲地喪失與土壤流失', '生物多樣性必定增加', '二氧化碳立即歸零', '水循環停止', '森林消失會影響生物棲地、碳循環與水土保持。'],
    ['節約用水的正確方法是哪一項？', '修理漏水水龍頭', '讓水龍頭一直流', '用大量清水沖洗地面', '每天放掉未用的水', '修漏與適量用水可降低水資源浪費。'],
    ['國家公園與自然保護區的重要功能是什麼？', '保護棲地與生物多樣性', '鼓勵任意捕捉野生動物', '集中堆放垃圾', '移除所有原生植物', '保護區以法規和管理降低人為干擾。'],
    ['選購具有環保標章的產品，主要代表什麼？', '考量較低環境負荷', '一定是最昂貴', '可以任意丟棄', '完全不需能源製造', '環保標章協助辨識符合特定環境規範的產品。'],
    ['光害可能對夜行性動物造成什麼影響？', '干擾覓食與繁殖行為', '增加所有動物睡眠', '讓夜晚更自然', '不會有任何影響', '不當夜間照明會擾亂生物節律與行為。'],
    ['公民參與環境保護的合適方式是哪一項？', '查證資訊並參與淨灘或監測', '散播未查證消息', '棄置廢棄物', '捕捉保育類動物', '以可靠資訊和實際行動參與，能協助改善環境。']
  ]
};

function natureFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (currentUser?.token) headers.set('Authorization', `Bearer ${currentUser.token}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

function hashSeed(text) {
  let value = 2166136261;
  for (const char of text) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); }
  return value >>> 0;
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

function buildDailyQuestions(publisher, chapterTitle) {
  const chapter = findChapter(publisher, chapterTitle);
  const publisherSlug = { '康軒': 'knsh', '南一': 'nani', '翰林': 'hanlin' }[publisher];
  const chapterNo = CURRICULUM[publisher].findIndex(item => item[0] === chapterTitle) + 1;
  const source = (chapter?.[1] || []).flatMap(topic => (FACTS[topic] || []).map((fact, index) => ({ topic, fact, index })));
  const expanded = source.flatMap(({ topic, fact, index }) => [0, 1].map(variant => {
    const [prompt, correct, ...rest] = fact;
    const explanation = rest.pop();
    const id = `${publisherSlug}-${chapterNo}-${topic}-${index + 1}-${variant + 1}`;
    return {
      id,
      kind: variant ? '觀念確認' : '單元練習',
      question: variant ? `複習觀念：${prompt}` : prompt,
      options: seededShuffle([correct, ...rest], `${todayKey}-${currentUser.seatNo}-${id}`),
      answer: correct,
      explanation
    };
  }));
  return seededShuffle(expanded, `${currentUser.seatNo}-${todayKey}-${publisher}-${chapterTitle}`).slice(0, DAILY_TOTAL);
}

function showToast(message, tone = 'slate') {
  const toast = document.getElementById('toast');
  document.getElementById('toast-text').textContent = message;
  document.getElementById('toast-bg').className = `${tone === 'rose' ? 'bg-rose-600' : tone === 'emerald' ? 'bg-emerald-600' : 'bg-slate-800'} text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-sm`;
  toast.classList.remove('-translate-y-16', 'opacity-0', 'pointer-events-none');
  setTimeout(() => toast.classList.add('-translate-y-16', 'opacity-0', 'pointer-events-none'), 2200);
}

function showView(id) {
  ['view-setup', 'view-quiz', 'view-result', 'view-review'].forEach(view => document.getElementById(view).classList.toggle('hidden', view !== id));
}

function renderPublisherButtons() {
  const container = document.getElementById('publisher-list');
  container.innerHTML = '';
  ALLOWED_PUBLISHERS.forEach(publisher => {
    const button = document.createElement('button');
    const active = publisher === selectedPublisher;
    button.className = `py-3 rounded-2xl border-2 font-black transition ${active ? 'border-amber-400 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500'}`;
    button.textContent = publisher;
    button.disabled = Boolean(dailyState);
    button.onclick = () => { selectedPublisher = publisher; renderPublisherButtons(); renderChapterOptions(); };
    container.appendChild(button);
  });
}

function renderChapterOptions(preferred) {
  const select = document.getElementById('chapter-select');
  select.innerHTML = '';
  CURRICULUM[selectedPublisher].forEach(([title]) => select.add(new Option(title, title)));
  if (preferred && findChapter(selectedPublisher, preferred)) select.value = preferred;
  select.disabled = Boolean(dailyState);
  updateChapterSummary();
}

function updateChapterSummary() {
  const chapter = findChapter(selectedPublisher, document.getElementById('chapter-select').value);
  document.getElementById('chapter-summary').innerHTML = `<strong>${selectedPublisher}版課程重點：</strong>${chapter?.[2] || ''}<br><span class="text-amber-700/70">題庫版本：115-G6-NATURE-1</span>`;
}

async function loadProgress() {
  const response = await natureFetch(`/nature-progress?seatNo=${encodeURIComponent(currentUser.seatNo)}&date=${todayKey}`);
  if (response.status === 401) return logout();
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || '無法載入自然科學進度');
  dailyState = result.data;
  history = result.history || [];
  wrongBank = result.wrongQuestions || [];
  document.getElementById('wrong-count').textContent = wrongBank.length;
  if (dailyState) {
    if (!dailyState.completed && dailyState.answers.length > dailyState.currentIndex) {
      dailyState.currentIndex = Math.min(DAILY_TOTAL, dailyState.answers.length);
    }
    selectedPublisher = dailyState.publisher;
    renderPublisherButtons();
    renderChapterOptions(dailyState.chapter);
    document.getElementById('btn-start').innerHTML = dailyState.completed ? '查看今日成果 <i class="fa-solid fa-trophy ml-1"></i>' : `繼續今日練習（${dailyState.currentIndex + 1} / ${DAILY_TOTAL}） <i class="fa-solid fa-arrow-right ml-1"></i>`;
  }
  renderCalendar();
}

function getCorrectCount(state = dailyState) {
  return (state?.answers || []).filter(answer => answer.correct).length;
}

function renderQuestion() {
  const question = dailyState.questions[dailyState.currentIndex];
  if (!question) return finishQuiz();
  document.getElementById('quiz-badge').textContent = `${dailyState.publisher}・${dailyState.chapter}`;
  document.getElementById('quiz-progress').textContent = `第 ${dailyState.currentIndex + 1} / ${DAILY_TOTAL} 題`;
  document.getElementById('quiz-bar').style.width = `${(dailyState.currentIndex + 1) / DAILY_TOTAL * 100}%`;
  document.getElementById('question-kind').textContent = question.kind;
  document.getElementById('question-text').textContent = question.question;
  const list = document.getElementById('answer-list');
  list.innerHTML = '';
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.className = 'answer-option w-full p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-300 text-left font-bold transition';
    button.innerHTML = `<span class="inline-flex w-7 h-7 mr-2 rounded-lg bg-slate-100 items-center justify-center text-xs">${String.fromCharCode(65 + index)}</span>${option}`;
    button.onclick = () => answerDailyQuestion(option, button);
    list.appendChild(button);
  });
  document.getElementById('feedback').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');
}

async function answerDailyQuestion(option, selectedButton) {
  const question = dailyState.questions[dailyState.currentIndex];
  const correct = option === question.answer;
  document.querySelectorAll('#answer-list .answer-option').forEach(button => {
    button.disabled = true;
    const text = button.textContent.slice(1).trim();
    if (text === question.answer) button.classList.add('is-correct');
  });
  if (!correct) selectedButton.classList.add('is-wrong');
  dailyState.answers.push({ questionId: question.id, selected: option, correct });
  if (!correct && !dailyState.wrongQuestions.some(item => item.id === question.id)) dailyState.wrongQuestions.push({ ...question, publisher: dailyState.publisher, chapter: dailyState.chapter });
  const feedback = document.getElementById('feedback');
  feedback.className = `mt-5 rounded-2xl p-4 text-sm leading-relaxed ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
  feedback.innerHTML = `<strong>${correct ? '答對了！' : `正確答案：${question.answer}`}</strong><br>${question.explanation}`;
  document.getElementById('btn-next').classList.remove('hidden');
  await syncState(false);
}

async function advanceQuestion() {
  dailyState.currentIndex += 1;
  if (dailyState.currentIndex >= DAILY_TOTAL) return finishQuiz();
  await syncState(false);
  renderQuestion();
}

async function finishQuiz() {
  dailyState.completed = true;
  dailyState.currentIndex = DAILY_TOTAL;
  dailyState.score = Math.round(getCorrectCount() / DAILY_TOTAL * 100);
  await syncState(true);
  history = [{ date: todayKey, publisher: dailyState.publisher, chapter: dailyState.chapter, score: dailyState.score }, ...history.filter(item => item.date !== todayKey)];
  wrongBank = [...new Map([...wrongBank, ...dailyState.wrongQuestions].map(item => [item.id, item])).values()];
  document.getElementById('wrong-count').textContent = wrongBank.length;
  renderResult();
  renderCalendar();
}

function renderResult() {
  document.getElementById('result-correct').textContent = `${getCorrectCount()} / ${DAILY_TOTAL}`;
  document.getElementById('result-score').textContent = `${dailyState.score} 分`;
  showView('view-result');
}

async function syncState(completed) {
  const response = await natureFetch('/nature-progress', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: completed,
    body: JSON.stringify({
      seatNo: currentUser.seatNo, date: todayKey, publisher: dailyState.publisher, chapter: dailyState.chapter,
      questions: dailyState.questions, currentIndex: dailyState.currentIndex, answers: dailyState.answers,
      wrongQuestions: dailyState.wrongQuestions, completed, score: dailyState.score || 0
    })
  });
  if (!response.ok) throw new Error(`自然科學進度同步失敗（HTTP ${response.status}）`);
}

async function startOrResume() {
  if (dailyState?.completed) return renderResult();
  if (!dailyState) {
    const chapter = document.getElementById('chapter-select').value;
    dailyState = { date: todayKey, publisher: selectedPublisher, chapter, questions: buildDailyQuestions(selectedPublisher, chapter), currentIndex: 0, answers: [], wrongQuestions: [], completed: false, score: 0 };
    await syncState(false);
  }
  showView('view-quiz');
  renderQuestion();
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById('cal-title').textContent = `${year} 年 ${month + 1} 月`;
  const completed = new Set(history.filter(item => Number(item.completed ?? 1)).map(item => item.date));
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  for (let blank = 0; blank < new Date(year, month, 1).getDay(); blank++) grid.appendChild(document.createElement('span'));
  for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cell = document.createElement('button');
    const isCompleted = completed.has(key);
    cell.className = `calendar-cell rounded-xl text-xs font-bold flex items-center justify-center ${isCompleted ? 'bg-emerald-500 text-white shadow-sm' : key === todayKey ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-300' : key < todayKey ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-slate-300'}`;
    cell.textContent = day;
    const record = history.find(item => item.date === key);
    cell.title = record ? `${record.publisher}・${record.chapter}・${record.score} 分` : key === todayKey ? '今天' : '';
    grid.appendChild(cell);
  }
  document.getElementById('completion-count').textContent = `${completed.size} 天`;
  const doneToday = completed.has(todayKey) || dailyState?.completed;
  const status = document.getElementById('today-status');
  status.className = `mt-4 py-2.5 rounded-xl text-center text-xs font-bold ${doneToday ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`;
  status.innerHTML = doneToday ? '<i class="fa-solid fa-circle-check mr-1"></i>今日 20 題已完成' : '完成今日 20 題即可點亮';
}

function openReview() {
  reviewQuestions = [...wrongBank];
  reviewIndex = 0;
  showView('view-review');
  renderReviewQuestion();
}

function renderReviewQuestion() {
  const empty = reviewQuestions.length === 0 || reviewIndex >= reviewQuestions.length;
  document.getElementById('review-empty').classList.toggle('hidden', !empty);
  document.getElementById('review-content').classList.toggle('hidden', empty);
  document.getElementById('review-meta').textContent = empty ? '所有錯題都複習完成了。' : `第 ${reviewIndex + 1} / ${reviewQuestions.length} 題・答對即完成此題複習`;
  if (empty) return;
  const question = reviewQuestions[reviewIndex];
  document.getElementById('review-badge').textContent = `${question.publisher}・${question.chapter}`;
  document.getElementById('review-question').textContent = question.question;
  const list = document.getElementById('review-answers');
  list.innerHTML = '';
  question.options.forEach(option => {
    const button = document.createElement('button');
    button.className = 'answer-option w-full p-4 rounded-2xl border-2 border-slate-200 text-left font-bold';
    button.textContent = option;
    button.onclick = () => answerReview(option, button);
    list.appendChild(button);
  });
  document.getElementById('review-feedback').classList.add('hidden');
  document.getElementById('review-next').classList.add('hidden');
}

async function answerReview(option, selectedButton) {
  const question = reviewQuestions[reviewIndex];
  const correct = option === question.answer;
  const feedback = document.getElementById('review-feedback');
  feedback.className = `mt-5 rounded-2xl p-4 text-sm ${correct ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`;
  if (!correct) {
    selectedButton.classList.add('is-wrong');
    feedback.innerHTML = `<strong>再想一想。</strong><br>${question.explanation}`;
    return;
  }
  document.querySelectorAll('#review-answers .answer-option').forEach(button => { button.disabled = true; if (button.textContent === question.answer) button.classList.add('is-correct'); });
  feedback.innerHTML = `<strong>複習完成！</strong><br>${question.explanation}`;
  await natureFetch('/nature-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seatNo: currentUser.seatNo, questionIds: [question.id] }) });
  wrongBank = wrongBank.filter(item => item.id !== question.id);
  document.getElementById('wrong-count').textContent = wrongBank.length;
  document.getElementById('review-next').classList.remove('hidden');
}

function logout() {
  sessionStorage.removeItem('g6_portal_user');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!currentUser?.token || currentUser.isAdmin) return logout();
  document.getElementById('header-name').textContent = currentUser.name;
  document.getElementById('header-seat').textContent = `座號：${currentUser.seatNo}`;
  renderPublisherButtons();
  renderChapterOptions();
  document.getElementById('chapter-select').onchange = updateChapterSummary;
  document.getElementById('btn-home').onclick = () => { window.location.href = 'index.html'; };
  document.getElementById('btn-logout').onclick = logout;
  document.getElementById('btn-start').onclick = () => startOrResume().catch(error => showToast(error.message, 'rose'));
  document.getElementById('btn-next').onclick = () => advanceQuestion().catch(error => showToast(error.message, 'rose'));
  document.getElementById('btn-review').onclick = openReview;
  document.getElementById('result-review').onclick = openReview;
  document.getElementById('result-home').onclick = () => showView('view-setup');
  document.getElementById('review-back').onclick = () => showView(dailyState?.completed ? 'view-result' : 'view-setup');
  document.getElementById('review-next').onclick = () => { reviewIndex += 1; renderReviewQuestion(); };
  document.getElementById('cal-prev').onclick = () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); };
  document.getElementById('cal-next').onclick = () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); };
  try { await loadProgress(); } catch (error) { showToast(error.message, 'rose'); renderCalendar(); }
});
