import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
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
  const [isTrackingMode, setIsTrackingMode] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [liveTime, setLiveTime] = useState('00:00:00');
  const [liveDate, setLiveDate] = useState('—');

  const handleLogin = (user) => {
    // Find proper capitalization
    const cName = user.charAt(0).toUpperCase() + user.slice(1);
    setCurrentShiftUser(cName);
    localStorage.setItem('kw_currentUser', cName);
  };

  const handleLogout = () => {
    if (window.confirm(`Akhiri shift sebagai ${currentShiftUser}?`)) {
      localStorage.removeItem('kw_currentUser');
      localStorage.removeItem('kw_shiftQNo');
      setShiftQueueNo(0);
      setCurrentShiftUser(null);
    }
  };

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

    const savedTheme = localStorage.getItem('kw_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Check saved user
    const savedUser = localStorage.getItem('kw_currentUser');
    if (savedUser) setCurrentShiftUser(savedUser);

    // Check hash route
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#track/')) {
        setIsTrackingMode(true);
        setTrackingId(hash.replace('#track/', '').trim());
      } else {
        setIsTrackingMode(false);
        setTrackingId('');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);

    // Start clock
    const tick = () => {
      const now = new Date();
      setLiveTime(now.toTimeString().slice(0, 8));
      const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      setLiveDate(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    };
    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      window.removeEventListener('hashchange', checkHash);
      clearInterval(interval);
    };
  }, []);

  if (isTrackingMode) {
    return (
      <div id="trackingPage">
        <div className="track-body" style={{ color: 'white', padding: '40px' }}>
          <h2>Tracking Sesi: {trackingId}</h2>
          <p>Fitur tracking akan dikembangkan pada task selanjutnya.</p>
        </div>
      </div>
    );
  }

  if (!currentShiftUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div id="mainApp">
      <header className="app-header sticky-top">
        <div className="container-fluid px-3 px-md-4">
          <div className="d-flex align-items-center justify-content-between py-2 gap-2">
            <div>
              <div className="brand-title">EVREN HOUSE</div>
              <div className="brand-sub">Scooter &amp; Stroller</div>
            </div>
            <div className="d-flex align-items-center gap-2 gap-md-3">
              <div className="shift-indicator d-flex" onClick={handleLogout}>
                <span className="shift-dot"></span>
                <span>{currentShiftUser}</span>
                <i className="bi bi-box-arrow-right ms-1" style={{ fontSize: '.75rem', opacity: .6 }}></i>
              </div>
              <div className="text-end">
                <div className="clock-time">{liveTime}</div>
                <div className="clock-date d-none d-sm-block">{liveDate}</div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="container-fluid px-2 px-md-3 py-3" style={{ paddingBottom: '80px' }}>
        <h4>Active Tab: {activeTab}</h4>
      </div>
    </div>
  );
}

export default App;
