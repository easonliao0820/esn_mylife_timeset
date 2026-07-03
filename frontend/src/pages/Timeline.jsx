import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import dashStyles from '../styles/Dashboard.module.scss';
import styles from '../styles/pages/Timeline.module.scss';

function Timeline() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(err => console.error('Error fetching tasks:', err));
  }, []);

  const startHour = 0;
  const endHour = 24;
  const pixelsPerHour = 50;

  const timeToX = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = (hours * 60) + minutes;
    const startMinutes = startHour * 60;
    return ((totalMinutes - startMinutes) / 60) * pixelsPerHour;
  };

  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={dashStyles.glassCard} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.1rem' }}>每日任務時間線</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })} 任務分佈 (00:00 - 24:00)
            </p>
          </div>

          <div className={styles.timelinePage}>
            {/* 左側固定標題欄 */}
            <div className={styles.sidebar}>
              {tasks.map(task => (
                <div key={`title-${task._id}`} className={styles.rowTitle}>
                  {task.title}
                </div>
              ))}
            </div>

            {/* 右側可捲動區域 */}
            <div className={styles.scrollArea}>
              <div className={styles.horizontalContent} style={{ width: `${hours.length * pixelsPerHour}px` }}>
                
                {/* 時間刻度標頭 (隨內容橫向捲動) */}
                <div className={styles.timeHeader}>
                  {hours.map(hour => (
                    <div key={hour} className={styles.hourLabel}>
                      {String(hour).padStart(2, '0')}
                    </div>
                  ))}
                </div>

                {/* 任務軌道區 */}
                <div className={styles.timelineTrack}>
                  {/* 輔助網格線 */}
                  {hours.map(hour => (
                    <div 
                      key={`line-${hour}`} 
                      className={styles.gridLine} 
                      style={{ left: `${(hour - startHour) * pixelsPerHour}px` }} 
                    />
                  ))}

                  {/* 渲染任務色塊 */}
                  {tasks.map((task, index) => {
                    if (!task.time || !task.time.includes('-')) return null;
                    const [start, end] = task.time.split(' - ');
                    const left = timeToX(start.trim());
                    const right = timeToX(end.trim());
                    const width = right - left;

                    if (left < 0) return null;

                    return (
                      <div 
                        key={task._id} 
                        className={`${styles.taskBar} ${task.status === '已完成' ? styles.completed : ''}`}
                        title={`${task.title} (${task.time})`}
                        style={{ 
                          left: `${left}px`, 
                          width: `${width}px`,
                          top: `${(index * 30) + 4}px` 
                        }}
                      >
                        <div className={styles.taskTitle}>{task.title}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Timeline;
