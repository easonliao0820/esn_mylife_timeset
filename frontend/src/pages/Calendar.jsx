import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/pages/Calendar.module.scss';
import dashStyles from '../styles/Dashboard.module.scss';
import ttStyles from '../styles/pages/Timetable.module.scss'; // 借用 Modal 樣式
import { fetchMergedTasks } from '../utils/dataService';
import { useCategories, categoryStyleVars } from '../utils/categories';

function Calendar() {
  const categories = useCategories();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [monthStats, setMonthStats] = useState({ work: 0, important: 0, relax: 0 });
  const [activeDrawerTaskId, setActiveDrawerTaskId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 新增/編輯任務 Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null); // null = 新增，string = 編輯
  const [formData, setFormData] = useState({
    title: '',
    startTime: '10:00',
    endTime: '11:00',
    category: 'work'
  });
  const effectiveCategory = (formData.category === 'milestone' || categories.some(c => c.id === formData.category))
    ? formData.category
    : (categories[0]?.id || formData.category);

  const openAddModal = () => {
    setEditingTaskId(null);
    setFormData({ title: '', startTime: '10:00', endTime: '11:00', category: 'work' });
    setIsModalOpen(true);
  };

  const openEditModal = (e, task) => {
    e.stopPropagation();
    const [startTime, endTime] = task.time.split(' - ');
    setEditingTaskId(task._id);
    setFormData({ title: task.title, startTime, endTime, category: task.category || 'work' });
    setIsModalOpen(true);
  };

  const loadMonthData = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const promises = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      promises.push(fetchMergedTasks(dateStr));
    }
    
    const results = await Promise.all(promises);
    const flatTasks = results.flat();
    setAllTasks(flatTasks);
    
    let w = 0, i = 0, r = 0;
    flatTasks.forEach(t => {
      if (t.isMilestone) return;
      if (t.category === 'important') i++;
      else if (t.category === 'relax') r++;
      else w++;
    });
    setMonthStats({ work: w, important: i, relax: r, total: flatTasks.filter(t => !t.isMilestone).length });

    // 如果抽屜開著，同步更新抽屜內的任務
    if (selectedDateInfo) {
      const updatedDayTasks = flatTasks.filter(t => t.date === selectedDateInfo.dateStr);
      setSelectedDateInfo(prev => ({ ...prev, tasks: updatedDayTasks }));
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [currentDate, refreshTrigger]);

  useEffect(() => {
    const trigger = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('task-added', trigger);
    return () => window.removeEventListener('task-added', trigger);
  }, []);

  const handleSubmitTask = (e) => {
    e.preventDefault();
    const taskData = {
      title: formData.title,
      time: `${formData.startTime} - ${formData.endTime}`,
      category: effectiveCategory,
    };

    // 里程碑是虛擬任務（ID 格式 milestone-YYYY-MM-DD），無法 PATCH，改成 POST 轉為真實任務
    const isMilestoneEdit = editingTaskId?.startsWith('milestone-');
    const dateForTask = isMilestoneEdit
      ? editingTaskId.replace('milestone-', '')
      : selectedDateInfo.dateStr;

    const request = editingTaskId && !isMilestoneEdit
      ? fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        })
      : fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskData, date: dateForTask, status: '待處理' })
        });

    request.then(res => res.json()).then(() => {
      loadMonthData();
      setIsModalOpen(false);
      setEditingTaskId(null);
      setFormData({ title: '', startTime: '10:00', endTime: '11:00', category: 'work' });
    });
  };

  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除此任務嗎？')) {
      fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        loadMonthData();
      })
      .catch(err => console.error('刪除任務失敗:', err));
    }
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setIsDrawerOpen(false);
  };

  const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
  const dayNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  const handleDayClick = (day, month, year) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = allTasks.filter(task => task.date === dateStr);
    setSelectedDateInfo({ dateStr, tasks: dayTasks });
    setIsDrawerOpen(true);
    setActiveDrawerTaskId(null);
  };

  const renderDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const days = [];
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, currentMonth: false });
    }
    return days;
  };

  return (
    <Layout>
      <main className={dashStyles.dashboard} onClick={() => setActiveDrawerTaskId(null)}>
        <div className={styles.calendarLayout}>
          <aside className={styles.calendarSidebar}>
            <div className={dashStyles.glassCard}>
              <h3>本月焦點</h3>
              <div className={styles.statsList}>
                <div className={styles.statItem}>
                  <span className={styles.dot} style={{ background: 'var(--primary)' }}></span>
                  <div className={styles.statInfo}><label>工作任務</label><p>{monthStats.work} 項</p></div>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.dot} style={{ background: 'var(--leaf-yellow)' }}></span>
                  <div className={styles.statInfo}><label>重要活動</label><p>{monthStats.important} 項</p></div>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.dot} style={{ background: 'var(--lake-blue)' }}></span>
                  <div className={styles.statInfo}><label>放鬆心靈</label><p>{monthStats.relax} 項</p></div>
                </div>
              </div>
            </div>

          </aside>

          <div className={styles.calendarMain} style={{ marginRight: isDrawerOpen ? '320px' : '0' }}>
            <div className={dashStyles.glassCard} style={{ padding: '1.5rem' }}>
              <div className={styles.header}>
                <div className={styles.monthTitle}>
                  <h2>{currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}</h2>
                  <p>共計 {allTasks.length} 個行程項目</p>
                </div>
                <div className={styles.nav}>
                  <button onClick={() => changeMonth(-1)}>←</button>
                  <button onClick={() => {setCurrentDate(new Date()); setIsDrawerOpen(false);}}>今天</button>
                  <button onClick={() => changeMonth(1)}>→</button>
                </div>
              </div>

              <div className={styles.grid}>
                {dayNames.map(day => (
                  <div key={day} className={styles.dayHeader}>{day}</div>
                ))}
                {renderDays().map((dateObj, index) => {
                  const dateStr = `${dateObj.year}-${String(dateObj.month + 1).padStart(2, '0')}-${String(dateObj.day).padStart(2, '0')}`;
                  const dayTasks = allTasks.filter(task => task.date === dateStr);
                  const isToday = new Date().toDateString() === new Date(dateObj.year, dateObj.month, dateObj.day).toDateString();
                  const isSelected = selectedDateInfo?.dateStr === dateStr;

                  return (
                    <div
                      key={index}
                      onClick={() => handleDayClick(dateObj.day, dateObj.month, dateObj.year)}
                      className={`${styles.dayCell} ${!dateObj.currentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''} ${isSelected && isDrawerOpen ? styles.selected : ''}`}
                    >
                      <div className={styles.dateNum}>{dateObj.day}</div>
                      <div className={styles.taskLabels}>
                        {dayTasks.slice(0, 2).map((task, i) => (
                          <div key={i} className={`${styles.miniTask} ${task.isMilestone ? styles.miniTaskMilestone : ''}`}>{task.isRecurring && '🔖 '}{task.title}</div>
                        ))}
                        {dayTasks.length > 2 && <div className={styles.moreCount}>+ {dayTasks.length - 2}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`${styles.drawer} ${isDrawerOpen ? styles.open : ''}`}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerTitleArea}>
                <h3>{selectedDateInfo?.dateStr} 詳程</h3>
              </div>
              <button className={styles.closeBtn} onClick={() => setIsDrawerOpen(false)}>×</button>
            </div>
            <div className={styles.drawerContent}>
              <button className={styles.drawerAddBtn} onClick={openAddModal}>＋ 新增任務</button>
              <div className={styles.vTimelineWrapper}>
                <div className={styles.vTimelineTrack}>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className={styles.vHourSlot}>
                      <span className={styles.vHourLabel}>{String(h).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                  {selectedDateInfo?.tasks.map(task => {
                    const [start, end] = task.time.split(' - ');
                    const t = (h, m) => (h * 60 + m) * (35 / 60);
                    const [sH, sM] = start.split(':').map(Number);
                    const [eH, eM] = end.split(':').map(Number);
                    const top = t(sH, sM);
                    const height = Math.max(t(eH, eM) - top, 26);
                    const isActive = activeDrawerTaskId === task._id;
                    const isMilestoneCat = task.category === 'milestone';

                    return (
                      <div
                        key={task._id}
                        onClick={(e) => { e.stopPropagation(); setActiveDrawerTaskId(task._id === activeDrawerTaskId ? null : task._id); }}
                        className={`${styles.vTaskBlock} ${isMilestoneCat ? styles.milestone : styles.catColor} ${isActive ? styles.vActive : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: isActive ? 100 : 2,
                          ...(isMilestoneCat ? {} : categoryStyleVars(categories, task.category))
                        }}
                      >
                        <div className={styles.vTaskInner}>
                          <h4>{task.isRecurring && '🔖 '}{task.title}</h4>
                          <span>{task.time}</span>
                          {!task.isRecurring && isActive && (<>
                            <button
                              className={styles.editTaskBtn}
                              onClick={(e) => openEditModal(e, task)}
                              title="編輯任務"
                            >✎</button>
                            <button
                              className={styles.deleteTaskBtn}
                              onClick={(e) => handleDeleteTask(e, task._id)}
                              title="刪除任務"
                            >✕</button>
                          </>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 新增/編輯任務 Modal */}
        {isModalOpen && (
          <div className={ttStyles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={ttStyles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>{editingTaskId ? '編輯任務' : `在 ${selectedDateInfo?.dateStr} 新增任務`}</h3>
              <form onSubmit={handleSubmitTask}>
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
                    <option value="milestone">🚩 里程碑</option>
                  </select>
                </div>
                <div className={ttStyles.modalActions}>
                  <button type="button" className={ttStyles.cancelBtn} onClick={() => setIsModalOpen(false)}>取消</button>
                  <button type="submit" className={ttStyles.submitBtn}>{editingTaskId ? '儲存變更' : '加入行程'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default Calendar;
