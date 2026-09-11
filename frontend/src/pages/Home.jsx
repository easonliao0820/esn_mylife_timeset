import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import homeStyles from '../styles/pages/Home.module.scss';
import dashStyles from '../styles/Dashboard.module.scss';
import timelineStyles from '../styles/pages/Timeline.module.scss';
import ttStyles from '../styles/pages/Timetable.module.scss'; // 借用 Modal 樣式
import { fetchMergedTasks } from '../utils/dataService';
import { useCategories, getCategory, categoryStyleVars } from '../utils/categories';

function Home() {
  const categories = useCategories();
  const [tasks, setTasks] = useState([]);
  const [packedTasks, setPackedTasks] = useState([]);
  const [laneCount, setLaneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ remaining: '', unscheduled: '' });
  const [activeTaskId, setActiveTaskId] = useState(null);
  
  // 新增任務 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '14:00',
    endTime: '15:00',
    category: 'work'
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const scrollAreaRef = useRef(null);
  const pixelsPerHour = 100;

  const loadData = () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    fetchMergedTasks(todayStr)
      .then(mergedData => {
        setTasks(mergedData);
        const { packed, count } = packTasks(mergedData);
        setPackedTasks(packed);
        setLaneCount(count);
        calculateStats(mergedData);
        setLoading(false);
      })
      .catch(err => {
        console.error('無法獲取融合資料:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();

    // 監聽全域新增事件
    window.addEventListener('task-added', loadData);

    // 每分鐘更新一次時間線
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      window.removeEventListener('task-added', loadData);
      clearInterval(timer);
    };
  }, []);

  // 標籤被刪除時，表單分類自動退回第一個可用標籤（不寫回 state，避免多一次渲染）
  const effectiveCategory = categories.some(c => c.id === formData.category)
    ? formData.category
    : (categories[0]?.id || formData.category);

  // 當時間或任務更新時，重新計算統計資訊
  useEffect(() => {
    calculateStats(tasks);
  }, [currentTime, tasks]);

  // 初始載入時，捲動到目前時間（置中）
  useEffect(() => {
    if (!loading && scrollAreaRef.current) {
      const now = new Date();
      const currentX = (now.getHours() * 60 + now.getMinutes()) / 60 * pixelsPerHour;
      const containerWidth = scrollAreaRef.current.offsetWidth;
      const scrollPos = currentX - (containerWidth / 2);
      
      // 延遲一下確保 DOM 渲染完成
      setTimeout(() => {
        scrollAreaRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
      }, 100);
    }
  }, [loading]);

  // 提交新任務
  const handleAddTask = (e) => {
    e.preventDefault();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const newTask = {
      title: formData.title,
      time: `${formData.startTime} - ${formData.endTime}`,
      date: todayStr,
      category: effectiveCategory,
      status: '待處理'
    };

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    })
    .then(res => res.json())
    .then(() => {
      loadData();
      setIsModalOpen(false);
      setFormData({ title: '', startTime: '14:00', endTime: '15:00', category: 'work' });
    });
  };

  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除此任務嗎？')) {
      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        loadData();
      })
      .catch(err => console.error('刪除任務失敗:', err));
    }
  };

  useEffect(() => {
    if (activeTaskId && scrollAreaRef.current) {
      const activeTask = packedTasks.find(t => t._id === activeTaskId);
      if (activeTask && activeTask.time) {
        const [start] = activeTask.time.split(' - ');
        const taskX = timeToX(start.trim());
        const containerWidth = scrollAreaRef.current.offsetWidth;
        const scrollPos = taskX - (containerWidth / 2) + 50;
        scrollAreaRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'smooth' });
      }
    }
  }, [activeTaskId, packedTasks]);

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const packTasks = (taskList) => {
    const sorted = [...taskList]
      .filter(t => t.time && t.time.includes('-'))
      .sort((a, b) => {
        const startA = a.time.split(' - ')[0];
        const startB = b.time.split(' - ')[0];
        return startA.localeCompare(startB);
      });

    const lanes = [];
    const packed = sorted.map(task => {
      const [start, end] = task.time.split(' - ');
      const s = timeToMinutes(start.trim());
      const e = timeToMinutes(end.trim());
      let laneIndex = lanes.findIndex(lastEnd => lastEnd <= s);
      if (laneIndex === -1) { lanes.push(e); laneIndex = lanes.length - 1; }
      else { lanes[laneIndex] = e; }
      return { ...task, lane: laneIndex };
    });
    return { packed, count: lanes.length };
  };

  const calculateStats = (taskList) => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const diffMs = endOfDay - now;
    const remHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const remMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let remainingScheduledMins = 0;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    taskList.forEach(task => {
      if (task.time && task.time.includes('-')) {
        const [start, end] = task.time.split(' - ');
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        const taskStartMins = sH * 60 + sM;
        const taskEndMins = eH * 60 + eM;
        
        // 只計算「從現在起」剩餘的任務時間
        const contribution = Math.max(0, taskEndMins - Math.max(nowMins, taskStartMins));
        remainingScheduledMins += contribution;
      }
    });

    const remainingMinsToday = Math.max(0, (24 * 60) - nowMins);
    const unscheduledMins = Math.max(0, remainingMinsToday - remainingScheduledMins);
    
    setStats({
      remaining: `${remHrs}時 ${remMins}分`,
      unscheduled: `${Math.floor(unscheduledMins/60)}時 ${unscheduledMins%60}分`
    });
  };

  const timeToX = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return ((hours * 60) + minutes) / 60 * pixelsPerHour;
  };

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <Layout>
      <header className={homeStyles.hero}>
        <h1>精準掌握每一刻</h1>
        <p>清新的森林系風格，讓你的規劃更有靈感。</p>
      </header>

      <main className={dashStyles.dashboard}>
        <div className={homeStyles.statsSection}>
          <div className={`${dashStyles.glassCard} ${homeStyles.statCard}`}>
            <span className={homeStyles.statLabel}>今日剩餘時間</span>
            <div className={`${homeStyles.statValue} ${homeStyles.remaining}`}>{stats.remaining}</div>
          </div>
          <div className={`${dashStyles.glassCard} ${homeStyles.statCard}`}>
            <span className={homeStyles.statLabel}>尚未安排時段</span>
            <div className={`${homeStyles.statValue} ${homeStyles.unscheduled}`}>{stats.unscheduled}</div>
          </div>
        </div>

        <div className={`${dashStyles.glassCard} ${homeStyles.timelineWrapper}`} style={{ marginBottom: '1.5rem' }}>
          <div className={homeStyles.timelineHeader}>
            <div className={dashStyles.cardHeader}>
              <h2>時間規劃圖</h2>
              <div className={dashStyles.date}>
                {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          <div className={`${timelineStyles.timelinePage} ${homeStyles.timelineContent}`}>
            <div className={timelineStyles.sidebar} style={{ width: '60px' }}>
              {Array.from({ length: Math.max(laneCount, 1) }).map((_, i) => (
                <div key={i} className={timelineStyles.rowTitle} style={{ height: '80px', justifyContent: 'center', fontSize: '0.6rem', color: '#94a3b8' }}>
                  L-{i+1}
                </div>
              ))}
            </div>

            <div className={timelineStyles.scrollArea} ref={scrollAreaRef}>
              <div className={timelineStyles.horizontalContent} style={{ width: `${hours.length * pixelsPerHour}px` }}>
                <div className={timelineStyles.timeHeader} style={{ background: 'rgba(157, 197, 187, 0.4)' }}>
                  {hours.map(hour => (
                    <div key={hour} className={timelineStyles.hourLabel}>{String(hour).padStart(2, '0')}</div>
                  ))}
                </div>

                <div className={timelineStyles.timelineTrack} style={{ height: `${Math.max(laneCount, 1) * 80}px`, minHeight: '240px' }}>
                  {hours.map(hour => (
                    <div key={`line-${hour}`} className={timelineStyles.gridLine} style={{ left: `${hour * pixelsPerHour}px` }} />
                  ))}

                  {/* 目前時間線 */}
                  <div 
                    className={timelineStyles.currentTimeLine} 
                    style={{ 
                      left: `${(currentTime.getHours() * 60 + currentTime.getMinutes()) / 60 * pixelsPerHour}px` 
                    }} 
                  />

                  {packedTasks.map((task) => {
                    const [start, end] = task.time.split(' - ');
                    const left = timeToX(start.trim());
                    const right = timeToX(end.trim());
                    const isActive = activeTaskId === task._id;

                    return (
                      <div
                        key={task._id}
                        onClick={() => setActiveTaskId(task._id === activeTaskId ? null : task._id)}
                        className={`${timelineStyles.taskBar} ${homeStyles.catBar} ${isActive ? homeStyles.activeBar : ''}`}
                        style={{
                          left: `${left}px`,
                          width: `${right - left}px`,
                          top: `${(task.lane * 80) + 16}px`,
                          height: '48px',
                          zIndex: isActive ? 20 : 5,
                          ...categoryStyleVars(categories, task.category)
                        }}
                      >
                        <div className={timelineStyles.taskTitle} style={{ fontSize: '0.65rem' }}>
                          {task.isRecurring && '🔖 '}{task.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={homeStyles.taskCardGrid}>
          {packedTasks.map(task => (
            <div
              key={task._id}
              id={`card-${task._id}`}
              className={`${homeStyles.miniTaskCard} ${activeTaskId === task._id ? homeStyles.activeCard : ''}`}
              style={categoryStyleVars(categories, task.category)}
              onClick={() => setActiveTaskId(task._id === activeTaskId ? null : task._id)}
            >
              <div className={homeStyles.cardTop}>
                <span className={homeStyles.cardTime}>{task.time}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={homeStyles.categoryBadge}>
                    {task.isRecurring ? '課程' : getCategory(categories, task.category).label}
                  </span>
                  {!task.isRecurring && activeTaskId === task._id && (
                    <button 
                      className={homeStyles.deleteBtn} 
                      onClick={(e) => handleDeleteTask(e, task._id)}
                      title="刪除任務"
                    >✕</button>
                  )}
                </div>
              </div>
              <h4>{task.isRecurring && '🔖 '}{task.title}</h4>
              <p>{task.isRecurring ? '每週循環' : task.status}</p>
            </div>
          ))}
        </div>

        {/* 新增任務 Modal */}
        {isModalOpen && (
          <div className={ttStyles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={ttStyles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>規劃新任務</h3>
              <form onSubmit={handleAddTask}>
                <div className={ttStyles.formGroup}>
                  <label>任務名稱</label>
                  <input type="text" placeholder="要做什麼呢？" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                <div className={ttStyles.formRow}>
                  <div className={ttStyles.formGroup}>
                    <label>開始時間</label>
                    <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className={ttStyles.formGroup}>
                    <label>結束時間</label>
                    <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>
                <div className={ttStyles.formGroup}>
                  <label>分類</label>
                  <select value={effectiveCategory} onChange={e => setFormData({...formData, category: e.target.value})}>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={ttStyles.modalActions}>
                  <button type="button" className={ttStyles.cancelBtn} onClick={() => setIsModalOpen(false)}>取消</button>
                  <button type="submit" className={ttStyles.submitBtn}>加入行程</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default Home;
