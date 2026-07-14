import React, { useState, useEffect } from 'react';
import { sb } from './supabase';

export const ITEMS = [
  { code:'ST',  name:'Stroller',          emoji:'🛺', defaultImg:'https://i.ibb.co.com/fzwMy2XL/The-Edit-The-stroller-changing-the-game-banner-desktop.webp', priceHour:20000, priceOT30:10000, priceOT60:20000 },
  { code:'ST3', name:'Stroller Paket 3J', emoji:'🛺', defaultImg:'https://i.ibb.co.com/fzwMy2XL/The-Edit-The-stroller-changing-the-game-banner-desktop.webp', priceHour:50000, priceOT30:10000, priceOT60:20000, isPackage:true, packageHours:3 },
  { code:'SD',  name:'Scooter Dewasa',    emoji:'🛵', defaultImg:'https://i.ibb.co.com/rG55b6ts/wp8922917.jpg',                                                           priceHour:50000, priceOT30:25000, priceOT60:50000 },
  { code:'SJ',  name:'Scooter Jumbo',     emoji:'🦽', defaultImg:'https://i.ibb.co.com/hxVgMw63/Pngtree-3d-render-of-a-black-5598024.jpg',                               priceHour:60000, priceOT30:30000, priceOT60:60000 },
  { code:'SA',  name:'Scooter Anak',      emoji:'🛴', defaultImg:'https://i.ibb.co.com/qMZ9szQQ/adad.png',                                                               priceHour:35000, priceOT30:20000, priceOT60:35000 },
];

export const fmtRp = n => n ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : 'Rp 0';
export const fmtDur = s => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

function App() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [adminPassword, setAdminPassword] = useState('admin');
  const [shiftQueueNo, setShiftQueueNo] = useState(0);
  const [currentShiftUser, setCurrentShiftUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [sbConnected, setSbConnected] = useState(false);

  useEffect(() => {
    // Load initial localstorage
    try {
      const s = localStorage.getItem('kw_sessions');
      if (s) setActiveSessions(JSON.parse(s));
    } catch(e) {}
    try {
      const t = localStorage.getItem('kw_txns');
      if (t) setTransactions(JSON.parse(t));
    } catch(e) {}
    setAdminPassword(localStorage.getItem('kw_pass') || 'admin');
    setShiftQueueNo(parseInt(localStorage.getItem('kw_shiftQNo') || '0'));
    setCurrentShiftUser(localStorage.getItem('kw_currentUser'));
    
    const savedTheme = localStorage.getItem('kw_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="container py-5">
      <p>Current User: {currentShiftUser || 'Guest'}</p>
      <p>Theme: {theme}</p>
    </div>
  );
}

export default App;
