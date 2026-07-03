export const PLAN_STORAGE_KEY = 'plan-checks';

export const loadPlanChecks = () => {
  try { return JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

export const savePlanChecks = (checks) => {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(checks));
};

// 所有階段的待辦項目（升學主線版）
export const planStages = [
  {
    id: 'summer',
    phase: '階段一',
    title: '暑假（7/1 ~ 開學）',
    current: true,
    sections: [
      {
        tag: '共用',
        color: 'shared',
        items: [
          { id: 's1-1', text: '作品集：完成 1 個能展示、能講故事、放上 GitHub 的專案（全端小系統 或 資料分析專案）' },
          { id: 's1-2', text: '定方向：在資管支線（軟體/資料/資安/AI/PM/雲端）收斂出想深入的領域，決定推甄要選哪類研究所' },
          { id: 's1-3', text: '證照：挑 1 張（多益優先；資料 → Google Data Analytics；雲端 → AWS；資安 → Security+）' },
          { id: 's1-4', text: '理財：記帳 + 每月自動存一筆' },
        ],
      },
    ],
  },
  {
    id: 'sem1',
    phase: '階段二',
    title: '二技二上（9 月 ~ 1 月）⭐',
    current: false,
    sections: [
      {
        tag: '9 月｜選校 + 盤點資格',
        color: 'shared',
        items: [
          { id: 's2-1', text: '列出目標校系：雲科資管碩班（保底）+ 台科、北科、清交成、政大、中央等（往上衝）' },
          { id: 's2-2', text: '逐一查各校推甄的報名時間、書審要求、面試形式、招生名額' },
          { id: 's2-3', text: '確認資格（成績、必修；雲科碩班需修過系統分析、資料結構、管理學，沒修到要補修）' },
          { id: 's2-4', text: '鎖定 2~3 位老師，提早請推薦信（給對方至少 3~4 週）' },
        ],
      },
      {
        tag: '9～10 月｜備審資料',
        color: 'study',
        items: [
          { id: 's2-5', text: '自傳、讀書計畫（為什麼念、想研究什麼方向、為什麼選這所/這位教授）' },
          { id: 's2-6', text: '作品集整理成「給教授看」的版本：每個專案講動機、做法、學到什麼' },
          { id: 's2-7', text: '整理成績單、證照、競賽、實習等佐證' },
          { id: 's2-8', text: '收齊推薦信' },
        ],
      },
      {
        tag: '10～11 月｜報名 + 送件',
        color: 'study',
        items: [
          { id: 's2-9', text: '各校推甄報名（deadline 各不同，做一張表逐一追蹤）' },
          { id: 's2-10', text: '上傳/寄送書審資料，留意格式與份數規定' },
        ],
      },
      {
        tag: '11～12 月｜面試準備',
        color: 'study',
        items: [
          { id: 's2-11', text: '練 2~3 分鐘自我介紹 + 專題講解（能回答「你做了什麼、為什麼、學到什麼」）' },
          { id: 's2-12', text: '準備常見問題：為什麼選本所、未來研究方向、生涯規劃' },
          { id: 's2-13', text: '模擬面試（找同學或老師）' },
        ],
      },
      {
        tag: '12～1 月｜放榜 + 備案',
        color: 'shared',
        items: [
          { id: 's2-14', text: '推甄陸續放榜，比較結果' },
          { id: 's2-15', text: '備案（考試入學）：若推甄不理想，12~1 月報名，準備考科，2~3 月應考' },
          { id: 's2-16', text: '同步準備二技二下實習（履歷 + 找系上產學媒合），挑對應研究方向的實習' },
        ],
      },
    ],
  },
  {
    id: 'sem2',
    phase: '階段三',
    title: '二技二下（2 月 ~ 6 月）',
    current: false,
    sections: [
      {
        tag: '實習（驗證 + 加分）',
        color: 'shared',
        items: [
          { id: 's3-1', text: '走系上產學管道（友達、聯電、緯創、叡揚、鼎新、京元電子、智邦等），挑對應研究方向的實習' },
          { id: 's3-2', text: '實習期間記錄：做過的專案、技術、解決的問題（研究所報到、未來求職都用得到）' },
          { id: 's3-3', text: '驗證：若超愛業界 → 可考慮放掉錄取直接就業；若確認想深耕 → 安心銜接研究所' },
          { id: 's3-4', text: '有薪水撥一部分自動存起來' },
          { id: 's3-5', text: '（若走考試入學：2~3 月應考、3~4 月放榜，注意別跟實習衝突）' },
        ],
      },
    ],
  },
  {
    id: 'grad',
    phase: '階段四',
    title: '畢業（約 22 歲，2027 年中）',
    current: false,
    sections: [
      {
        tag: '共用',
        color: 'shared',
        items: [
          { id: 's4-1', text: '收尾專題、確保順利畢業' },
          { id: 's4-2', text: '確定研究所錄取與報到事宜' },
          { id: 's4-3', text: '辦理兵役緩徵，規劃服役時點（多數人排在碩士畢業後）' },
        ],
      },
    ],
  },
  {
    id: 'master1',
    phase: '階段五',
    title: '研究所碩一（約 22~23 歲）',
    current: false,
    sections: [
      {
        tag: '深度養成期',
        color: 'study',
        items: [
          { id: 's5-1', text: '進入實驗室，定下研究主題與方向' },
          { id: 's5-2', text: '讀論文、練專業工具、補強英文（多益門檻 600~785，依校而定）' },
          { id: 's5-3', text: '爭取暑期實習或國際交換，讓學歷＋實務雙軌並進' },
        ],
      },
    ],
  },
  {
    id: 'master2',
    phase: '階段六',
    title: '碩二 + 站穩期（約 23~25 歲）',
    current: false,
    sections: [
      {
        tag: '主線（升學）',
        color: 'study',
        items: [
          { id: 's6-1', text: '完成論文/專題並畢業' },
          { id: 's6-2', text: '靠研究成果＋實習經歷找到理想職位（科技業/大廠/研發）' },
          { id: 's6-3', text: '兵役擇期服完；到 25 歲帶著碩士學歷與實務進場' },
        ],
      },
      {
        tag: '退路（若轉就業）',
        color: 'work',
        items: [
          { id: 's6-4', text: '進入第一份正職，重點放在學習速度與累積戰績' },
          { id: 's6-5', text: '到 25 歲約 2 年經驗；可日後用在職專班補學歷' },
        ],
      },
    ],
  },
];

// 行事曆里程碑（升學主線版）
export const planMilestones = [
  { date: '2026-09-01', label: '二技二上開學', desc: '推甄主戰場啟動，選校盤點資格', color: 'primary', icon: '🎓' },
  { date: '2026-09-15', label: '推薦信截止', desc: '最晚此前請老師動筆（給對方 3~4 週）', color: 'study', icon: '✉️' },
  { date: '2026-10-01', label: '備審資料完成', desc: '自傳、讀書計畫、作品集給教授版', color: 'study', icon: '📝' },
  { date: '2026-10-15', label: '推甄報名截止', desc: '各校 deadline 不同，做表逐一追蹤', color: 'study', icon: '📮' },
  { date: '2026-11-15', label: '面試準備完成', desc: '自介練熟、模擬面試至少一次', color: 'study', icon: '🗣️' },
  { date: '2026-12-15', label: '推甄放榜', desc: '比較錄取結果；不理想則啟動備案（考試入學）', color: 'primary', icon: '📣' },
  { date: '2027-02-01', label: '二技二下實習開始', desc: '驗證方向 + 備審加分', color: 'primary', icon: '🏢' },
  { date: '2027-06-15', label: '畢業', desc: '確定研究所報到、辦緩徵', color: 'primary', icon: '🎉' },
  { date: '2027-09-01', label: '研究所入學', desc: '碩一深度養成期啟動', color: 'study', icon: '🔬' },
];

// 計算整體進度
export const calcPlanProgress = (checks) => {
  const allItems = planStages.flatMap(s => s.sections.flatMap(sec => sec.items));
  const done = allItems.filter(i => checks[i.id]).length;
  return { done, total: allItems.length, pct: allItems.length > 0 ? Math.round((done / allItems.length) * 100) : 0 };
};

// 取得當前階段未完成項目
export const getCurrentStageItems = (checks, limit = 4) => {
  const current = planStages.find(s => s.current) || planStages[0];
  const items = current.sections.flatMap(s => s.items).filter(i => !checks[i.id]);
  return { stage: current, items: items.slice(0, limit), total: current.sections.flatMap(s => s.items).length };
};
