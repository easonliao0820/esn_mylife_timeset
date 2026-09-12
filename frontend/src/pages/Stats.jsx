import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import CategoryEditor from '../components/CategoryEditor';
import styles from '../styles/pages/Stats.module.scss';
import dashStyles from '../styles/Dashboard.module.scss';
import { useCategories, tint } from '../utils/categories';
import { fetchMergedTasks } from '../utils/dataService';

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

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMon);
  return d;
}

const MONTH_NAMES = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];

function Stats() {
  const categories = useCategories();
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [catSettingsOpen, setCatSettingsOpen] = useState(false);

  useEffect(() => {
    const loadMonth = async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const [tasksRes, scheduleRes] = await Promise.all([
        fetch(`/api/tasks?month=${monthStr}`),
        fetch('/api/schedule'),
      ]);
      const oneOffTasks = await tasksRes.json();
      const scheduleItems = await scheduleRes.json();

      const semesterStart = new Date(localStorage.getItem('tt_semesterStart') || '2026-02-16');
      const semesterEnd = new Date(localStorage.getItem('tt_semesterEnd') || '2026-06-22');

      const totals = Object.fromEntries(categories.map(c => [c.id, 0]));
      const fallbackId = categories[0]?.id;
      const resolveCat = (cat) => (cat && cat in totals) ? cat : fallbackId;

      oneOffTasks.forEach(task => {
        const cat = resolveCat(task.category);
        if (cat) totals[cat] += parseMinutes(task.time);
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
              const cat = resolveCat(course.category);
              if (cat) totals[cat] += parseMinutes(course.time);
            });
        }
      }

      return totals;
    };

    const loadWeek = async () => {
      const totals = Object.fromEntries(categories.map(c => [c.id, 0]));
      const fallbackId = categories[0]?.id;
      const resolveCat = (cat) => (cat && cat in totals) ? cat : fallbackId;

      const dayResults = await Promise.all(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date(currentWeekStart);
          d.setDate(d.getDate() + i);
          return fetchMergedTasks(formatDateStr(d));
        })
      );

      dayResults.flat().forEach(task => {
        if (task.isMilestone) return;
        const cat = resolveCat(task.category);
        if (cat) totals[cat] += parseMinutes(task.time);
      });

      return totals;
    };

    const run = async () => {
      setLoading(true);
      try {
        setStats(await (viewMode === 'week' ? loadWeek() : loadMonth()));
      } catch (err) {
        console.error('載入統計失敗:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentDate, currentWeekStart, viewMode, categories]);

  const changeMonth = (offset) => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + offset, 1));
  };

  const changeWeek = (offset) => {
    setCurrentWeekStart(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + offset * 7);
      return next;
    });
  };

  const totalMinutes = Object.values(stats).reduce((a, b) => a + b, 0);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const totalMonthMinutes = daysInMonth * 24 * 60;
  const totalWeekMinutes = 7 * 24 * 60;
  const periodTotalMinutes = viewMode === 'week' ? totalWeekMinutes : totalMonthMinutes;
  const periodLabel = viewMode === 'week' ? '本週合計' : '本月合計';

  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRangeLabel = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>時間統計</h1>
          <div className={styles.headerRight}>
            <div className={styles.viewModeToggle}>
              <button
                className={viewMode === 'month' ? styles.viewModeActive : ''}
                onClick={() => setViewMode('month')}
              >本月</button>
              <button
                className={viewMode === 'week' ? styles.viewModeActive : ''}
                onClick={() => setViewMode('week')}
              >本週</button>
            </div>
            {viewMode === 'week' ? (
              <div className={styles.monthNav}>
                <button onClick={() => changeWeek(-1)}>←</button>
                <span>{currentWeekStart.getFullYear()}年 {weekRangeLabel}</span>
                <button onClick={() => changeWeek(1)}>→</button>
              </div>
            ) : (
              <div className={styles.monthNav}>
                <button onClick={() => changeMonth(-1)}>←</button>
                <span>{currentDate.getFullYear()}年 {MONTH_NAMES[currentDate.getMonth()]}</span>
                <button onClick={() => changeMonth(1)}>→</button>
              </div>
            )}
            <button className={styles.catSettingsToggle} onClick={() => setCatSettingsOpen(o => !o)}>
              🏷️ 標籤設定 {catSettingsOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {catSettingsOpen && (
          <div className={`${dashStyles.glassCard} ${styles.catSettingsCard}`}>
            <h3 className={styles.cardTitle}>標籤設定</h3>
            <p className={styles.catSettingsHint}>在這裡新增、刪除、改名或改變顏色，會套用到首頁、課表、行事曆、備忘錄等所有地方。</p>
            <CategoryEditor />
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>載入中...</div>
        ) : (
          <div className={styles.content}>
            <div className={`${dashStyles.glassCard} ${styles.summaryCard}`}>
              <p className={styles.summaryLabel}>{periodLabel}</p>
              <h2 className={styles.summaryHours}>
                {formatHours(totalMinutes)}
                <span className={styles.summaryTotal}> / {formatHours(periodTotalMinutes)}</span>
              </h2>
              <p className={styles.summaryCount}>
                {Object.values(stats).filter(v => v > 0).length} 個分類有紀錄
              </p>
            </div>

            <div className={`${dashStyles.glassCard} ${styles.barsCard}`}>
              <h3 className={styles.cardTitle}>各分類時數比較</h3>
              <div className={styles.barsList}>
                {categories.map(({ id: key, label, color }) => {
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
              {categories.map(({ id: key, label, color, icon }) => {
                const min = stats[key] || 0;
                const pct = totalMinutes > 0 ? ((min / totalMinutes) * 100).toFixed(0) : 0;
                return (
                  <div
                    key={key}
                    className={`${dashStyles.glassCard} ${styles.catCard}`}
                    style={{ borderTop: `4px solid ${color}` }}
                  >
                    <div className={styles.catIcon} style={{ background: tint(color, 15), color }}>{icon}</div>
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
