import React, { useState } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/pages/Plan.module.scss';

const STORAGE_KEY = 'plan-checks';

const loadChecks = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
};

// ── 資料定義 ───────────────────────────────────────────────
const coordinates = [
  { label: '學校科系', value: '國立雲林科技大學 資訊管理系', icon: '🏫' },
  { label: '學程進度', value: '五專 → 二技，即將升上二技二年級（最後一年）', icon: '📚' },
  { label: '年齡時程', value: '現在 ~21 → ~22 畢業 → 研究所（緩徵）→ 兵役 → 25 歲', icon: '🗓️' },
  { label: '兵役', value: '役期一年；升學期間可緩徵，排在碩士畢業後服', icon: '🎖️' },
  { label: '經濟', value: '父母支援 + 部分自己負擔；家裡可支撐 2 年碩士', icon: '💰' },
  { label: '主線方向', value: '以升學為主線，二技二下實習當最終驗證', icon: '🎯' },
  { label: '態度', value: '不綁雲科——雲科碩班保底，盡量往台科/北科/清交成/政大衝', icon: '🌏' },
  { label: '退路', value: '實習若強烈拉你進業界，可隨時放掉錄取轉就業', icon: '🔀' },
];

const strategies = [
  {
    num: '1',
    title: '升學主線，但用實習驗證、保留退路',
    body: '推甄門票低成本就能拿到（雲科碩班免筆試），先把它準備好；二下實習會告訴你「業界到底適不適合你」。確認想升學就銜接研究所，想就業就放掉錄取——幾乎沒有下檔風險。',
    highlight: '低風險最大化',
  },
  {
    num: '2',
    title: '「作品集 + 一段實習」是萬用鑰匙',
    body: '推甄書審要作品集、面試要你會講專題、實習是備審亮點——升學這條路反而更吃這兩樣。不論如何，優先做它們。',
    highlight: '升學也吃這兩樣',
  },
  {
    num: '3',
    title: '雲科保底，往外盡量衝',
    body: '碩士的薪資/門檻紅利，學校層級差很多，台清交成政份量遠大於一般校。把雲科當安全網，推甄能報好幾間就往上衝。',
    highlight: '學校層級決定報酬',
  },
  {
    num: '4',
    title: '研究所是「助推器」不是「保證班」',
    body: '碩士的報酬要靠「念得好、真的學到、能畢業」才會落到你身上。目標是進好學校＋扎實學習，不是混一張紙。',
    highlight: '念好才有報酬',
  },
];

const timelineItems = [
  { phase: '暑假（現在）', time: '2026 夏', age: '~21', task: '作品集起跑、選方向、考證照、英文', current: true },
  { phase: '二技二上', time: '2026 秋冬', age: '~21', task: '推甄主戰場：備審 + 報名 + 面試 ⭐', current: false },
  { phase: '二技二下', time: '2027 春', age: '~21-22', task: '實習：驗證方向 + 強化備審/履歷', current: false },
  { phase: '畢業', time: '2027 年中', age: '~22', task: '確定錄取、銜接研究所、辦緩徵', current: false },
  { phase: '研究所碩一', time: '2027 秋起', age: '~22-23', task: '進入研究、找方向、爭取實習/交換', current: false },
  { phase: '碩二 + 站穩', time: '~23-25', age: '23-25', task: '完成論文/專題、銜接就業；兵役擇期', current: false },
];

// 決策點：為什麼主線是升學
const decisionRows = [
  { condition: '家裡可支撐 2 年碩士', points: '最大阻力消失 → 升學可行' },
  { condition: '動機是「怕升遷天花板」', points: '策略性理由，非逃避 → 升學合理' },
  { condition: '性向研究/實作都能做', points: '研究這條路對你是開的' },
  { condition: '想走科技業/大廠方向', points: '該領域碩士起薪與門檻紅利實在' },
];

