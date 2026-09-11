import React, { useState } from 'react';
import { loadCategories, saveCategories, DEFAULT_CATEGORIES } from '../utils/categories';
import styles from '../styles/components/CategoryEditor.module.scss';

function makeId() {
  return `cat_${Math.random().toString(36).slice(2, 9)}`;
}

function CategoryEditor() {
  const [list, setList] = useState(loadCategories);

  const persist = (next) => {
    setList(next);
    saveCategories(next);
  };

  const updateItem = (id, field, value) => {
    persist(list.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const addItem = () => {
    persist([...list, { id: makeId(), label: '新標籤', color: '#17b890', icon: '🏷️' }]);
  };

  const removeItem = (id) => {
    if (list.length <= 1) return;
    if (!window.confirm('確定要刪除這個標籤嗎？已經使用這個標籤的任務/課程不會被刪除，但會失去顏色與名稱對應。')) return;
    persist(list.filter(c => c.id !== id));
  };

  const resetToDefault = () => {
    if (!window.confirm('確定要重設為預設的 4 個標籤嗎？你自訂的標籤將會遺失。')) return;
    persist(DEFAULT_CATEGORIES);
  };

  return (
    <div className={styles.categoryEditor}>
      <div className={styles.catRows}>
        {list.map(cat => (
          <div key={cat.id} className={styles.catRow}>
            <input
              type="color"
              className={styles.colorInput}
              value={cat.color}
              onChange={e => updateItem(cat.id, 'color', e.target.value)}
              title="標籤顏色"
            />
            <input
              type="text"
              className={styles.iconInput}
              value={cat.icon || ''}
              onChange={e => updateItem(cat.id, 'icon', e.target.value)}
              placeholder="🏷️"
              maxLength={4}
              title="標籤圖示"
            />
            <input
              type="text"
              className={styles.labelInput}
              value={cat.label}
              onChange={e => updateItem(cat.id, 'label', e.target.value)}
              placeholder="標籤名稱"
            />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeItem(cat.id)}
              disabled={list.length <= 1}
              title="刪除標籤"
            >✕</button>
          </div>
        ))}
      </div>
      <div className={styles.catActions}>
        <button type="button" className={styles.addBtn} onClick={addItem}>+ 新增標籤</button>
        <button type="button" className={styles.resetBtn} onClick={resetToDefault}>重設為預設</button>
      </div>
    </div>
  );
}

export default CategoryEditor;
