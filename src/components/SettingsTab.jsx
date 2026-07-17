import React, { useState } from 'react';
import { ITEMS } from '../App';

const APP_VERSION = '1.3.0';
const DEPLOY_DATE = '17 Jul 2026';

function SettingsTab({ 
  theme, 
  onThemeChange, 
  adminPassword, 
  onUpdateAdminPassword, 
  sbConnected, 
  lastSyncTime, 
  onSyncPull, 
  onSyncPush,
  printMulai,
  onChangePrintMulai,
  printSelesai,
  onChangePrintSelesai,
  onUpdateItemImg,
  onResetItemImg,
  getImgUrl
}) {
  const [newPassInput, setNewPassInput] = useState('');
  const [oldPassInput, setOldPassInput] = useState('');

  const handleChangePass = () => {
    const oldP = oldPassInput.trim();
    const newP = newPassInput.trim();
    if (!newP || !oldP) {
      alert('Masukkan password lama dan baru!');
      return;
    }
    if (oldP !== adminPassword) {
      alert('Password lama salah!');
      return;
    }
    if (window.confirm('Ubah password admin?')) {
      onUpdateAdminPassword(newP);
      setOldPassInput('');
      setNewPassInput('');
    }
  };

  const handleUploadImg = (code) => {
    const url = prompt('Masukkan URL gambar baru:');
    if (url) {
      onUpdateItemImg(code, url);
    }
  };

  const handleResetImg = (code) => {
    if (window.confirm('Reset ke gambar default?')) {
      onResetItemImg(code);
    }
  };

  return (
    <div id="tab-pengaturan" className="tab-pane active">
      <div className="row g-3">
        <div className="col-12">
          <div className="panel">
            <div className="panel-head">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                <path d="M3.89 15.672L6.255.461A.542.542 0 017.27.288l2.543 4.771 2.39-4.52a.542.542 0 01.96 0L22.073 22H3.89z" fill="#FFA000"/>
                <path d="M17.656 18.281L13.84 3.326a.545.545 0 00-1.05-.021L9.274 10.52 17.656 18.281z" fill="#F57F17"/>
                <path d="M3.89 15.672l.924-8.684 4.46 12.992zM22.073 22l-4.417-3.719L13.83 22z" fill="#FFCA28"/>
              </svg>
              <span>Koneksi Supabase</span>
              <span className="ms-auto">
                {sbConnected ? (
                  <span className="fb-badge fb-badge-connected" style={{ color: 'var(--green)', fontSize: '0.85rem' }}>
                    <span className="fb-status-dot fb-dot-connected" style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--green)', borderRadius: '50%', marginRight: '6px' }}></span>
                    Terhubung
                  </span>
                ) : (
                  <span className="fb-badge fb-badge-connecting" style={{ color: 'var(--orange)', fontSize: '0.85rem' }}>
                    <span className="fb-status-dot fb-dot-connecting" style={{ display: 'inline-block', width: '8px', height: '8px', background: 'var(--orange)', borderRadius: '50%', marginRight: '6px' }}></span>
                    Terputus
                  </span>
                )}
              </span>
            </div>
            <div className="panel-body">
              <div className="fb-auto-card p-3 border rounded" style={{ background: 'var(--bg3)' }}>
                <div className="fa-title font-weight-bold mb-2"><i className="bi bi-lightning-charge-fill me-1"></i>Terhubung ke Supabase</div>
                <div className="fa-desc small text-secondary mb-3">Data sesi aktif, transaksi, dan QR tracking tersimpan di cloud. QR yang di-scan penyewa akan load data langsung dari Supabase secara real-time.</div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-sm btn-outline-info" onClick={onSyncPull}><i className="bi bi-arrow-down-circle-fill me-1"></i>Tarik Data Cloud</button>
                  <button className="btn btn-sm btn-info text-white" onClick={onSyncPush} style={{ background: 'linear-gradient(135deg,#58a6ff,#1f6feb)', borderColor: '#388bfd' }}><i className="bi bi-arrow-up-circle-fill me-1"></i>Kirim Data Cloud</button>
                </div>
                <div className="mt-3 small text-secondary">Terakhir sinkron: <span>{lastSyncTime || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="panel h-100">
            <div className="panel-head"><i className="bi bi-image-fill clr-yellow"></i><span>Gambar Item</span></div>
            <div className="panel-body">
              <div className="row row-cols-2 row-cols-sm-3 g-2">
                {ITEMS.map(item => {
                  const img = getImgUrl(item.code) || item.defaultImg;
                  return (
                    <div className="col" key={item.code}>
                      <div className="setting-card p-2 border rounded text-center" style={{ background: 'var(--bg3)' }}>
                        <div className="setting-img-box mb-2" style={{ height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', borderRadius: '8px', overflow: 'hidden' }}>
                          <img 
                            src={img} 
                            alt={item.name}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.parentElement.innerHTML = `<div style="font-size:2rem">${item.emoji}</div>` }} 
                          />
                        </div>
                        <div className="setting-code small font-weight-bold" style={{ color: 'var(--yellow)' }}>{item.code}</div>
                        <div className="setting-name small text-truncate mb-2">{item.name}</div>
                        <div className="d-flex gap-1">
                          <button className="btn btn-sm btn-outline-secondary w-50" style={{ fontSize: '0.72rem' }} onClick={() => handleUploadImg(item.code)}>Ubah</button>
                          <button className="btn btn-sm btn-outline-danger w-50" style={{ fontSize: '0.72rem' }} onClick={() => handleResetImg(item.code)}>Reset</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-5">
          <div className="row g-3">
            <div className="col-12">
              <div className="panel">
                <div className="panel-head"><i className="bi bi-palette-fill clr-yellow"></i><span>Tampilan</span></div>
                <div className="panel-body">
                  <div className="toggle-row d-flex justify-content-between align-items-center">
                    <div>
                      <div style={{ fontWeight: 700 }}>Mode Tampilan</div>
                      <div className="small text-secondary">{theme === 'dark' ? 'Mode Gelap aktif' : 'Mode Terang aktif'}</div>
                    </div>
                    <div className="theme-seg d-flex border rounded overflow-hidden">
                      <button className={`theme-seg-btn btn btn-sm py-2 px-3 border-0 rounded-0 ${theme === 'light' ? 'active bg-primary text-white' : 'btn-dark'}`} onClick={() => onThemeChange('light')}><i className="bi bi-sun-fill me-1"></i>Light</button>
                      <button className={`theme-seg-btn btn btn-sm py-2 px-3 border-0 rounded-0 ${theme === 'dark' ? 'active bg-primary text-white' : 'btn-dark'}`} onClick={() => onThemeChange('dark')}><i className="bi bi-moon-stars-fill me-1"></i>Dark</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="panel">
                <div className="panel-head"><i className="bi bi-printer-fill clr-cyan"></i><span>Auto Print Struk</span></div>
                <div className="panel-body">
                  <div className="toggle-row d-flex justify-content-between align-items-center mb-2">
                    <div>Print saat <b>mulai sewa</b></div>
                    <div className="form-check form-switch mb-0">
                      <input 
                        className="form-check-input ctoggle" 
                        type="checkbox" 
                        checked={printMulai}
                        onChange={(e) => onChangePrintMulai(e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="toggle-row d-flex justify-content-between align-items-center">
                    <div>Print saat <b>selesai bayar</b></div>
                    <div className="form-check form-switch mb-0">
                      <input 
                        className="form-check-input ctoggle" 
                        type="checkbox" 
                        checked={printSelesai}
                        onChange={(e) => onChangePrintSelesai(e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="panel">
                <div className="panel-head"><i className="bi bi-shield-lock-fill clr-red"></i><span>Password Admin</span></div>
                <div className="panel-body">
                  <p className="text-secondary small mb-2">Current: <code>{'*'.repeat(adminPassword?.length || 0)}</code></p>
                  <div className="d-flex flex-column gap-2">
                    <input 
                      type="password" 
                      value={oldPassInput}
                      onChange={(e) => setOldPassInput(e.target.value)}
                      className="cfield flex-fill" 
                      placeholder="Password lama..." 
                      style={{ paddingLeft: '12px' }}
                    />
                    <div className="input-group">
                      <input 
                        type="password" 
                        value={newPassInput}
                        onChange={(e) => setNewPassInput(e.target.value)}
                        className="cfield flex-fill" 
                        placeholder="Password baru..." 
                        style={{ paddingLeft: '12px' }}
                      />
                      <button className="btn-sec ms-2 py-2 px-3 border rounded text-white" style={{ background: 'var(--bg-sec)' }} onClick={handleChangePass}>Ubah</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 mt-3 border-top pt-3 text-secondary d-flex justify-content-between small">
          <span><i className="bi bi-code-slash me-1"></i>v{APP_VERSION}</span>
          <span><i className="bi bi-clock-history me-1"></i>Last deploy: {DEPLOY_DATE}</span>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
