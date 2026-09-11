import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import dashStyles from '../styles/Dashboard.module.scss';
import styles from '../styles/pages/Timetable.module.scss';
import { useCategories, categoryStyleVars } from '../utils/categories';

function Timetable() {
  const categories = useCategories();
  const startHour = 8;
  const [endHour, setEndHour] = useState(22);
  
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  // 課表分組（可切換多份課表）；學期日期範圍存在各課表的資料上，隨選取的課表衍生出來
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(localStorage.getItem('tt_selectedTableId') || '');
  const selectedTable = tables.find(t => t._id === selectedTableId);
  const semesterStart = selectedTable?.semesterStart || '2026-02-16';
  const semesterEnd = selectedTable?.semesterEnd || '2026-06-22';
  
  // Modal 與 編輯狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    day: 1,
    startTime: '09:00',
    endTime: '12:00',
    room: '',
    category: 'work'
  });

  const fetchSchedule = (tableId) => {
    if (!tableId) return;
    fetch(`/api/schedule?tableId=${tableId}`)
      .then(res => res.json())
      .then(data => {
        setSchedule(data);
        setLoading(false);
      })
      .catch(err => console.error('無法獲取課表:', err));
  };

  const fetchTables = () => {
    fetch('/api/schedule-tables')
      .then(res => res.json())
      .then(data => {
        setTables(data);
        setSelectedTableId(prev => {
          if (prev && data.some(t => t._id === prev)) return prev;
          return data[0]?._id || '';
        });
      })
      .catch(err => console.error('無法獲取課表清單:', err));
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    if (selectedTableId) {
      localStorage.setItem('tt_selectedTableId', selectedTableId);
      fetchSchedule(selectedTableId);
    }
  }, [selectedTableId]);

  // 標籤被刪除時，表單分類自動退回第一個可用標籤（不寫回 state，避免多一次渲染）
  const effectiveCategory = categories.some(c => c.id === formData.category)
    ? formData.category
    : (categories[0]?.id || formData.category);

  const updateTableField = (field, value) => {
    setTables(prev => prev.map(t => t._id === selectedTableId ? { ...t, [field]: value } : t));

    fetch(`/api/schedule-tables/${selectedTableId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    }).catch(err => console.error('無法更新學期範圍:', err));
  };

  const handleCreateTable = () => {
    const name = window.prompt('新課表名稱？（例如：正課課表、讀書計劃）');
    if (!name || !name.trim()) return;
    fetch('/api/schedule-tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    })
      .then(res => res.json())
      .then(newTable => {
        setTables(prev => [...prev, newTable]);
        setSelectedTableId(newTable._id);
      });
  };

  const handleDeleteTable = () => {
    if (!selectedTable) return;
    if (!window.confirm(`確定要刪除課表「${selectedTable.name}」嗎？此課表底下所有課程也會一併刪除。`)) return;
    fetch(`/api/schedule-tables/${selectedTable._id}`, { method: 'DELETE' })
      .then(() => {
        setTables(prev => {
          const remaining = prev.filter(t => t._id !== selectedTable._id);
          setSelectedTableId(remaining[0]?._id || '');
          return remaining;
        });
      })
      .catch(err => console.error('無法刪除課表:', err));
  };

  // 開啟新增模式
  const openAddModal = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setFormData({ name: '', day: 1, startTime: '09:00', endTime: '12:00', room: '', category: 'work' });
    setIsModalOpen(true);
  };

  // 開啟編輯模式
  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentEditId(item._id);
    const [start, end] = item.time.split(' - ');
    setFormData({
      name: item.name,
      day: item.day,
      startTime: start.trim(),
      endTime: end.trim(),
      room: item.room || '',
      category: item.category || 'work'
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('確定要刪除這門課程嗎？這會影響所有週次的顯示。')) {
      fetch(`/api/schedule/${id}`, { method: 'DELETE' })
        .then(() => fetchSchedule(selectedTableId));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const itemData = {
      name: formData.name,
      day: parseInt(formData.day),
      time: `${formData.startTime} - ${formData.endTime}`,
      room: formData.room,
      category: effectiveCategory,
      tableId: selectedTableId
    };

    const url = isEditing ? `/api/schedule/${currentEditId}` : '/api/schedule';
    const method = isEditing ? 'PATCH' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    })
    .then(res => res.json())
    .then(() => {
      fetchSchedule(selectedTableId);
      setIsModalOpen(false);
    });
  };

  const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  const calculateWeekProgress = () => {
    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);
    const today = new Date();
    const startDay = start.getDay();
    const diffToMon = startDay === 0 ? 6 : startDay - 1;
    start.setDate(start.getDate() - diffToMon);
    const totalDiff = end - start;
    const totalWeeks = Math.ceil(totalDiff / (1000 * 60 * 60 * 24 * 7));
    const currentDiff = today - start;
    const currentWeek = Math.floor(currentDiff / (1000 * 60 * 60 * 24 * 7)) + 1;
    return { current: currentWeek > 0 ? currentWeek : 1, total: totalWeeks > 0 ? totalWeeks : 1 };
  };

  const weekInfo = calculateWeekProgress();

  const getTaskStyle = (timeStr) => {
    const [start, end] = timeStr.split(' - ');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    // 如果課程超出當前設定的顯示範圍，進行裁切或隱藏
    const displayStartH = Math.max(startH, startHour);
    const displayEndH = Math.min(endH, endHour);
    
    if (displayStartH >= endHour || displayEndH <= startHour) return { display: 'none' };

    const startOffset = (displayStartH - startHour) * 60 + (startH < startHour ? 0 : startM);
    const duration = (displayEndH * 60 + (endH > endHour ? 0 : endM)) - (displayStartH * 60 + (startH < startHour ? 0 : startM));
    
    return {
      top: `${(startOffset / 60) * 40}px`,
      height: `${(duration / 60) * 40}px`,
    };
  };

  const getTodayIndex = () => {
    const day = new Date().getDay();
    if (day === 0) return 6; // 週日
    return day - 1; // 週一(1) -> 0 ... 週六(6) -> 5
  };

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <header className={styles.tableHeader}>
          <div className={styles.singleLineHeader}>
            <div className={styles.leftSide}>
              <h2 style={{ fontSize: '1.6rem', fontWeight: '800' }}>週課表地圖</h2>
              <div className={styles.weekBadge}>第 {weekInfo.current} / {weekInfo.total} 週</div>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                style={{ borderRadius: '8px', padding: '4px 8px' }}
              >
                {tables.map(t => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
              <button className={styles.addTableBtn} onClick={handleCreateTable}>+ 新增課表</button>
              {selectedTable && (
                <button className={styles.deleteTableBtn} onClick={handleDeleteTable}>刪除課表</button>
              )}
              <button className={styles.addBtn} onClick={openAddModal}>+ 新增課程</button>
            </div>
            
            <div className={styles.rightSide}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', marginRight: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedTable?.showOnCalendar !== false}
                  onChange={(e) => updateTableField('showOnCalendar', e.target.checked)}
                />
                顯示在行事曆/首頁/時間軸
              </label>
              <div className={styles.dateInputGroup}>
                <span className={styles.inputLabel}>學期：</span>
                <input type="date" value={semesterStart} onChange={(e) => updateTableField('semesterStart', e.target.value)} />
                <span className={styles.separator}>~</span>
                <input type="date" value={semesterEnd} onChange={(e) => updateTableField('semesterEnd', e.target.value)} />
              </div>
            </div>
          </div>
        </header>

        <div className={`${dashStyles.glassCard} ${styles.timetableContainer}`}>
          <div className={styles.timetableWrapper}>
            <div className={styles.timeColumn}>
              <div className={styles.cornerLabel}>Time</div>
              {hours.map(hour => (
                <div key={hour} className={styles.hourSlot}>{String(hour).padStart(2, '0')}:00</div>
              ))}
            </div>

            <div className={styles.gridContainer}>
              <div className={styles.gridHeader}>
                {days.map((day, i) => (
                  <div key={day} className={`${styles.dayLabel} ${i === getTodayIndex() ? styles.today : ''}`}>{day}</div>
                ))}
              </div>

              <div className={styles.gridBody} style={{ height: `${hours.length * 40}px` }}>
                {hours.map(hour => (
                  <div key={hour} className={styles.gridRow}>
                    {days.map((_, i) => (<div key={i} className={styles.gridCell} />))}
                  </div>
                ))}

                {schedule.filter(item => item.day >= 1 && item.day <= 7).map(item => (
                  <div
                    key={item._id}
                    onClick={() => openEditModal(item)}
                    className={`${styles.courseCard} ${styles.catCourse}`}
                    style={{
                      ...getTaskStyle(item.time),
                      left: `calc(${(item.day - 1) * (100 / days.length)}% + 3px)`,
                      width: `calc(${100 / days.length}% - 6px)`,
                      ...categoryStyleVars(categories, item.category)
                    }}
                  >
                    <div className={styles.courseInner}>
                      <button className={styles.deleteBtn} onClick={(e) => handleDelete(item._id, e)}>✕</button>
                      <span className={styles.courseTime}>{item.time}</span>
                      <h4>{item.name}</h4>
                      <span className={styles.courseRoom}>{item.room}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <h3>{isEditing ? '修改課程項目' : '新增課程項目'}</h3>
              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label>課程名稱</label>
                  <input type="text" placeholder="例如：品牌設計研究" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>上課日</label>
                    <select value={formData.day} onChange={e => setFormData({...formData, day: parseInt(e.target.value)})}>
                      <option value="1">週一</option>
                      <option value="2">週二</option>
                      <option value="3">週三</option>
                      <option value="4">週四</option>
                      <option value="5">週五</option>
                      <option value="6">週六</option>
                      <option value="7">週日</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>分類</label>
                    <select value={effectiveCategory} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>開始時間</label>
                    <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>結束時間</label>
                    <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>上課地點</label>
                  <input type="text" placeholder="例如：大禮堂 201" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>取消</button>
                  {isEditing && (
                    <button type="button" className={styles.deleteBtnInModal} onClick={(e) => handleDelete(currentEditId, e)}>
                      刪除課程
                    </button>
                  )}
                  <button type="submit" className={styles.submitBtn}>{isEditing ? '儲存修改' : '確認新增'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

export default Timetable;
