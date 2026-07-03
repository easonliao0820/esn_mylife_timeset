import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import dashStyles from '../styles/Dashboard.module.scss';
import memoStyles from '../styles/pages/Memo.module.scss';
import { loadPlanChecks, savePlanChecks, planStages } from '../utils/planData';

function Memo() {
  const [memos, setMemos] = useState([]);
  const [newMemo, setNewMemo] = useState('');
  const [category, setCategory] = useState('work');
  const [loading, setLoading] = useState(true);
  const [planChecks, setPlanChecks] = useState(loadPlanChecks);
  const [planOpen, setPlanOpen] = useState(true);
  const [activeStageId, setActiveStageId] = useState('summer');

  useEffect(() => {
    fetchMemos();
  }, []);

  const fetchMemos = () => {
    fetch('/api/memos')
      .then(res => res.json())
      .then(data => {
        setMemos(data);
        setLoading(false);
      })
      .catch(err => console.error('Error fetching memos:', err));
  };

  const handleAddMemo = () => {
    if (!newMemo.trim()) return;
    
    const memoData = {
      content: newMemo,
      category: category,
      created_at: new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    fetch('/api/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoData)
    })
    .then(res => res.json())
    .then(() => {
      setNewMemo('');
      fetchMemos();
    });
  };

  const handleDeleteMemo = (id) => {
    fetch(`/api/memos/${id}`, { method: 'DELETE' })
      .then(() => fetchMemos());
  };

  const togglePlanCheck = (id) => {
    setPlanChecks(prev => {
      const next = { ...prev, [id]: !prev[id] };
      savePlanChecks(next);
      return next;
    });
  };

  const getTagName = (cat) => {
    switch(cat) {
      case 'important': return '🚨 重要';
      case 'relax': return '🌿 靈感';
      case 'personal': return '🏠 個人';
      default: return '💻 工作';
    }
  };

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={memoStyles.memoContainer}>
          
          <header className={dashStyles.cardHeader} style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>靈感牆</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              記錄這片森林裡的每一個瞬間
            </p>
          </header>

          {/* 規劃待辦整合區塊 */}
          <div className={memoStyles.planSection}>
            <button className={memoStyles.planToggle} onClick={() => setPlanOpen(o => !o)}>
              <span>📋 規劃待辦</span>
              <span className={memoStyles.planToggleArrow}>{planOpen ? '▲' : '▼'}</span>
            </button>
            {planOpen && (
              <div className={memoStyles.planBody}>
                <div className={memoStyles.stageTabs}>
                  {planStages.map(s => (
                    <button
                      key={s.id}
                      className={`${memoStyles.stageTab} ${activeStageId === s.id ? memoStyles.stageTabActive : ''}`}
                      onClick={() => setActiveStageId(s.id)}
                    >
                      {s.phase}
                    </button>
                  ))}
                </div>
                {planStages.filter(s => s.id === activeStageId).map(stage => (
                  <div key={stage.id}>
                    <div className={memoStyles.stageTitle}>{stage.title}</div>
                    {stage.sections.map(sec => (
                      <div key={sec.tag} className={memoStyles.planSec}>
                        <span className={`${memoStyles.secTag} ${memoStyles[sec.color]}`}>{sec.tag}</span>
                        {sec.items.map(item => (
                          <label key={item.id} className={`${memoStyles.planItem} ${planChecks[item.id] ? memoStyles.planItemDone : ''}`}>
                            <input type="checkbox" checked={!!planChecks[item.id]} onChange={() => togglePlanCheck(item.id)} />
                            <span className={memoStyles.planCheckBox}>{planChecks[item.id] ? '✓' : ''}</span>
                            <span className={memoStyles.planItemText}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <Link to="/plan" className={memoStyles.planFullLink}>→ 查看完整規劃頁面</Link>
              </div>
            )}
          </div>

          {/* 輸入區塊 */}
          <div className={memoStyles.inputSection}>
            <input 
              type="text" 
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              placeholder="在此輸入筆記或靈感..."
              onKeyPress={(e) => e.key === 'Enter' && handleAddMemo()}
            />
            <select 
              className={memoStyles.categorySelect} 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="work">💻 工作</option>
              <option value="important">🚨 重要</option>
              <option value="relax">🌿 靈感</option>
              <option value="personal">🏠 個人</option>
            </select>
            <button className={memoStyles.addBtn} onClick={handleAddMemo}>新增筆記</button>
          </div>

          {/* 瀑布流展示區 */}
          <div className={memoStyles.memoMasonry}>
            {loading ? (
              <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>正在尋找筆記...</p>
            ) : memos.length > 0 ? (
              memos.map(memo => (
                <div key={memo._id} className={`${memoStyles.memoCard} ${memoStyles[memo.category || 'work']}`}>
                  <div className={memoStyles.memoHeader}>
                    <span className={memoStyles.tag}>{getTagName(memo.category)}</span>
                  </div>
                  <p className={memoStyles.content}>{memo.content}</p>
                  <div className={memoStyles.footer}>
                    <span className={memoStyles.date}>{memo.created_at}</span>
                    <button 
                      className={memoStyles.deleteBtn}
                      onClick={() => handleDeleteMemo(memo._id)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)', marginTop: '3rem' }}>
                目前沒有任何筆記。
              </p>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}

export default Memo;
