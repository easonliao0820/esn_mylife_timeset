/**
 * 全站共用的「標籤」（任務/課程分類）設定
 * 使用者可在「統計」頁面自訂每個標籤的名稱、顏色、圖示，或新增/刪除標籤
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'app_categories';
const UPDATED_EVENT = 'categories-updated';

export const DEFAULT_CATEGORIES = [
  { id: 'work', label: '工作/學習', color: '#17b890', icon: '💼' },
  { id: 'important', label: '緊急/重要', color: '#c9a22a', icon: '⚡' },
  { id: 'relax', label: '放鬆/休息', color: '#5ba3c9', icon: '🌿' },
  { id: 'personal', label: '個人/生活', color: '#7c6a53', icon: '👤' },
];

export function loadCategories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  window.dispatchEvent(new Event(UPDATED_EVENT));
}

// 在任何元件內取得「會隨標籤設定即時更新」的分類清單
export function useCategories() {
  const [categories, setCategories] = useState(loadCategories);

  useEffect(() => {
    const refresh = () => setCategories(loadCategories());
    window.addEventListener(UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return categories;
}

export function getCategory(categories, id) {
  return categories.find(c => c.id === id) || categories[0] || DEFAULT_CATEGORIES[0];
}

// 提供給任何有顏色顯示需求的元素，透過 CSS 變數帶入該分類目前的顏色
export function categoryStyleVars(categories, id) {
  return { '--cat-color': getCategory(categories, id).color };
}

export function tint(color, pct) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function shade(color, pct) {
  return `color-mix(in srgb, ${color} ${pct}%, black)`;
}
