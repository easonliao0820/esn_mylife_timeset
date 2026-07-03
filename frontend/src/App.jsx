import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Memo from './pages/Memo';
import Timetable from './pages/Timetable';
import Settings from './pages/Settings'; // 也可用於人物頁面
import Stats from './pages/Stats';
import Plan from './pages/Plan';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/memo" element={<Memo />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/friends" element={<Settings />} /> {/* 對應 Navbar 的 /friends */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/plan" element={<Plan />} />
      </Routes>
    </Router>
  );
}

export default App;
