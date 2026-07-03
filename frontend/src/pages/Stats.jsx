import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/pages/Stats.module.scss';
import dashStyles from '../styles/Dashboard.module.scss';

const CATEGORIES = {
  work:      { label: '工作/學習', color: '#17b890', bg: 'rgba(23,184,144,0.12)',  icon: '💼' },
  important: { label: '緊急/重要', color: '#c9a22a', bg: 'rgba(226,232,176,0.5)', icon: '⚡' },
  relax:     { label: '放鬆/休息', color: '#5ba3c9', bg: 'rgba(160,210,235,0.4)', icon: '🌿' },
  personal:  { label: '個人/生活', color: '#7c6a53', bg: 'rgba(124,106,83,0.15)', icon: '👤' },
};

function parseMinutes(timeStr) {
  if (!timeStr) return 0;
  const [start, end] = timeStr.split(' - ');
  if (!start || !end) return 0;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  return Math.max(0, (eH * 60 + eM) - (sH * 60 + sM));
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} 分`;
  return m > 0 ? `${h} 時 ${m} 分` : `${h} 時`;
}

const MONTH_NAMES = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

function Stats() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState({ work: 0, important: 0, relax: 0, personal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      try {
        const [tasksRes, scheduleRes] = await Promise.all([
          fetch(`/api/tasks?month=${monthStr}`),
          fetch('/api/schedule'),
        ]);
        const oneOffTasks = await tasksRes.json();
        const scheduleItems = await scheduleRes.json();

        const semesterStart = new Date(localStorage.getItem('tt_semesterStart') || '2026-02-16');
        const semesterEnd = new Date(localStorage.getItem('tt_semesterEnd') || '2026-06-22');

        const totals = { work: 0, important: 0, relax: 0, personal: 0 };

        oneOffTasks.forEach(task => {
          const cat = task.category || 'work';
          if (cat in totals) totals[cat] += parseMinutes(task.time);
        });

        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
          const target = new Date(dateStr);
          if (target >= semesterStart && target <= semesterEnd) {
            let dow = target.getDay();
            dow = dow === 0 ? 7 : dow;
            scheduleItems
              .filter(item => item.day === dow)
              .forEach(course => {
                const cat = course.category || 'work';
                if (cat in totals) totals[cat] += parseMinutes(course.time);
              });
          }
        }

        setStats(totals);
      } catch (err) {
        console.error('載入統計失敗:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentDate]);

  const changeMonth = (offset) => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  };

  const totalMinutes = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>時間統計</h1>
          <div className={styles.monthNav}>
            <button onClick={() => changeMonth(-1)}>←</button>
            <span>{currentDate.getFullYear()}年 {MONTH_NAMES[currentDate.getMonth()]}</span>
            <button onClick={() => changeMonth(1)}>→</button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>載入中...</div>
        ) : (
          <div className={styles.content}>
            <div className={`${dashStyles.glassCard} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>本月合計</p>
              <h2 className={styles.summaryHours}>{formatHours(totalMinutes)}</h2>
              <p className={styles.summaryCount}>
                {Object.values(stats).filter(v => v > 0).length} 個分類有紀錄
              </p>
            </div>

            <div className={`${dashStyles.glassCard} ${styles.barsCard}`}>
              <h3 className={styles.cardTitle}>各分類時數比較</h3>
              <div className={styles.barsList}>
                {Object.entries(CATEGORIES).map(([key, { label, color }]) => {
                  const min = stats[key] || 0;
                  const pct = totalMinutes > 0 ? (min / totalMinutes) * 100 : 0;
                  return (
                    <div key={key} className={styles.barRow}>
                      <div className={styles.barLabel}>
                        <span className={styles.dot} style={{ background: color }} />
                        <span>{label}</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                      <div className={styles.barMeta}>
                        <span className={styles.barHours}>{formatHours(min)}</span>
                        <span className={styles.barPct}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.catGrid}>
              {Object.entries(CATEGORIES).map(([key, { label, color, bg, icon }]) => {
                const min = stats[key] || 0;
                const pct = totalMinutes > 0 ? ((min / totalMinutes) * 100).toFixed(0) : 0;
                return (
                  <div
                    key={key}
                    className={`${dashStyles.glassCard} ${styles.catCard}`}
                    style={{ borderTop: `4px solid ${color}` }}
                  >
                    <div className={styles.catIcon} style={{ background: bg, color }}>{icon}</div>
                    <p className={styles.catLabel}>{label}</p>
                    <h3 className={styles.catHours} style={{ color }}>{formatHours(min)}</h3>
                    <p className={styles.catPct}>{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default Stats;