const stages = [
  {
    id: 'summer',
    phase: '階段一',
    title: '暑假（7/1 ~ 開學）',
    subtitle: '作品集就是推甄的彈藥',
    desc: '暑假的作品集，直接是你秋天推甄書審的核心。',
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
    title: '二技二上（9 月 ~ 1 月）',
    subtitle: '推甄主戰場 ⭐',
    desc: '你的研究所入學屬 116 學年度，推甄落在 2026 年秋天。所有日期務必逐校查官網/簡章確認，各校不同。',
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
    subtitle: '實習學期（驗證 + 加分）',
    desc: '推甄在上學期已處理完，這學期安心實習，並把它變成升學的加分與方向的最終驗證。',
    current: false,
    sections: [
      {
        tag: '實習',
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
    subtitle: '銜接研究所',
    desc: '',
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
    subtitle: '深度養成期',
    desc: '',
    current: false,
    sections: [
      {
        tag: '碩一',
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
    subtitle: '收穫期',
    desc: '',
    current: false,
    sections: [
      {
        tag: '主線（升學）',
        color: 'study',
        items: [
          { id: 's6-1', text: '完成論文/專題並畢業' },
          { id: 's6-2', text: '靠研究成果＋實習經歷找到理想職位（科技業/大廠/研發）' },
          { id: 's6-3', text: '兵役擇期服完；到 25 歲帶著碩士學歷與實務進場，起跑點較高' },
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

const financeItems = [
  { id: 'f1', phase: '現在起', text: '記帳 + 每月自動小額儲蓄（養習慣）' },
  { id: 'f2', phase: '在學/實習有收入', text: '撥一部分進儲蓄' },
  { id: 'f3', phase: '兵役年', text: '加速存第一桶金' },
  { id: 'f4', phase: '25 歲前目標', text: '建立小額緊急預備金，了解指數型投資基本概念，避免收入變多就花更多' },
];

const reminders = [
  '升學是主線，但別現在賭死 —— 推甄門票先拿，實習做最後驗證。',
  '作品集 + 實習是你最該投資的兩樣 —— 升學這條路反而更吃它們。',
  '雲科保底，往上盡量衝 —— 學校層級決定碩士的報酬，別只把雲科當終點。',
  '念好學校 + 真的學到才有報酬 —— 研究所是助推器，不是混文憑。',
  '兵役那年是資產，升學可緩徵，擇期服完即可。',
];

// ── 子元件 ─────────────────────────────────────────────────

function CheckItem({ id, text, checked, onToggle }) {
  return (
    <label className={`${styles.checkItem} ${checked ? styles.checked : ''}`}>
      <input type="checkbox" checked={!!checked} onChange={() => onToggle(id)} />
      <span className={styles.checkBox}>{checked ? '✓' : ''}</span>
      <span className={styles.checkText}>{text}</span>
    </label>
  );
}

function StageAccordion({ stage, checks, onToggle, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);

  const totalItems = stage.sections.reduce((n, s) => n + s.items.length, 0);
  const doneItems = stage.sections.reduce((n, s) => n + s.items.filter(i => checks[i.id]).length, 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className={`${styles.accordion} ${stage.current ? styles.currentStage : ''}`}>
      <button className={styles.accordionHeader} onClick={() => setOpen(o => !o)}>
        <div className={styles.accordionLeft}>
          <span className={styles.phaseLabel}>{stage.phase}</span>
          <div>
            <div className={styles.accordionTitle}>{stage.title}</div>
            <div className={styles.accordionSub}>{stage.subtitle}</div>
          </div>
        </div>
        <div className={styles.accordionRight}>
          <div className={styles.progressBadge}>
            <span>{doneItems}/{totalItems}</span>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
        </div>
      </button>

      {open && (
        <div className={styles.accordionBody}>
          {stage.desc && <p className={styles.stageDesc}>{stage.desc}</p>}
          {stage.sections.map(sec => (
            <div key={sec.tag} className={styles.sectionBlock}>
              <span className={`${styles.sectionTag} ${styles[sec.color]}`}>{sec.tag}</span>
              <div className={styles.checkList}>
                {sec.items.map(item => (
                  <CheckItem key={item.id} id={item.id} text={item.text} checked={checks[item.id]} onToggle={onToggle} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 主頁面 ─────────────────────────────────────────────────

function Plan() {
  const [checks, setChecks] = useState(loadChecks);

  const toggle = (id) => {
    setChecks(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const allItems = [
    ...stages.flatMap(s => s.sections.flatMap(sec => sec.items)),
    ...financeItems,
  ];
  const totalDone = allItems.filter(i => checks[i.id]).length;
  const totalAll = allItems.length;
  const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

  return (
    <Layout>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroTag}>升學主線版・21 → 25 歲</div>
          <h1 className={styles.heroTitle}>我的人生規劃</h1>
          <blockquote className={styles.heroQuote}>
            家裡能支撐、動機是職涯策略（不是逃避）、性向研究/實作都能做、想走的方向涉及科技業——<strong>主線設定為「升學」</strong>，並用二技二下的實習做最後驗證，保留隨時轉就業的彈性。
          </blockquote>
          <div className={styles.overallProgress}>
            <span className={styles.progressLabel}>整體進度 {totalDone}/{totalAll}</span>
            <div className={styles.progressBarLarge}>
              <div className={styles.progressFillLarge} style={{ width: `${overallPct}%` }} />
            </div>
            <span className={styles.progressPct}>{overallPct}%</span>
          </div>
        </div>
      </section>

      <div className={styles.container}>

        {/* ── 座標 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>我的座標</h2>
          <div className={styles.coordGrid}>
            {coordinates.map(c => (
              <div key={c.label} className={styles.coordCard}>
                <span className={styles.coordIcon}>{c.icon}</span>
                <div>
                  <div className={styles.coordLabel}>{c.label}</div>
                  <div className={styles.coordValue}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 核心策略 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>貫穿全程的核心策略</h2>
          <div className={styles.strategyGrid}>
            {strategies.map(s => (
              <div key={s.num} className={styles.strategyCard}>
                <div className={styles.strategyNum}>{s.num}</div>
                <h3 className={styles.strategyTitle}>{s.title}</h3>
                <p className={styles.strategyBody}>{s.body}</p>
                <span className={styles.strategyHighlight}>{s.highlight}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 時間軸總覽 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>全程時間軸總覽</h2>
          <div className={styles.timeline}>
            {timelineItems.map((item, idx) => (
              <div key={idx} className={`${styles.timelineItem} ${item.current ? styles.timelineCurrent : ''}`}>
                <div className={styles.timelineDot} />
                {idx < timelineItems.length - 1 && <div className={styles.timelineLine} />}
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timelinePhase}>{item.phase}</span>
                    {item.current && <span className={styles.nowBadge}>▶ 現在</span>}
                  </div>
                  <div className={styles.timelineMeta}>{item.time}・{item.age} 歲</div>
                  <div className={styles.timelineTask}>{item.task}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.infoBox}>
            ℹ️ 兵役一年：升學者可緩徵，通常排在碩士畢業後；有薪餉可存第一桶金，也能拿來沉澱、考證照。
          </div>
        </section>

        {/* ── 決策點：為什麼主線是升學 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>決策點：為什麼主線是升學</h2>
          <div className={styles.decisionTableCard}>
            <div className={styles.decisionTable}>
              <div className={styles.decisionTableHead}>
                <span>你的條件</span>
                <span>指向</span>
              </div>
              {decisionRows.map(row => (
                <div key={row.condition} className={styles.decisionTableRow}>
                  <span className={styles.decisionCondition}>{row.condition}</span>
                  <span className={styles.decisionPoints}>{row.points}</span>
                </div>
              ))}
            </div>
            <div className={styles.decisionConclusion}>
              <strong>結論：以升學為主線。</strong> 但保留退路：二技二下實習若強烈拉你進業界，隨時可放掉錄取轉就業；就算將來想先工作，雲科也有碩士在職專班可以晚點補學歷。<strong>升學的門不會對你關上。</strong>
            </div>
          </div>
        </section>

        {/* ── 各階段詳情 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>各階段詳情 & 待辦清單</h2>
          <p className={styles.sectionSub}>點擊展開，勾選完成項目</p>
          <div className={styles.accordionList}>
            {stages.map((stage, i) => (
              <StageAccordion
                key={stage.id}
                stage={stage}
                checks={checks}
                onToggle={toggle}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        </section>

        {/* ── 理財 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>理財路線（全程）</h2>
          <div className={styles.financeList}>
            {financeItems.map(item => (
              <label key={item.id} className={`${styles.financeItem} ${checks[item.id] ? styles.checked : ''}`}>
                <input type="checkbox" checked={!!checks[item.id]} onChange={() => toggle(item.id)} />
                <span className={styles.checkBox}>{checks[item.id] ? '✓' : ''}</span>
                <div>
                  <div className={styles.financePhase}>{item.phase}</div>
                  <div className={styles.financeText}>{item.text}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ── 五個提醒 ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>五個核心提醒</h2>
          <div className={styles.reminderGrid}>
            {reminders.map((r, i) => (
              <div key={i} className={styles.reminderCard}>
                <div className={styles.reminderNum}>{i + 1}</div>
                <p className={styles.reminderText}>{r}</p>
              </div>
            ))}
          </div>
          <p className={styles.footnote}>
            想把「二技二上推甄」再拆成每週清單，或要列各目標校系的書審要求對照表，跟我說就行。
          </p>
        </section>

      </div>
    </Layout>
  );
}

export default Plan;
