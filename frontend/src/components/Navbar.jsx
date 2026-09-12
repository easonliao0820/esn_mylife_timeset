import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/components/Navbar.module.scss';
import ttStyles from '../styles/pages/Timetable.module.scss'; // 借用一致的 Modal 樣式
import { useCategories } from '../utils/categories';
import { confirmNoTimeConflicts } from '../utils/dataService';

function Navbar() {
  const categories = useCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date: (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    startTime: '10:00',
    endTime: '11:00',
    category: 'work'
  });
  const effectiveCategory = categories.some(c => c.id === formData.category)
    ? formData.category
    : (categories[0]?.id || formData.category);

  const handleAddTask = async (e) => {
    e.preventDefault();
    const newTask = {
      title: formData.title,
      time: `${formData.startTime} - ${formData.endTime}`,
      date: formData.date,
      category: effectiveCategory,
      status: '待處理'
    };

    const canProceed = await confirmNoTimeConflicts(newTask.date, newTask.time);
    if (!canProceed) return;

    fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask)
    })
    .then(res => res.json())
    .then(() => {
      setIsModalOpen(false);
      // 發送自訂事件，通知所有頁面「資料已更新」
      window.dispatchEvent(new CustomEvent('task-added'));
      setFormData({
        title: '',
        date: (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        startTime: '10:00',
        endTime: '11:00',
        category: 'work'
      });
    });
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.logo}>ESN｜時間管理大師</div>
        <div className={styles.navLinks}>
          <Link to="/">首頁</Link>
          <Link to="/calendar">行事曆</Link>
          <Link to="/timetable">課表</Link>
          <Link to="/memo">備忘錄</Link>
          <Link to="/stats">統計</Link>
          <Link to="/friends">人物</Link>
          <Link to="/plan">人生規劃</Link>
        </div>
        <div className={styles.buttonArea}>
          <button className={styles.ctaButton} onClick={() => setIsModalOpen(true)}>+ 新增任務</button>
        </div>
      </nav>

      {/* 全域新增任務 Modal */}
      {isModalOpen && (
        <div className={ttStyles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={ttStyles.modalContent} onClick={e => e.stopPropagation()}>
            <h3>全域新增任務</h3>
            <form onSubmit={handleAddTask}>
              <div className={ttStyles.formGroup}>
                <label>任務名稱</label>
                <input type="text" placeholder="要做什麼呢？" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className={ttStyles.formGroup}>
                <label>選擇日期</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
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
    </>
  );
}

export default Navbar;
