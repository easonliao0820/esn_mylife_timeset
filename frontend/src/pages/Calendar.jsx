import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/pages/Calendar.module.scss';
import dashStyles from '../styles/Dashboard.module.scss';
import ttStyles from '../styles/pages/Timetable.module.scss'; // 借用 Modal 樣式
import { fetchMergedTasks, confirmNoTimeConflicts, findTimeConflicts, resolveTaskConflictsOnServer, saveScheduleException } from '../utils/dataService';
import { useCategories, categoryStyleVars } from '../utils/categories';

function Calendar() {
  const categories = useCategories();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTasks, setAllTasks] = useState([]);
  const [selectedDateInfo, setSelectedDateInfo] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [monthStats, setMonthStats] = useState({});
  const [activeDrawerTaskId, setActiveDrawerTaskId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dragInfo, setDragInfo] = useState(null); // { id, dateStr, startClientY, originStartMin, durationMin, liveStartMin, moved }
  const [courseMoveConfirm, setCourseMoveConfirm] = useState(null); // { courseId, dateStr, newTime, taskConflicts }
  const PX_PER_MIN = 35 / 60;
  
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

    const totals = Object.fromEntries(categories.map(c => [c.id, 0]));
    const fallbackId = categories[0]?.id;
    flatTasks.forEach(t => {
      if (t.isMilestone) return;
      const cat = (t.category && t.category in totals) ? t.category : fallbackId;
      if (cat) totals[cat] += 1;
    });
    setMonthStats(totals);

    // 如果抽屜開著，同步更新抽屜內的任務
    if (selectedDateInfo) {
      const updatedDayTasks = flatTasks.filter(t => t.date === selectedDateInfo.dateStr);
      setSelectedDateInfo(prev => ({ ...prev, tasks: updatedDayTasks }));
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [currentDate, refreshTrigger, categories]);

  useEffect(() => {
    const trigger = () => setRefreshTrigger(prev => prev + 1);
    window.addEventListener('task-added', trigger);
    return () => window.removeEventListener('task-added', trigger);
  }, []);

  const handleSubmitTask = async (e) => {
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
    const isNewTask = !editingTaskId || isMilestoneEdit;

    if (isNewTask) {
      const canProceed = await confirmNoTimeConflicts(dateForTask, taskData.time);
      if (!canProceed) return;
    }

    const request = isNewTask
      ? fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskData, date: dateForTask, status: '待處理' })
        })
      : fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
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

  const minutesToHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  // 拖曳色塊來改時段：單次任務跟課表課程都可以拖，里程碑不行（虛擬項目，只能點擊展開）
  const handleTaskDragStart = (e, task) => {
    if (e.target.closest('button')) return; // 讓編輯/刪除按鈕的點擊正常運作，不搶走 pointer capture
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (task.isMilestone) return;

    const [start, end] = task.time.split(' - ');
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const originStartMin = sH * 60 + sM;
    const durationMin = (eH * 60 + eM) - originStartMin;
    setDragInfo({
      id: task._id,
      dateStr: selectedDateInfo.dateStr,
      startClientY: e.clientY,
      originStartMin,
      durationMin,
      liveStartMin: originStartMin,
      moved: false
    });
  };

  const handleTaskDragMove = (e) => {
    if (!dragInfo) return;
    const deltaY = e.clientY - dragInfo.startClientY;
    if (Math.abs(deltaY) > 3) {
      const deltaMin = Math.round((deltaY / PX_PER_MIN) / 5) * 5;
      const maxStart = 1440 - dragInfo.durationMin;
      const liveStartMin = Math.min(Math.max(dragInfo.originStartMin + deltaMin, 0), maxStart);
      setDragInfo(prev => prev && ({ ...prev, liveStartMin, moved: true }));
    }
  };

  const handleTaskDragEnd = async (e, task) => {
    if (e.target.closest('button')) return; // 編輯/刪除按鈕自己的 onClick 會處理，這裡不要搶著切換展開狀態
    const info = dragInfo;
    setDragInfo(null);

    // 沒有實際拖動（或這個色塊本來就不能拖），視為單純點擊，切換展開狀態
    if (!info || info.id !== task._id || !info.moved) {
      setActiveDrawerTaskId(prev => (prev === task._id ? null : task._id));
      return;
    }
    if (info.liveStartMin === info.originStartMin) return;

    const newTime = `${minutesToHHMM(info.liveStartMin)} - ${minutesToHHMM(info.liveStartMin + info.durationMin)}`;

    if (task.isRecurring) {
      // 課表課程：每週重複，搬動時要讓使用者選擇是套用到所有週次、還是只調整這一天
      const courseId = task._id.replace('course-', '');
      const taskConflicts = await findTimeConflicts(info.dateStr, newTime);
      setCourseMoveConfirm({ courseId, dateStr: info.dateStr, newTime, taskConflicts });
      return;
    }

    const canProceed = await confirmNoTimeConflicts(info.dateStr, newTime, info.id);
    if (!canProceed) return;

    fetch(`/api/tasks/${info.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: newTime })
    })
      .then(res => res.json())
      .then(() => loadMonthData())
      .catch(err => console.error('更新任務時間失敗:', err));
  };

  // 套用課程時間調整到「所有週次」（直接改課表本身）
  const applyCourseMoveAllWeeks = () => {
    const { courseId, dateStr, newTime } = courseMoveConfirm;
    setCourseMoveConfirm(null);
    fetch(`/api/schedule/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: newTime })
    })
      .then(() => resolveTaskConflictsOnServer(dateStr, newTime))
      .then(() => loadMonthData())
      .catch(err => console.error('更新課程時間失敗:', err));
  };

  // 只調整這一天的課程時間，其他週次維持原本時間
  const applyCourseMoveThisDayOnly = () => {
    const { courseId, dateStr, newTime } = courseMoveConfirm;
    setCourseMoveConfirm(null);
    saveScheduleException(courseId, dateStr, newTime)
      .then(() => resolveTaskConflictsOnServer(dateStr, newTime))
      .then(() => loadMonthData())
      .catch(err => console.error('儲存單日例外失敗:', err));
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
                {categories.map(cat => (
                  <div key={cat.id} className={styles.statItem}>
                    <span className={styles.dot} style={{ background: cat.color }}></span>
                    <div className={styles.statInfo}><label>{cat.icon} {cat.label}</label><p>{monthStats[cat.id] || 0} 項</p></div>
                  </div>
                ))}
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
                          <div
                            key={i}
                            className={`${styles.miniTask} ${task.isMilestone ? styles.miniTaskMilestone : ''}`}
                            style={task.isMilestone ? {} : categoryStyleVars(categories, task.category)}
                          >{task.isRecurring && '🔖 '}{task.title}</div>
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
                    const [sH, sM] = start.split(':').map(Number);
                    const [eH, eM] = end.split(':').map(Number);
                    const originStartMin = sH * 60 + sM;
                    const durationMin = (eH * 60 + eM) - originStartMin;
                    const isDraggable = !task.isMilestone;
                    const isDragging = isDraggable && dragInfo?.id === task._id && dragInfo.moved;

                    const startMin = isDragging ? dragInfo.liveStartMin : originStartMin;
                    const top = startMin * PX_PER_MIN;
                    const height = Math.max(durationMin * PX_PER_MIN, 26);
                    const displayTime = isDragging
                      ? `${minutesToHHMM(startMin)} - ${minutesToHHMM(startMin + durationMin)}`
                      : task.time;

                    const isActive = activeDrawerTaskId === task._id;
                    const isMilestoneCat = task.category === 'milestone';

                    return (
                      <div
                        key={task._id}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => handleTaskDragStart(e, task)}
                        onPointerMove={handleTaskDragMove}
                        onPointerUp={(e) => handleTaskDragEnd(e, task)}
                        className={`${styles.vTaskBlock} ${isMilestoneCat ? styles.milestone : styles.catColor} ${isActive ? styles.vActive : ''} ${isDraggable ? styles.vDraggable : ''} ${isDragging ? styles.vDragging : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          zIndex: isDragging ? 200 : (isActive ? 100 : 2),
                          ...(isMilestoneCat ? {} : categoryStyleVars(categories, task.category))
                        }}
                      >
                        <div className={styles.vTaskInner}>
                          <h4>{task.isRecurring && '🔖 '}{task.title}</h4>
                          <span>{displayTime}</span>
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

        {/* 課程拖曳搬動時間：選擇只調整這一天、還是套用到所有週次 */}
        {courseMoveConfirm && (
          <div className={ttStyles.modalOverlay} onClick={() => setCourseMoveConfirm(null)}>
            <div className={ttStyles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>搬動課程時間</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                這是每週重複的課程，新時段為 <strong>{courseMoveConfirm.newTime}</strong>。
                要只調整 <strong>{courseMoveConfirm.dateStr}</strong> 這一天，還是套用到所有週次？
              </p>
              {courseMoveConfirm.taskConflicts.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: '#b85252', lineHeight: 1.6 }}>
                  這個時段也跟以下行程衝突，繼續的話它們會自動調整時間：<br />
                  {courseMoveConfirm.taskConflicts.map(c => `・${c.title}（${c.time}）`).join('　')}
                </p>
              )}
              <div className={ttStyles.modalActions}>
                <button type="button" className={ttStyles.cancelBtn} onClick={() => setCourseMoveConfirm(null)}>取消</button>
                <button type="button" className={ttStyles.cancelBtn} onClick={applyCourseMoveThisDayOnly}>只調整這一天</button>
                <button type="button" className={ttStyles.submitBtn} onClick={applyCourseMoveAllWeeks}>套用到所有週次</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default Calendar;
