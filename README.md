# ⏳ 時光規劃大師 PRO (Time Planner PRO)

這是一個基於 **React + Flask + MongoDB (NoSQL)** 架構開發的現代化時間管理工具。採用了極簡的 **Glassmorphism (玻璃擬態)** 設計風格與高密度資訊佈局。

學習/工作
💼 📚 💻 ✏️ 📝 🎓 🧑‍💻 📊 🖥️ 📖

重要/緊急
⚡ 🚨 ❗ 🔥 ⭐ 🎯 📌 ⏰ 🚩

放鬆/休息
🌿 ☕ 🎮 🎵 🧘 🛋️ 🌙 🍃 🎨 😌

個人/生活
🏠 🛒 🍳 🧺 💪 🏃 🩺 🐾 🌸

其他常用
✅ 📅 🔔 💰 ✈️ 🎉 📷 🧩 🔧 💡

## 🚀 快速啟動指南

### 1. 前置準備
請確保你的電腦已安裝以下環境：
- **Node.js** (建議 v18 以上)
- **Python 3.x**
- **MongoDB** (本地端執行於 27017 端口)
### 2. 後端設定 (Backend)
開啟終端機進入 `backend` 資料夾：
```bash
cd backend
# 安裝必要套件
pip3 install -r requirements.txt
# 建立初始測試資料
python3 seed.py
# 啟動 API 伺服器
python3 app.py
```
*API 將執行於：`http://localhost:5000`*

### 3. 前端設定 (Frontend)
開啟另一個終端機進入 `frontend` 資料夾：
```bash
cd frontend
# 安裝相依性
npm install
# 啟動開發伺服器
npm run dev
```
*網頁將開啟於：`http://localhost:5173`*

---

## 🎨 核心功能說明

### 📋 儀表板 (Dashboard)
- 顯示今日所有行程任務。
- 自動標示任務狀態：`已完成` (綠)、`執行中` (紫)、`待處理` (灰)。
- 支援動態日期顯示。

### 📅 專業行事曆 (Calendar)
- 全自研月曆邏輯，支援跨月瀏覽。
- **自動關聯**：直接在日曆格內顯示對應日期的任務標籤。
- 當天日期自動高亮顯示。

### 📊 橫向時間線 (Timeline)
- **甘特圖視覺化**：以橫向色塊呈現全天任務分佈。
- **自動避讓**：重疊時間的任務會自動垂直堆疊，清晰不遮擋。
- 支援滑鼠懸停顯示詳細資訊。

### 📝 隨手備忘錄 (Memo)
- 獨立的 NoSQL 存儲空間。
- 支援即時新增與刪除備忘內容。
- 採用高對比度輸入介面，易於操作。

---

## 🛠️ 技術架構
- **前端**：React 19 + Vite + React Router
- **樣式**：SCSS Modules (採用 @use 現代語法) + CSS Variables
- **後端**：Flask (Python) + Flask-CORS
- **資料庫**：MongoDB (NoSQL)

## 📁 專案結構
```text
.
├── backend/
│   ├── app.py          # Flask 主程式
│   ├── seed.py         # 資料庫初始化腳本
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── components/  # 共用元件 (Navbar, Layout)
    │   ├── pages/       # 頁面元件 (Home, Calendar, Timeline, Memo)
    │   └── styles/      # 模組化樣式 (SCSS)
    └── package.json
```

---
*本專案由 Antigravity 輔助開發，專注於提供極致流暢的使用者體驗。*
