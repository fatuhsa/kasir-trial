import React, { useState, useEffect } from 'react';
import { ITEMS, fmtRp, fmtDur } from '../App';

function DashboardTab({ activeSessions, onStartSewa, getImgUrl, onSelesaiSewa, onShowQR, onEditSesi }) {
  const [inputNama, setInputNama] = useState('');
  const [payAwal, setPayAwal] = useState('cash');
  const [selectedQty, setSelectedQty] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionDurations, setSessionDurations] = useState({});

  // Live counter update loop
  useEffect(() => {
    const updateTimers = () => {
      const updated = {};
      activeSessions.forEach(s => {
        const sec = Math.floor((Date.now() - s.startTime) / 1000);
        updated[s.id] = sec;
      });
      setSessionDurations(updated);
    };
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [activeSessions]);

  const changeQty = (code, delta) => {
    setSelectedQty(prev => {
      const val = Math.max(0, (prev[code] || 0) + delta);
      return { ...prev, [code]: val };
    });
  };

  const handleStart = () => {
    const nama = inputNama.trim();
    if (!nama) { alert('Masukkan nama penyewa!'); return; }
    const items = ITEMS.filter(i => (selectedQty[i.code] || 0) > 0)
                       .map(i => ({ code: i.code, qty: selectedQty[i.code] }));
    if (items.length === 0) { alert('Pilih minimal satu item!'); return; }
    
    onStartSewa(nama, items, payAwal);
    
    // Reset form
    setInputNama('');
    setPayAwal('cash');
    setSelectedQty({});
  };

  const filteredSessions = activeSessions
    .filter(s => s.nama.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.startTime - a.startTime);

  return (
    <div id="tab-dashboard" className="tab-pane active">
      <div className="row g-3">
        <div className="col-12 col-lg-5 d-flex flex-column">
          <div className="panel flex-fill">
            <div className="panel-head"><i className="bi bi-plus-circle-fill clr-yellow"></i><span>Sewa Baru</span></div>
            <div className="panel-body">
              <label className="field-label">Nama Penyewa</label>
              <div className="input-ico-wrap mb-3">
                <i className="bi bi-person-fill ico"></i>
                <input 
                  type="text" 
                  value={inputNama} 
                  onChange={(e) => setInputNama(e.target.value)} 
                  className="cfield" 
                  placeholder="Masukkan nama penyewa..." 
                />
              </div>
              <label className="field-label mb-2">Metode Bayar Awal (Tarif Pokok)</label>
              <div className="pay-awal-selector mb-3">
                <label className="pay-awal-opt">
                  <input 
                    type="radio" 
                    name="payAwal" 
                    checked={payAwal === 'cash'} 
                    onChange={() => setPayAwal('cash')} 
                  />
                  <span><i className="bi bi-cash-stack me-1"></i>Cash</span>
                </label>
                <label className="pay-awal-opt">
                  <input 
                    type="radio" 
                    name="payAwal" 
                    checked={payAwal === 'qris'} 
                    onChange={() => setPayAwal('qris')} 
                  />
                  <span><i className="bi bi-qr-code-scan me-1"></i>QRIS</span>
                </label>
              </div>
              <label className="field-label mb-2">Pilih Item &amp; Jumlah</label>
              <div className="row row-cols-2 row-cols-sm-3 g-2 mb-3">
                {ITEMS.map(item => {
                  const qty = selectedQty[item.code] || 0;
                  const img = getImgUrl(item.code) || item.defaultImg;
                  const priceLabel = item.isPackage ? `Paket ${item.packageHours}jam ${fmtRp(item.priceHour)}` : `${fmtRp(item.priceHour)}/jam`;
                  return (
                    <div className="col" key={item.code}>
                      <div className={`item-card ${qty > 0 ? 'selected' : ''}`}>
                        <div className="item-img-box">
                          <img src={img} alt={item.name} onError={(e) => { e.target.parentElement.innerHTML = `<div style="font-size:2rem">${item.emoji}</div>` }} />
                        </div>
                        <div className="item-code">{item.code}</div>
                        <div className="item-name">{item.name}</div>
                        <div className="item-price">{priceLabel}</div>
                        <div className="qty-control">
                          <button className="qty-btn minus" onClick={() => changeQty(item.code, -1)}>−</button>
                          <span className="qty-val">{qty}</span>
                          <button className="qty-btn" onClick={() => changeQty(item.code, 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="btn-start w-100" onClick={handleStart}>
                <i className="bi bi-play-circle-fill me-2"></i>Mulai Sewa Sekarang
              </button>
            </div>
          </div>
        </div>
        
        <div className="col-12 col-lg-7 d-flex flex-column">
          <div className="panel flex-fill">
            <div className="panel-head">
              <i className="bi bi-people-fill clr-cyan"></i><span>Penyewa Aktif</span>
              <span className="ms-auto aktif-count">{activeSessions.length}</span>
            </div>
            <div className="panel-body">
              <div className="input-ico-wrap mb-3">
                <i className="bi bi-search ico"></i>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="cfield" 
                  placeholder="Cari nama penyewa..." 
                />
              </div>
              <div className="aktif-scroll">
                {filteredSessions.length === 0 ? (
                  <div className="empty-box"><i className="bi bi-hourglass-split"></i><p>Belum ada penyewa aktif</p></div>
                ) : (
                  filteredSessions.map(s => {
                    const elapsedSec = sessionDurations[s.id] || 0;
                    // Determine status dot
                    const pkgItem = s.items.find(it => {
                      const d = ITEMS.find(item => item.code === it.code);
                      return d && d.isPackage;
                    });
                    const pkgHours = pkgItem ? (ITEMS.find(item => item.code === pkgItem.code)?.packageHours || 1) : 1;
                    const limitMin = pkgItem ? pkgHours * 60 : 60;
                    const overMin = (elapsedSec / 60) - limitMin;
                    
                    let dotClass = 'dot dot-ok';
                    if (overMin > 25) dotClass = 'dot dot-hot';
                    else if (overMin > 10) dotClass = 'dot dot-warn';

                    return (
                      <div className="aktif-card" key={s.id}>
                        <div className="d-flex align-items-center justify-content-between mb-1 gap-2" style={{ minWidth: 0 }}>
                          <div className="aktif-name" style={{ marginBottom: 0 }}>
                            <i className="bi bi-person-fill me-1 clr-cyan"></i>{s.nama}
                          </div>
                          <span className={`aktif-pay-badge ${s.payAwal}`}>
                            <i className={`bi ${s.payAwal === 'qris' ? 'bi-qr-code-scan' : 'bi-cash-stack'}`}></i>
                            {s.payAwal.toUpperCase()}
                          </span>
                        </div>
                        <div className="item-tags">
                          {s.items.map(it => (
                            <span className="itag" key={it.code}>{it.code}×{it.qty}</span>
                          ))}
                        </div>
                        <div className="aktif-meta">
                          <span className="aktif-start-lbl">
                            <i className="bi bi-clock me-1"></i>
                            {new Date(s.startTime).toTimeString().slice(0,5)}
                          </span>
                          <span className="aktif-timer">{fmtDur(elapsedSec)}</span>
                        </div>
                        <div className="aktif-footer">
                          <button className="btn-selesai" onClick={() => onSelesaiSewa(s)}>
                            <i className="bi bi-stop-circle-fill me-1"></i>Selesai &amp; Bayar
                          </button>
                          <button className="btn-qr-aktif" onClick={() => onShowQR(s)}><i className="bi bi-qr-code"></i></button>
                          <button className="btn-edit-aktif" onClick={() => onEditSesi(s)}><i className="bi bi-pencil-fill"></i></button>
                          <span className={dotClass}></span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardTab;
