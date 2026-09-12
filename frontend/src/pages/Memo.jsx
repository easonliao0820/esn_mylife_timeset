import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import dashStyles from '../styles/Dashboard.module.scss';
import memoStyles from '../styles/pages/Memo.module.scss';
import { useCategories, getCategory, categoryStyleVars } from '../utils/categories';

function Memo() {
  const categories = useCategories();
  const [memos, setMemos] = useState([]);
  const [newMemo, setNewMemo] = useState('');
  const [category, setCategory] = useState('work');
  const [loading, setLoading] = useState(true);
  const effectiveCategory = categories.some(c => c.id === category)
    ? category
    : (categories[0]?.id || category);

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
      category: effectiveCategory,
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
    if (!window.confirm('確定要刪除這則筆記嗎？')) return;
    fetch(`/api/memos/${id}`, { method: 'DELETE' })
      .then(() => fetchMemos());
  };

  const handleChangeMemoCategory = (id, newCategory) => {
    setMemos(prev => prev.map(m => m._id === id ? { ...m, category: newCategory } : m));
    fetch(`/api/memos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newCategory })
    }).catch(err => console.error('更新筆記標籤失敗:', err));
  };

  return (
    <Layout>
      <main className={dashStyles.dashboard}>
        <div className={memoStyles.memoContainer}>
          
          <header className={dashStyles.cardHeader} style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>便利貼
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              記錄這片森林裡的每一個瞬間
            </p>
          </header>

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
              value={effectiveCategory}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
            <button className={memoStyles.addBtn} onClick={handleAddMemo}>新增筆記</button>
          </div>

          {/* 瀑布流展示區 */}
          <div className={memoStyles.memoMasonry}>
            {loading ? (
              <p style={{ textAlign: 'center', gridColumn: '1/-1', color: 'var(--text-secondary)' }}>正在尋找筆記...</p>
            ) : memos.length > 0 ? (
              memos.map(memo => {
                const memoCategory = getCategory(categories, memo.category).id;
                return (
                <div key={memo._id} className={memoStyles.memoCard} style={categoryStyleVars(categories, memo.category)}>
                  <div className={memoStyles.memoHeader}>
                    <select
                      className={memoStyles.tag}
                      value={memoCategory}
                      onChange={(e) => handleChangeMemoCategory(memo._id, e.target.value)}
                      title="更改標籤"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                      ))}
                    </select>
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
                );
              })
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
