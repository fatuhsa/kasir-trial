/* ═══════════════════════════════════
   SUPABASE CONFIG
═══════════════════════════════════ */
const SB_URL = "https://bacpwnbsvtwotkfnkhnb.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhY3B3bmJzdnR3b3RrZm5raG5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1Mjc2NzcsImV4cCI6MjA5MTEwMzY3N30.TA79dCK8U7oRyuw_XIr3WoW3Ll_j3qBs78erL6KuhI4";
const sb = window.supabase.createClient(SB_URL, SB_KEY);

/* ═══════════════════════════════════
   APP INFO
═══════════════════════════════════ */
const APP_VERSION = '1.2.0';
const DEPLOY_DATE = '14 Jul 2026';

/* ═══════════════════════════════════
   ITEMS
═══════════════════════════════════ */
const ITEMS = [
  { code:'ST',  name:'Stroller',          emoji:'🛺', defaultImg:'https://i.ibb.co.com/fzwMy2XL/The-Edit-The-stroller-changing-the-game-banner-desktop.webp', priceHour:20000, priceOT30:10000, priceOT60:20000 },
  { code:'ST3', name:'Stroller Paket 3J', emoji:'🛺', defaultImg:'https://i.ibb.co.com/fzwMy2XL/The-Edit-The-stroller-changing-the-game-banner-desktop.webp', priceHour:50000, priceOT30:10000, priceOT60:20000, isPackage:true, packageHours:3 },
  { code:'SD',  name:'Scooter Dewasa',    emoji:'🛵', defaultImg:'https://i.ibb.co.com/rG55b6ts/wp8922917.jpg',                                                           priceHour:50000, priceOT30:25000, priceOT60:50000 },
  { code:'SJ',  name:'Scooter Jumbo',     emoji:'🦽', defaultImg:'https://i.ibb.co.com/hxVgMw63/Pngtree-3d-render-of-a-black-5598024.jpg',                               priceHour:60000, priceOT30:30000, priceOT60:60000 },
  { code:'SA',  name:'Scooter Anak',      emoji:'🛴', defaultImg:'https://i.ibb.co.com/qMZ9szQQ/adad.png',                                                               priceHour:35000, priceOT30:20000, priceOT60:35000 },
];

/* ═══════════════════════════════════
   STATE
═══════════════════════════════════ */
let activeSessions = [], transactions = [], selectedQty = {}, adminPassword = 'admin';
let shiftQueueNo = 0;
let pendingAction = null, exportMode = 'harian', currentBayarData = null;
let bsHitung, bsBayar, bsExport, bsEdit, bsPassword, bsEditSesi, bsQR;
let sbConnected = false, sbSubscription = null, sbLastSync = null;
const _pendingInsertSess = new Set(), _pendingInsertTxn = new Set();

const SHIFT_USERS = ['akbar','rani','monica','aldy','wahyu','donny','zumi','awang'];
const SHIFT_PASS  = 'jayalahevren';
const SHIFT_CODE_MAP = { 'Akbar':'AK','Rani':'RN','Monica':'MO','Aldy':'AL','Wahyu':'WH','Donny':'DN','Zumi':'ZM','Awang':'AW' };
let currentShiftUser = null;

/* ═══════════════════════════════════
   HASH ROUTING — #track/ID
═══════════════════════════════════ */
function checkHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#track/')) {
    const sid = hash.replace('#track/', '').trim();
    showTrackingPage(sid);
    return true;
  }
  return false;
}

window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#track/')) {
    const sid = window.location.hash.replace('#track/', '').trim();
    showTrackingPage(sid);
  } else {
    document.getElementById('trackingPage').style.display = 'none';
  }
});

/* ═══════════════════════════════════
   TRACKING PAGE (public - from QR scan)
═══════════════════════════════════ */
let trackTimerInterval = null;

function showTrackingPage(sid) {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('trackingPage').style.display = 'block';
  loadStorage();
  renderTrackingPageFromSupabase(sid);
}

async function renderTrackingPageFromSupabase(sid) {
  document.getElementById('trackBody').innerHTML = `
    <div style="text-align:center;padding:48px 20px;color:var(--text2)">
      <div style="font-size:2.5rem;margin-bottom:12px">⏳</div>
      <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:6px">Memuat data sewa...</div>
      <div style="font-size:.82rem">Menghubungkan ke server</div>
    </div>`;
  document.getElementById('trackStatusBadge').innerHTML = '';

  try {
    const { data: sessRows } = await sb.from('active_sessions').select('*').eq('id', sid);
    if (sessRows && sessRows.length > 0) {
      const session = sbRowToSession(sessRows[0]);
      if (trackTimerInterval) clearInterval(trackTimerInterval);
      renderTrackingActive(session);
      trackTimerInterval = setInterval(async () => {
        renderTrackingActiveLocal(session);
      }, 1000);
      setupTrackingRealtime(sid);
      return;
    }
    const { data: txnRows } = await sb.from('transactions').select('*').eq('id', sid);
    if (txnRows && txnRows.length > 0) {
      if (trackTimerInterval) { clearInterval(trackTimerInterval); trackTimerInterval = null; }
      renderTrackingDone(sbRowToTxn(txnRows[0]));
      return;
    }
  } catch(e) {
    console.warn('Supabase fetch failed, falling back to local', e);
  }

  const session = activeSessions.find(s => s.id === sid);
  const doneTxn = transactions.find(t => t.id === sid);
  if (trackTimerInterval) clearInterval(trackTimerInterval);
  if (session) {
    renderTrackingActive(session);
    trackTimerInterval = setInterval(() => renderTrackingActiveLocal(session), 1000);
  } else if (doneTxn) {
    renderTrackingDone(doneTxn);
  } else {
    document.getElementById('trackBody').innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:var(--text2)">
        <i class="bi bi-question-circle" style="font-size:2.5rem;display:block;margin-bottom:12px"></i>
        <div style="font-weight:700;font-size:1rem;color:var(--text);margin-bottom:6px">Sesi tidak ditemukan</div>
        <div style="font-size:.85rem">QR ini mungkin sudah tidak valid.</div>
      </div>`;
    document.getElementById('trackStatusBadge').innerHTML = `<span class="track-status-badge" style="background:rgba(248,81,73,.2);color:var(--red);border:1px solid rgba(248,81,73,.4)"><i class="bi bi-x-circle me-1"></i>Tidak Ditemukan</span>`;
  }
}

let _trackRealtimeCh = null;
let _trackCurrentSession = null;

function setupTrackingRealtime(sid) {
  if (_trackRealtimeCh) { try { sb.removeChannel(_trackRealtimeCh); } catch(e){} }
  _trackRealtimeCh = sb.channel('track-'+sid)
    .on('postgres_changes', { event:'DELETE', schema:'public', table:'active_sessions', filter:`id=eq.${sid}` }, async () => {
      if (trackTimerInterval) { clearInterval(trackTimerInterval); trackTimerInterval = null; }
      try {
        const { data } = await sb.from('transactions').select('*').eq('id', sid);
        if (data && data.length > 0) renderTrackingDone(sbRowToTxn(data[0]));
        else renderTrackingDone({ id:sid, nama:'—', startTime:Date.now(), endTime:Date.now(), items:'—', totalBase:0, totalOT:0, grandTotal:0, totalAll:0 });
      } catch(e) { console.warn(e); }
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'active_sessions', filter:`id=eq.${sid}` }, payload => {
      _trackCurrentSession = sbRowToSession(payload.new);
      renderTrackingActiveLocal(_trackCurrentSession);
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'transactions', filter:`id=eq.${sid}` }, payload => {
      if (trackTimerInterval) { clearInterval(trackTimerInterval); trackTimerInterval = null; }
      renderTrackingDone(sbRowToTxn(payload.new));
    })
    .subscribe();
}

function renderTrackingActive(session) {
  _trackCurrentSession = session;
  renderTrackingActiveLocal(session);
}

function calculateElapsed(s) {
  if (!s.startTime) return 0;
  const now = Date.now();
  return Math.floor((now - s.startTime) / 1000);
}

function renderTrackingActiveLocal(session) {
  const s = _trackCurrentSession || session;
  const sec = calculateElapsed(s);
  const elapsedMin = sec / 60;
  const hasPkg = s.items && s.items.some(it => { const d = getItem(it.code); return d && d.isPackage; });
  const limitMin = hasPkg ? (getItem(s.items.find(it=>getItem(it.code).isPackage).code).packageHours * 60) : 60;
  const overMin = elapsedMin - limitMin;
  const isOT = Math.floor(overMin) >= 11;

  document.getElementById('trackStatusBadge').innerHTML = isOT
    ? `<span class="track-status-badge" style="background:rgba(249,115,22,.2);color:var(--orange);border:1px solid rgba(249,115,22,.4);animation:blink .8s infinite"><i class="bi bi-exclamation-triangle-fill me-1"></i>OVERTIME</span>`
    : `<span class="track-status-badge track-status-active"><i class="bi bi-circle-fill me-1" style="font-size:.5rem"></i>Sedang Berjalan</span>`;

  const itemRows = (s.items||[]).map(it => {
    const def = getItem(it.code);
    if (!def) return '';
    const priceLabel = def.isPackage ? `Paket ${def.packageHours}j — ${fmtRp(def.priceHour * it.qty)}` : `${fmtRp(def.priceHour)}/jam × ${it.qty} = ${fmtRp(def.priceHour * it.qty)}`;
    const img = getImg(def.code) || def.defaultImg;
    return `<div class="track-item-row">
      <div style="display:flex;align-items:center;gap:10px">
        <img src="${img}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0" onerror="this.style.display='none'">
        <div>
          <div class="track-item-name">${def.emoji} ${def.name} <span style="font-family:'Montserrat',sans-serif;font-size:.65rem;color:var(--yellow)">${def.code}</span></div>
          <div class="track-item-price">${priceLabel}</div>
        </div>
      </div>
      <div style="font-weight:800;color:var(--text);font-size:1rem">${it.qty}×</div>
    </div>`;
  }).join('');

  const totalBase = (s.items||[]).reduce((sum, it) => { const d = getItem(it.code); return sum + (d ? d.priceHour * it.qty : 0); }, 0);

  let otHtml = '';
  if (isOT) {
    const fullCycles = Math.floor(Math.max(0, overMin - 10) / 60);
    const remainder = Math.max(0, overMin - 10) % 60;
    let fullCount = fullCycles, halfCount = 0;
    if (remainder > 10 && remainder <= 40) halfCount = 1;
    else if (remainder > 40) fullCount += 1;
    const otRows = (s.items||[]).map(it => {
      const def = getItem(it.code);
      if (!def) return '';
      const otCost = (fullCount * def.priceOT60 + halfCount * def.priceOT30) * it.qty;
      if (otCost <= 0) return '';
      return `<div class="track-item-row">
        <div>
          <div class="track-item-name">${def.name} — OT <span class="track-ot-badge">Estimasi</span></div>
          <div class="track-item-price">${fullCount > 0 ? fullCount+'× 1jam ' : ''}${halfCount > 0 ? halfCount+'× ½jam' : ''}</div>
        </div>
        <div style="font-weight:800;color:var(--orange)">~${fmtRp(otCost)}</div>
      </div>`;
    }).join('');
    otHtml = `<div class="track-ot-card">
      <div class="track-ot-title"><i class="bi bi-lightning-charge-fill me-1"></i>Estimasi Biaya Overtime</div>
      ${otRows || '<div style="font-size:.82rem;color:var(--text2)">Menghitung...</div>'}
      <div style="font-size:.72rem;color:var(--text2);margin-top:6px"><i class="bi bi-info-circle me-1"></i>Biaya OT dihitung final oleh kasir</div>
    </div>`;
  }

  const payAwal = s.payAwal || 'cash';
  const minsLeft = isOT ? 0 : Math.ceil(limitMin - elapsedMin);
  const timerColor = isOT ? 'var(--orange)' : overMin > -5 ? 'var(--yellow)' : 'var(--cyan)';
  const timerBorder = isOT ? 'rgba(249,115,22,.5)' : 'rgba(88,166,255,.35)';

  document.getElementById('trackBody').innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:.72rem;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">Nama Penyewa</div>
      <div style="font-weight:800;font-size:1.3rem;color:var(--text);margin-top:2px">${s.nama}</div>
      <div style="font-size:.75rem;color:var(--text2);margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <span><i class="bi bi-clock me-1"></i>Mulai: <b>${timeStr(s.startTime)}</b></span>
        <span>${payAwal === 'qris' ? '<i class="bi bi-qr-code-scan me-1"></i>Pokok: QRIS' : '<i class="bi bi-cash-stack me-1"></i>Pokok: Cash'}</span>
        <span style="font-size:.65rem;background:rgba(63,185,80,.15);color:var(--green);border:1px solid rgba(63,185,80,.3);border-radius:5px;padding:1px 7px;font-weight:800">Batas ${limitMin} mnt</span>
      </div>
    </div>

    <div class="track-timer-card" style="border-color:${timerBorder}">
      <div class="track-timer-label">${isOT ? '⚠ OVERTIME BERJALAN' : '⏱ DURASI SEWA'}</div>
      <div class="track-timer-val" style="color:${timerColor}" id="liveTrackTimer">${fmtDur(sec)}</div>
      <div class="track-timer-sub">
        ${isOT
            ? `⚠ Over <b>${Math.floor(overMin)} menit</b> dari batas ${limitMin} menit`
            : `Batas waktu ${limitMin} menit · sisa ±${minsLeft} menit`}
      </div>
    </div>

    <div class="panel" style="margin-bottom:12px">
      <div class="panel-head" style="font-size:.85rem"><i class="bi bi-bag-fill clr-yellow me-1"></i>Item yang Disewa</div>
      <div style="padding:0 16px">${itemRows}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg3);font-size:.9rem;font-weight:800">
        <span style="color:var(--text2)">Tarif Pokok (dibayar di awal)</span>
        <span style="color:var(--green)">${fmtRp(totalBase)}</span>
      </div>
    </div>

    ${otHtml}

    <div style="text-align:center;margin-top:20px;padding:14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:.78rem;color:var(--text2)">
      <i class="bi bi-arrow-repeat me-1" style="color:var(--cyan)"></i>
      Halaman ini memperbarui otomatis secara real-time.<br>
      <span style="color:var(--cyan);font-weight:700">Hubungi kasir</span> untuk menyelesaikan sewa.
    </div>`;

  if (trackTimerInterval) clearInterval(trackTimerInterval);
  trackTimerInterval = setInterval(() => {
    const el = document.getElementById('liveTrackTimer');
    if (!el) { clearInterval(trackTimerInterval); return; }
    const currentS = _trackCurrentSession || s;
    el.textContent = fmtDur(calculateElapsed(currentS));
  }, 1000);
}

function renderTrackingDone(txn) {
  if (trackTimerInterval) { clearInterval(trackTimerInterval); trackTimerInterval = null; }
  if (_trackRealtimeCh) { try { sb.removeChannel(_trackRealtimeCh); } catch(e){} _trackRealtimeCh = null; }

  const durSec = Math.floor(((txn.endTime||Date.now()) - (txn.startTime||0)) / 1000);
  const payAwal = txn.payAwal || 'cash';
  const totalAll = txn.totalAll != null ? txn.totalAll : ((txn.totalBase || 0) + (txn.grandTotal || 0));

  document.getElementById('trackStatusBadge').innerHTML = `<span class="track-status-badge track-status-done"><i class="bi bi-check-circle-fill me-1"></i>Selesai ✓</span>`;

  document.getElementById('trackBody').innerHTML = `
    <div style="text-align:center;padding:16px 0 8px">
      <div style="font-size:3rem">🎉</div>
      <div style="font-weight:800;font-size:1.1rem;color:var(--green);margin-top:6px">Sewa Selesai!</div>
      <div style="font-size:.8rem;color:var(--text2);margin-top:4px">Berikut struk digital Anda</div>
    </div>
    <div class="receipt-card">
      <div class="receipt-header">
        <div class="receipt-brand">EVREN HOUSE</div>
        <div class="receipt-title">Struk Sewa Digital — Lunas</div>
        <div style="font-size:.7rem;color:var(--text2);margin-top:8px">No. Transaksi #${txn.no || '-'}</div>
      </div>
      <div class="receipt-body">
        <div class="receipt-row"><span class="receipt-row-label">Nama Penyewa</span><span class="receipt-row-val" style="color:var(--text)">${txn.nama}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Kasir (Shift)</span><span class="receipt-row-val">${txn.shift || '-'}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Tanggal</span><span class="receipt-row-val">${dateStr(txn.startTime||Date.now())}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Waktu Mulai</span><span class="receipt-row-val">${timeStr(txn.startTime||0)}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Waktu Selesai</span><span class="receipt-row-val" style="color:var(--yellow)">${timeStr(txn.endTime||Date.now())}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Total Durasi</span><span class="receipt-row-val" style="font-family:'Montserrat',sans-serif;color:var(--cyan);font-size:.85rem">${fmtDur(durSec)}</span></div>
        <div class="receipt-row"><span class="receipt-row-label">Item Sewa</span><span class="receipt-row-val" style="text-align:right;max-width:55%">${txn.items}</span></div>
        ${txn.ot && txn.ot !== '-' ? `<div class="receipt-row"><span class="receipt-row-label">Overtime</span><span class="receipt-row-val" style="color:var(--orange)">${txn.ot}</span></div>` : ''}
        ${txn.otDur && txn.otDur !== '-' ? `<div class="receipt-row"><span class="receipt-row-label">Durasi OT</span><span class="receipt-row-val" style="color:var(--orange)">${txn.otDur}</span></div>` : ''}
        <div style="height:8px"></div>
        <div class="receipt-row" style="background:rgba(63,185,80,.06);border-radius:6px;padding:8px 12px;margin:0 -4px">
          <span class="receipt-row-label" style="color:var(--text)">Tarif Sewa Pokok</span>
          <span class="receipt-row-val" style="color:var(--green)">
            ${fmtRp(txn.totalBase || 0)}
            <span style="font-size:.65rem;margin-left:4px;padding:1px 5px;border-radius:4px;background:rgba(63,185,80,.15);color:var(--green)">${payAwal.toUpperCase()}</span>
          </span>
        </div>
        ${(txn.totalOT || 0) > 0 ? `
        <div class="receipt-row" style="background:rgba(249,115,22,.06);border-radius:6px;padding:8px 12px;margin:4px -4px 0">
          <span class="receipt-row-label" style="color:var(--text)">Biaya Overtime</span>
          <span class="receipt-row-val" style="color:var(--orange)">${fmtRp(txn.totalOT)}</span>
        </div>` : ''}
        ${(txn.cash||0) > 0 ? `<div class="receipt-row"><span class="receipt-row-label"><i class="bi bi-cash-stack me-1"></i>Bayar Cash</span><span class="receipt-row-val" style="color:var(--green)">${fmtRp(txn.cash)}</span></div>` : ''}
        ${(txn.qris||0) > 0 ? `<div class="receipt-row"><span class="receipt-row-label"><i class="bi bi-qr-code-scan me-1"></i>Bayar QRIS</span><span class="receipt-row-val" style="color:var(--cyan)">${fmtRp(txn.qris)}</span></div>` : ''}
      </div>
      <div class="receipt-total-box">
        <span class="receipt-total-label"><i class="bi bi-receipt-cutoff me-2"></i>Total Keseluruhan</span>
        <span class="receipt-total-val">${fmtRp(totalAll)}</span>
      </div>
      <div class="receipt-thank">
        <i class="bi bi-heart-fill me-1" style="color:var(--red)"></i>
        Terima kasih telah berkunjung di <strong style="color:var(--cyan)">Evren House</strong>!<br>
        Sampai jumpa lagi 👋
      </div>
    </div>`;
}

function openQRModal(sid) {
  const session = activeSessions.find(s => s.id === sid);
  if (!session) return;
  const trackUrl = window.location.href.split('#')[0] + '#track/' + sid;
  const payAwal = session.payAwal || 'cash';
  const totalBase = (session.items||[]).reduce((s, it) => { const d = getItem(it.code); return s + (d ? d.priceHour * it.qty : 0); }, 0);
  const itemTagsHtml = (session.items||[]).map(it => { const d = getItem(it.code); return `<span class="itag">${d ? d.name : it.code} ×${it.qty}</span>`; }).join('');
  document.getElementById('modalQRContent').innerHTML = `
    <div class="qr-modal-wrap">
      <div class="qr-header-card">
        <div class="qr-header-name"><i class="bi bi-person-fill me-2"></i>${session.nama}</div>
        <div class="qr-header-meta">
          <span class="itag" style="background:rgba(63,185,80,.1);color:var(--green);border-color:rgba(63,185,80,.3)"><i class="bi bi-clock me-1"></i>Mulai ${timeStr(session.startTime)}</span>
          <span class="aktif-pay-badge ${payAwal}">${payAwal === 'qris' ? '<i class="bi bi-qr-code-scan"></i> QRIS' : '<i class="bi bi-cash-stack"></i> Cash'}</span>
          <span class="itag" style="color:var(--yellow)">${fmtRp(totalBase)}</span>
        </div>
        <div class="qr-items-preview">${itemTagsHtml}</div>
      </div>
      <div class="qr-canvas-wrap">
        <div style="font-size:.78rem;color:var(--text2);margin-bottom:8px;font-weight:700;text-align:center"><i class="bi bi-qr-code me-1" style="color:var(--cyan)"></i>Berikan QR ini ke penyewa untuk tracking real-time</div>
        <div class="qr-canvas-bg" id="qrCanvasBox"><div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#666;font-size:.75rem">Generating QR...</div></div>
        <div class="qr-scan-hint">📱 Penyewa scan QR → halaman timer real-time terbuka<br>⏱ Timer update otomatis setiap detik<br>✅ Saat selesai → halaman berubah jadi <b style="color:var(--yellow)">struk digital</b></div>
      </div>
      <div style="background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.3);border-radius:8px;padding:8px 12px;font-size:.72rem;color:var(--green);font-weight:700;margin-bottom:12px;display:flex;align-items:center;gap:6px"><i class="bi bi-cloud-check-fill"></i>Data tracking tersimpan di Supabase — bisa diakses dari HP manapun</div>
      <div class="qr-url-box" onclick="copyTrackUrl('${trackUrl}')" title="Klik untuk salin"><i class="bi bi-link-45deg me-1"></i>${trackUrl}</div>
      <div class="d-flex gap-2 mt-3">
        <button class="btn-sec flex-fill" onclick="copyTrackUrl('${trackUrl}')"><i class="bi bi-clipboard me-1"></i>Salin Link</button>
        <button class="btn-start flex-fill" onclick="window.open('${trackUrl}','_blank')"><i class="bi bi-box-arrow-up-right me-1"></i>Preview</button>
      </div>
      <button class="btn-sec w-100 mt-2" onclick="closeModal(\'modalQR\')">Tutup</button>
    </div>`;
  if (!bsQR) bsQR = new bootstrap.Modal(document.getElementById('modalQR'));
  bsQR.show();
  setTimeout(() => {
    const box = document.getElementById('qrCanvasBox');
    if (box && typeof QRCode !== 'undefined') {
      box.innerHTML = '';
      new QRCode(box, { text: trackUrl, width: 210, height: 210, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
  }, 250);
}

function copyTrackUrl(url) {
  navigator.clipboard.writeText(url).then(() => fbToast('Link disalin ke clipboard!', 'success')).catch(() => {
    const el = document.createElement('textarea'); el.value = url; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); fbToast('Link disalin!', 'success');
  });
}

/* ═══════════════════════════════════
   SUPABASE HELPERS
═══════════════════════════════════ */
function sessionToSbRow(s) { return { id:s.id, nama:s.nama, items:s.items, start_time:s.startTime, pay_awal:s.payAwal||'cash' }; }
function sbRowToSession(row) { return { id:row.id, nama:row.nama, items:row.items||[], startTime:row.start_time||Date.now(), payAwal:row.pay_awal||'cash' }; }
function txnToSbRow(t) { return { id:t.id, no:t.no||0, nama:t.nama, tanggal:t.tanggal, start_time:t.startTime, end_time:t.endTime, items:t.items, ot:t.ot||'-', ot_dur:t.ot_dur||'-', total_base:t.totalBase||0, total_ot:t.totalOT||0, total_tol:t.totalTol||0, grand_total:t.grandTotal||0, total_all:t.totalAll||((t.totalBase||0)+(t.grandTotal||0)), pay_awal:t.payAwal||'cash', cash:t.cash||0, qris:t.qris||0, shift:t.shift||'-' }; }
function sbRowToTxn(row) { return { id:row.id, no:row.no||0, nama:row.nama, tanggal:row.tanggal, startTime:row.start_time||0, endTime:row.end_time||0, items:row.items, ot:row.ot||'-', otDur:row.ot_dur||'-', totalBase:row.total_base||0, totalOT:row.total_ot||0, totalTol:row.total_tol||0, grandTotal:row.grand_total||0, totalAll:row.total_all||((row.total_base||0)+(row.grand_total||0)), payAwal:row.pay_awal||'cash', cash:row.cash||0, qris:row.qris||0, shift:row.shift||'-' }; }

async function sbInsertSession(s) { if (!sbConnected) return; try { _pendingInsertSess.add(s.id); await sb.from('active_sessions').upsert(sessionToSbRow(s)); } catch(e) { _pendingInsertSess.delete(s.id); } }
async function sbDeleteSession(id) { if (!sbConnected) return; try { await sb.from('active_sessions').delete().eq('id', id); } catch(e) {} }
async function sbUpdateSession(s) { if (!sbConnected) return; try { await sb.from('active_sessions').update(sessionToSbRow(s)).eq('id', s.id); } catch(e) {} }
async function sbInsertTxn(t) { if (!sbConnected) return; try { _pendingInsertTxn.add(t.id); await sb.from('transactions').insert(txnToSbRow(t)); } catch(e) { _pendingInsertTxn.delete(t.id); } }
async function sbUpdateTxn(t) { if (!sbConnected) return; try { await sb.from('transactions').update(txnToSbRow(t)).eq('id', t.id); } catch(e) {} }
async function sbDeleteTxn(id) { if (!sbConnected) return; try { await sb.from('transactions').delete().eq('id', id); } catch(e) {} }
async function sbSaveSetting(k, v) { if (!sbConnected) return; try { await sb.from('settings').upsert({ key:k, value:v }); } catch(e) {} }
async function sbSaveImage(c, d) { if (!sbConnected) return; try { await sb.from('item_images').upsert({ code:c, image_data:d }); } catch(e) {} }
async function sbDeleteImage(c) { if (!sbConnected) return; try { await sb.from('item_images').delete().eq('code', c); } catch(e) {} }

async function autoConnectSupabase() {
  showSbState('connecting');
  try {
    // Test connection with a simple select
    const { error } = await sb.from('settings').select('*').limit(1).abortSignal(AbortSignal.timeout(5000));
    if (error) throw error;
    
    sbConnected = true;
    showSbState('connected');
    await syncAllFromSupabase();
    setupSupabaseRealtime();
  } catch(err) {
    console.error('Supabase Connection Error:', err);
    sbConnected = false;
    showSbState('failed', err.message || 'Gagal terhubung ke database');
    fbToast('Koneksi database gagal: ' + (err.message || 'Network error'), 'error', 6000);
  }
}

function showSbState(state, errMsg) {
  const c = document.getElementById('fbConnectingCard'), cn = document.getElementById('fbConnectedInfo'), f = document.getElementById('fbFailedCard');
  if (!c) return;
  c.classList.add('d-none'); cn.classList.add('d-none'); f.classList.add('d-none');
  updateSbStatus(state === 'failed' ? 'disconnected' : state);
  if (state === 'connecting') c.classList.remove('d-none');
  else if (state === 'connected') cn.classList.remove('d-none');
  else { if (errMsg) { const el = document.getElementById('fbFailedMsg'); if(el) el.textContent = errMsg; } f.classList.remove('d-none'); }
}

function updateSbStatus(state) {
  const badge = document.getElementById('fbStatusBadge'); if (!badge) return;
  const map = { connected:`<span class="fb-badge fb-badge-connected"><span class="fb-status-dot fb-dot-connected"></span>Terhubung</span>`, disconnected:`<span class="fb-badge fb-badge-disconnected"><span class="fb-status-dot fb-dot-disconnected"></span>Tidak Terhubung</span>`, connecting:`<span class="fb-badge fb-badge-connecting"><span class="fb-status-dot fb-dot-connecting"></span>Menghubungkan…</span>` };
  badge.innerHTML = map[state] || map.disconnected;
}

async function syncAllFromSupabase() {
  if (!sbConnected) return;
  try {
    fbToast('Menarik data dari cloud...', 'info', 8000);
    
    // Fetch Transactions
    const { data: txns, error: errT } = await sb.from('transactions').select('*').order('no', { ascending: true }).limit(5000);
    if (errT) throw new Error('Gagal ambil transaksi: ' + errT.message);
    if (txns) {
      const ct = txns.map(d => sbRowToTxn(d));
      const ci = new Set(ct.map(t => t.id));
      // Hanya simpan data lokal yang memang tidak ada di server
      const lo = transactions.filter(t => !ci.has(t.id));
      transactions = [...ct, ...lo];
      transactions.sort((a,b) => (a.no||0)-(b.no||0));
    }

    // Fetch Active Sessions
    const { data: sess, error: errS } = await sb.from('active_sessions').select('*');
    if (errS) throw new Error('Gagal ambil sesi aktif: ' + errS.message);
    if (sess) {
      const cs = sess.map(d => sbRowToSession(d));
      const ci = new Set(cs.map(s => s.id));
      const lo = activeSessions.filter(s => !ci.has(s.id));
      activeSessions = [...cs, ...lo];
    }

    // Fetch Settings
    const { data: sett, error: errSet } = await sb.from('settings').select('*');
    if (errSet) throw new Error('Gagal ambil pengaturan: ' + errSet.message);
    if (sett) {
      sett.forEach(s => {
        if (s.key==='adminPassword') adminPassword=s.value;
        if (s.key==='theme') { localStorage.setItem('kw_theme',s.value); setTheme(s.value); }
        if (s.key==='printMulai') localStorage.setItem('kw_printMulai',s.value);
        if (s.key==='printSelesai') localStorage.setItem('kw_printSelesai',s.value);
      });
      loadPrintSettings();
    }

    // Fetch Images
    const { data: imgs, error: errI } = await sb.from('item_images').select('*');
    if (errI) throw new Error('Gagal ambil gambar: ' + errI.message);
    if (imgs) {
      imgs.forEach(doc => {
        if (doc.code && doc.image_data) localStorage.setItem('kw_img_'+doc.code, doc.image_data);
      });
      renderItems();
      renderSettingItems();
    }

    saveStorage(); renderAktif(); renderRiwayat(); updateBadge();
    sbLastSync = new Date();
    const el = document.getElementById('fbLastSyncText');
    if (el) el.textContent = sbLastSync.toLocaleTimeString('id-ID');
    
    fbToast('Data berhasil ditarik!', 'success');
    updateSbCollectionStatus();
  } catch(err) {
    console.error('Sync Error:', err);
    fbToast(err.message || 'Gagal sinkronisasi data', 'error', 5000);
  }
}

async function pushAllToSupabase() {
  if (!sbConnected) return;
  try {
    fbToast('Mendorong data ke cloud…', 'info', 8000);
    if (transactions.length > 0) await sb.from('transactions').upsert(transactions.map(t => txnToSbRow(t)));
    if (activeSessions.length > 0) await sb.from('active_sessions').upsert(activeSessions.map(s => sessionToSbRow(s)));
    await sb.from('settings').upsert([ { key:'adminPassword', value:adminPassword }, { key:'theme', value:localStorage.getItem('kw_theme')||'dark' }, { key:'printMulai', value:localStorage.getItem('kw_printMulai')||'false' }, { key:'printSelesai', value:localStorage.getItem('kw_printSelesai')||'false' } ]);
    const imgData = []; ITEMS.forEach(item => { const d = getImg(item.code); if (d) imgData.push({ code:item.code, image_data:d }); });
    if (imgData.length > 0) await sb.from('item_images').upsert(imgData);
    sbLastSync = new Date();
    const el = document.getElementById('fbLastSyncText'); if (el) el.textContent = sbLastSync.toLocaleTimeString('id-ID');
    fbToast('Data berhasil didorong!', 'success');
    updateSbCollectionStatus();
  } catch(err) { fbToast('Gagal dorong: ' + (err.message||err), 'error', 5000); }
}

function setupSupabaseRealtime() {
  if (!sbConnected) return;
  if (sbSubscription) { try { sb.removeChannel(sbSubscription); } catch(e){} }
  sbSubscription = sb.channel('app-realtime')
    .on('postgres_changes', { event:'*', schema:'public', table:'active_sessions' }, payload => {
      if (payload.eventType === 'INSERT') { if (_pendingInsertSess.has(payload.new.id)) { _pendingInsertSess.delete(payload.new.id); return; } const s = sbRowToSession(payload.new); if (!activeSessions.find(x=>x.id===s.id)) { activeSessions.push(s); fbToast(`Sesi baru: ${s.nama}`, 'info'); } }
      else if (payload.eventType === 'UPDATE') { const s = sbRowToSession(payload.new); const idx = activeSessions.findIndex(x=>x.id===s.id); if (idx>=0) activeSessions[idx]=s; else activeSessions.push(s); }
      else if (payload.eventType === 'DELETE') { activeSessions = activeSessions.filter(x=>x.id!==payload.old.id); }
      saveStorage(); renderAktif(); updateBadge();
    })
    .on('postgres_changes', { event:'*', schema:'public', table:'transactions' }, payload => {
      if (payload.eventType === 'INSERT') { if (_pendingInsertTxn.has(payload.new.id)) { _pendingInsertTxn.delete(payload.new.id); return; } const t = sbRowToTxn(payload.new); if (!transactions.find(x=>x.id===t.id)) { transactions.push(t); transactions.sort((a,b)=>(a.no||0)-(b.no||0)); } }
      else if (payload.eventType === 'UPDATE') { const t = sbRowToTxn(payload.new); const idx = transactions.findIndex(x=>x.id===t.id); if (idx>=0) transactions[idx]=t; else { transactions.push(t); transactions.sort((a,b)=>(a.no||0)-(b.no||0)); } }
      else if (payload.eventType === 'DELETE') { transactions = transactions.filter(x=>x.id!==payload.old.id); }
      saveStorage(); renderRiwayat();
    })
    .subscribe();
}

async function updateSbCollectionStatus() {
  if (!sbConnected) return;
  const cols = [ { col:'transactions',label:'Transaksi',color:'var(--green)' }, { col:'active_sessions',label:'Sesi Aktif',color:'var(--cyan)' }, { col:'settings',label:'Pengaturan',color:'var(--yellow)' }, { col:'item_images',label:'Gambar',color:'var(--orange)' } ];
  const chips = await Promise.all(cols.map(async c => { try { const { count } = await sb.from(c.col).select('*', { count:'exact', head:true }); return `<div class="col-6 col-sm-3"><div class="sum-card" style="padding:10px 14px"><div class="sum-label">${c.label}</div><div class="sum-val" style="font-size:1rem;color:${c.color}">${count||0} dokumen</div></div></div>`; } catch { return ''; } }));
  const el = document.getElementById('fbCollectionStatus'); if (el) el.innerHTML = chips.join('');
}

/* ═══════════════════════════════════
   LOGIN
═══════════════════════════════════ */
function shiftCode(n) { if (!n || n === '-') return '-'; if (SHIFT_CODE_MAP[n]) return SHIFT_CODE_MAP[n]; const k = Object.keys(SHIFT_CODE_MAP).find(x => x.toLowerCase() === n.toLowerCase()); return k ? SHIFT_CODE_MAP[k] : n.slice(0,2).toUpperCase(); }
function doLogin() {
  const user = document.getElementById('loginUsername').value.trim().toLowerCase();
  const pass = document.getElementById('loginPassword').value;
  const err  = document.getElementById('loginErr');
  if (!user) { err.textContent = '⚠️ Pilih nama kasir!'; return; }
  if (!SHIFT_USERS.includes(user)) { err.textContent = '❌ Kasir tidak ditemukan!'; return; }
  if (pass !== SHIFT_PASS) { err.textContent = '❌ Password salah!'; return; }
  err.textContent = '';
  const sel = document.getElementById('loginUsername');
  currentShiftUser = sel.options[sel.selectedIndex].text;
  localStorage.setItem('kw_currentUser', currentShiftUser);
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').style.display = '';
  document.getElementById('shiftUserLabel').textContent = currentShiftUser;
  document.getElementById('shiftIndicator').classList.remove('d-none');
  loadStorage(); init();
  fbToast('Selamat datang, ' + currentShiftUser + '!', 'success', 4000);
}
function confirmLogout() { if (confirm('Akhiri shift sebagai ' + currentShiftUser + '?')) { localStorage.removeItem('kw_currentUser'); localStorage.removeItem('kw_shiftQNo'); shiftQueueNo = 0; document.getElementById('mainApp').style.display = 'none'; document.getElementById('loginPage').style.display = 'flex'; document.getElementById('loginPassword').value = ''; document.getElementById('loginUsername').value = ''; currentShiftUser = null; if (sbSubscription) { try { sb.removeChannel(sbSubscription); } catch(e){} sbSubscription = null; } } }
function checkSavedSession() {
  const savedUser = localStorage.getItem('kw_currentUser');
  if (savedUser && !window.location.hash.startsWith('#track/')) {
    currentShiftUser = savedUser;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').style.display = '';
    document.getElementById('shiftUserLabel').textContent = currentShiftUser;
    document.getElementById('shiftIndicator').classList.remove('d-none');
    loadStorage(); init();
    fbToast('Melanjutkan shift: ' + currentShiftUser, 'success', 2000);
    return true;
  }
  return false;
}

/* ═══════════════════════════════════
   INIT
═══════════════════════════════════ */
function init() { loadTheme(); initBootstrapModals(); renderItems(); renderSettingItems(); loadPrintSettings(); renderAktif(); setDefaultDate(); renderRiwayat(); startClocks(); autoConnectSupabase(); renderVersionInfo(); }
function renderVersionInfo() { const v = document.getElementById('appVersionLabel'); const d = document.getElementById('deployDateLabel'); if (v) v.textContent = 'v' + APP_VERSION; if (d) d.textContent = DEPLOY_DATE; }
function loadStorage() {
  try { const s = localStorage.getItem('kw_sessions'); activeSessions = s ? JSON.parse(s) : []; if (!Array.isArray(activeSessions)) activeSessions = []; } catch(e) { activeSessions = []; }
  try { const t = localStorage.getItem('kw_txns'); transactions = t ? JSON.parse(t) : []; if (!Array.isArray(transactions)) transactions = []; } catch(e) { transactions = []; }
  try { adminPassword = localStorage.getItem('kw_pass') || 'admin'; } catch(e) {}
  try { shiftQueueNo = parseInt(localStorage.getItem('kw_shiftQNo') || '0'); } catch(e) { shiftQueueNo = 0; }
}
function saveStorage() { try { localStorage.setItem('kw_sessions', JSON.stringify(activeSessions)); localStorage.setItem('kw_txns', JSON.stringify(transactions)); } catch(e) {} }
function initBootstrapModals() { bsHitung = new bootstrap.Modal(document.getElementById('modalHitung'), {backdrop:'static'}); bsBayar = new bootstrap.Modal(document.getElementById('modalBayar'), {backdrop:'static'}); bsExport = new bootstrap.Modal(document.getElementById('modalExport'), {backdrop:'static'}); bsEdit = new bootstrap.Modal(document.getElementById('modalEdit'), {backdrop:'static'}); bsPassword = new bootstrap.Modal(document.getElementById('modalPassword'), {backdrop:'static'}); bsEditSesi = new bootstrap.Modal(document.getElementById('modalEditSesi'), {backdrop:'static'}); }
function startClocks() { const tick = () => { const now = new Date(); document.getElementById('liveClock').textContent = now.toTimeString().slice(0,8); const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']; const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; document.getElementById('liveDate').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`; updateTimers(); }; tick(); setInterval(tick, 1000); }
function updateTimers() {
  activeSessions.forEach(s => {
    const el = document.getElementById('tmr_' + s.id), dot = document.getElementById('dot_' + s.id);
    if (!el) return;
    const sec = calculateElapsed(s);
    el.textContent = fmtDur(sec);
    if (dot) { const item = s.items&&s.items[0] ? getItem(s.items[0].code) : null; const lim = (item&&item.isPackage) ? item.packageHours*60 : 60; const over = (sec/60)-lim; dot.className = 'dot '+(Math.floor(over)<11?'dot-ok':Math.floor(over)<=25?'dot-warn':'dot-hot'); }
  });
}

const fmtRp  = n => n ? 'Rp '+Math.round(n).toLocaleString('id-ID') : 'Rp 0';
const fmtDur = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60; return `${pad(h)}:${pad(m)}:${pad(ss)}`; };
const pad    = n => String(n).padStart(2,'0');
const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const genId  = () => Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const timeStr = ts => new Date(ts).toTimeString().slice(0,5);
const dateStr = ts => { const d=new Date(ts); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; };
const getItem = code => ITEMS.find(i => i.code === code);
const getImg  = code => localStorage.getItem('kw_img_'+code) || null;
const setImg  = (code, url) => localStorage.setItem('kw_img_'+code, url);
const resetImg = code => localStorage.removeItem('kw_img_'+code);

function switchTab(tab) { document.querySelectorAll('.fnav-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active')); const btn = document.getElementById('fnav-'+tab); if (btn) btn.classList.add('active'); document.getElementById('tab-'+tab).classList.add('active'); if (tab === 'riwayat') renderRiwayat(); if (tab === 'dashboard') renderAktif(); }
function setTheme(mode) { document.documentElement.setAttribute('data-theme', mode); localStorage.setItem('kw_theme', mode); const isLight = mode === 'light'; const desc = document.getElementById('themeDesc'); if (desc) desc.textContent = isLight ? 'Mode Terang aktif' : 'Mode Gelap aktif'; const btnL = document.getElementById('themeBtnLight'), btnD = document.getElementById('themeBtnDark'); if (btnL) btnL.classList.toggle('active', isLight); if (btnD) btnD.classList.toggle('active', !isLight); sbSaveSetting('theme', mode); }
function loadTheme() { const saved = localStorage.getItem('kw_theme') || 'dark'; setTheme(saved); }

let _toastTimer;
function fbToast(msg, type='info', dur=3000) { const el = document.getElementById('fbToast'); if (!el) return; const icon = type==='success'?'✅':type==='error'?'❌':'🔄'; el.innerHTML = `${icon} ${msg}`; el.className = `fb-toast show ${type}`; clearTimeout(_toastTimer); _toastTimer = setTimeout(() => el.classList.remove('show'), dur); }

function renderItems() {
  const grid = document.getElementById('itemsGrid'); if (!grid) return;
  grid.innerHTML = ITEMS.map(item => { const qty = selectedQty[item.code] || 0; const img = getImg(item.code) || item.defaultImg; const priceLabel = item.isPackage ? `Paket ${item.packageHours}jam ${fmtRp(item.priceHour)}` : `${fmtRp(item.priceHour)}/jam`; return `<div class="col"><div class="item-card ${qty>0?'selected':''}" id="card_${item.code}"><div class="item-img-box"><img src="${img}" alt="${item.name}" onerror="this.parentElement.innerHTML='<div style=font-size:2rem>${item.emoji}</div>'"></div><div class="item-code">${item.code}</div><div class="item-name">${item.name}</div><div class="item-price">${priceLabel}</div><div class="qty-control"><button class="qty-btn minus" onclick="chgQty('${item.code}',-1)">−</button><span class="qty-val" id="qty_${item.code}">${qty}</span><button class="qty-btn" onclick="chgQty('${item.code}',1)">+</button></div></div></div>`; }).join('');
}
function chgQty(code, delta) { selectedQty[code] = Math.max(0, (selectedQty[code]||0)+delta); document.getElementById('qty_'+code).textContent = selectedQty[code]; document.getElementById('card_'+code).classList.toggle('selected', selectedQty[code]>0); }

function mulaiSewa() {
  const nama = document.getElementById('inputNama').value.trim(); if (!nama) { alert('Masukkan nama penyewa!'); return; }
  const items = ITEMS.filter(i => (selectedQty[i.code]||0)>0).map(i => ({code:i.code, qty:selectedQty[i.code]})); if (!items.length) { alert('Pilih minimal satu item!'); return; }
  const payAwal = document.querySelector('input[name="payAwal"]:checked')?.value || 'cash';
  shiftQueueNo++; localStorage.setItem('kw_shiftQNo', shiftQueueNo);
  const session = { id:genId(), nama, items, startTime:Date.now(), payAwal, queueNo:shiftQueueNo };
  activeSessions.push(session); saveStorage(); updateBadge(); renderAktif(); sbInsertSession(session).then(() => fbToast(`${nama} tersimpan di cloud ✓`, 'success', 2000));
  
  const autoPrintMulai = localStorage.getItem('kw_printMulai') === 'true';
  if (autoPrintMulai) printMulai(session, true);
  
  selectedQty = {}; document.getElementById('inputNama').value = ''; const radCash = document.getElementById('payAwalCash'); if (radCash) radCash.checked = true; renderItems(); openQRModal(session.id);
}

function renderAktif() {
  const list = document.getElementById('listAktif'); if (!list) return;
  const q = (document.getElementById('searchAktif')?.value || '').toLowerCase();
  const sess = activeSessions.filter(s => s.nama.toLowerCase().includes(q)).slice().sort((a,b) => b.startTime-a.startTime);
  updateBadge();
  if (!sess.length) { list.innerHTML = `<div class="empty-box"><i class="bi bi-hourglass-split"></i><p>Belum ada penyewa aktif</p></div>`; return; }
  list.innerHTML = sess.map(s => {
    const sec = calculateElapsed(s);
    const hasPkg = s.items&&s.items.some(it => { const d=getItem(it.code); return d&&d.isPackage; });
    const limMin = hasPkg ? (getItem(s.items.find(it=>getItem(it.code).isPackage).code).packageHours * 60) : 60;
    const overMin = (sec/60)-limMin;
    const dotCls = overMin<=10?'dot-ok':overMin<=25?'dot-warn':'dot-hot';
    const tags = (s.items||[]).map(i => `<span class="itag">${i.code}×${i.qty}</span>`).join('');
    const payAwal = s.payAwal||'cash', payBadge = payAwal==='qris' ? `<span class="aktif-pay-badge qris"><i class="bi bi-qr-code-scan"></i>QRIS</span>` : `<span class="aktif-pay-badge cash"><i class="bi bi-cash-stack"></i>Cash</span>`;
    return `<div class="aktif-card" id="ac_${s.id}">
      <div class="d-flex align-items-center justify-content-between mb-1 gap-2" style="min-width:0">
        <div class="aktif-name" style="margin-bottom:0"><i class="bi bi-person-fill me-1 clr-cyan"></i>${s.nama}</div>
        ${payBadge}
      </div>
      <div class="item-tags">${tags}</div>
      <div class="aktif-meta">
        <span class="aktif-start-lbl"><i class="bi bi-clock me-1"></i>${timeStr(s.startTime)}</span>
        <span class="aktif-timer" id="tmr_${s.id}">${fmtDur(sec)}</span>
      </div>
      <div class="aktif-footer">
        <button class="btn-selesai" onclick="selesaiSewa('${s.id}')"><i class="bi bi-stop-circle-fill me-1"></i>Selesai &amp; Bayar</button>
        <button class="btn-qr-aktif" onclick="openQRModal('${s.id}')" title="QR Tracking"><i class="bi bi-qr-code"></i></button>
        <button class="btn-edit-aktif" onclick="editSesiAktif('${s.id}')" title="Edit"><i class="bi bi-pencil-fill"></i></button>
        <span class="dot ${dotCls}" id="dot_${s.id}"></span>
      </div>
    </div>`;
  }).join('');
}

function filterAktif() { renderAktif(); }
function updateBadge() { const n = activeSessions.length; const b = document.getElementById('badgeAktif'), c = document.getElementById('aktifCount'); if (b) { b.textContent = n; b.classList.toggle('d-none', n===0); } if (c) c.textContent = n; }

function editSesiAktif(sid) { pendingAction = { type:'editSesi', id:sid }; openPassModal(); }
function openEditSesiModal(sid) {
  const session = activeSessions.find(s => s.id===sid); if (!session) return;
  let editItems = session.items.map(i => ({...i}));
  const renderContent = () => {
    const payAwal = session.payAwal||'cash', itemsHtml = ITEMS.map(item => { const ex = editItems.find(i => i.code===item.code), qty = ex ? ex.qty : 0; return `<div class="edit-sesi-item-row"><div class="edit-sesi-item-name"><span style="font-family:'Montserrat',sans-serif;font-size:.7rem;color:var(--yellow)">${item.code}</span><span class="ms-2">${item.name}</span></div><div class="edit-sesi-qty-ctrl"><button class="edit-sesi-qty-btn" onclick="esChgQty('${item.code}',-1)">−</button><span class="edit-sesi-qty-val" id="esqty_${item.code}">${qty}</span><button class="edit-sesi-qty-btn" onclick="esChgQty('${item.code}',1)">+</button></div></div>`; }).join('');
    document.getElementById('modalEditSesiContent').innerHTML = `
      <div class="edit-sesi-wrap">
        <div class="info-box mb-3"><div class="lbl">Penyewa</div><div class="val name">${session.nama}</div></div>
        <div class="mb-3"><label class="edit-field-label">Nama Penyewa</label><input type="text" class="cfield" id="esSesiNama" value="${session.nama}" style="padding-left:12px"></div>
        <div class="mb-3"><div class="edit-sesi-section-title">Metode Bayar Pokok</div><div class="pay-awal-selector"><label class="pay-awal-opt"><input type="radio" name="esPayAwal" value="cash" ${payAwal==='cash'?'checked':''}><span><i class="bi bi-cash-stack me-1"></i>Cash</span></label><label class="pay-awal-opt"><input type="radio" name="esPayAwal" value="qris" ${payAwal==='qris'?'checked':''}><span><i class="bi bi-qr-code-scan me-1"></i>QRIS</span></label></div></div>
        <div class="edit-sesi-section-title">Item &amp; Jumlah</div>
        ${itemsHtml}
        <div class="d-flex gap-2 mt-4"><button class="btn-sec flex-fill" onclick="bsEditSesi.hide()">Batal</button><button class="btn-start flex-fill" onclick="simpanEditSesi('${sid}')"><i class="bi bi-floppy-fill me-2"></i>Simpan</button></div>
      </div>`;
    window.esChgQty = (code, delta) => { const idx = editItems.findIndex(i => i.code===code); if (idx>=0) { editItems[idx].qty = Math.max(0, editItems[idx].qty+delta); if (editItems[idx].qty===0) editItems.splice(idx,1); } else if (delta>0) editItems.push({code,qty:1}); const el = document.getElementById('esqty_'+code), found = editItems.find(i => i.code===code); if (el) el.textContent = found?found.qty:0; };
    window.simpanEditSesi = (id) => { const sesi = activeSessions.find(s => s.id===id); if (!sesi) return; const nn = document.getElementById('esSesiNama').value.trim(), np = document.querySelector('input[name="esPayAwal"]:checked')?.value||'cash', fi = editItems.filter(i => i.qty>0); if (!nn) { alert('Nama tidak boleh kosong!'); return; } if (!fi.length) { alert('Pilih minimal satu item!'); return; } sesi.nama=nn; sesi.payAwal=np; sesi.items=fi; saveStorage(); renderAktif(); sbUpdateSession(sesi); bsEditSesi.hide(); fbToast('Sesi diperbarui!', 'success'); };
  };
  renderContent(); bsEditSesi.show();
}

function selesaiSewa(sid) { const session = activeSessions.find(s => s.id===sid); if (!session) return; openHitungModal(session); }

function openHitungModal(session) {
  const now = Date.now();
  const elapsed = calculateElapsed(session);
  const elapsedMin = elapsed/60;
  function getItemLimit(it) { const def=getItem(it.code); return def&&def.isPackage?(def.packageHours*60):60; }
  function calcAutoOT(itemDef, qty, limitMin) {
    if (Math.floor(elapsedMin - limitMin) < 11) return { otFullCount:0, otHalfCount:0, otCost:0 };
    const actualOver = elapsedMin-limitMin, fullCycles = Math.floor(actualOver/60), remainder = actualOver%60;
    let extraFull = fullCycles, extraHalf = 0;
    if (remainder<=10) {} else if (remainder<=40) extraHalf=1; else extraFull+=1;
    return { otFullCount:extraFull, otHalfCount:extraHalf, otCost:(extraFull*itemDef.priceOT60+extraHalf*itemDef.priceOT30)*qty };
  }
  let itemsCalc = session.items.map(it => { const def=getItem(it.code), limitMin=getItemLimit(it), auto=calcAutoOT(def,it.qty,limitMin); return {...it,def,limitMin,baseCost:def.priceHour*it.qty,otFullCount:auto.otFullCount||0,otHalfCount:auto.otHalfCount||0,otCost:auto.otCost||0,tolOn:false}; });
  const isOT = itemsCalc.some(it => Math.floor(elapsedMin-it.limitMin) >= 11);
  function recalcItemOT(idx) { const it=itemsCalc[idx]; it.otCost=(it.otFullCount*it.def.priceOT60+it.otHalfCount*it.def.priceOT30)*it.qty; }
  let manualAdj = 0;
  function calcGrand() { const base=itemsCalc.reduce((s,i)=>s+i.baseCost,0), subtotalOT=itemsCalc.reduce((s,i)=>s+(i.tolOn?0:i.otCost),0), grand=Math.max(0,subtotalOT+manualAdj); return {base,ot:subtotalOT,grand}; }
  const payAwal = session.payAwal||'cash', payIcon = payAwal==='qris'?`<span class="pay-awal-badge qris"><i class="bi bi-qr-code-scan"></i> QRIS</span>`:`<span class="pay-awal-badge cash"><i class="bi bi-cash-stack"></i> Cash</span>`;
  function renderHitung() {
    const {base,ot,grand} = calcGrand();
    const pokokRows = itemsCalc.map(it=>`<div class="d-flex justify-content-between align-items-center py-1"><span class="small" style="color:var(--text2)">${it.code} - ${it.def.name} ×${it.qty}${it.def.isPackage?' (Paket '+it.def.packageHours+'j)':''}</span><span class="small" style="color:var(--text2);text-decoration:line-through">${fmtRp(it.baseCost)}</span></div>`).join('');
    const otItemsHtml = itemsCalc.map((it,idx) => {
      const overMin = elapsedMin-it.limitMin;
      const otLabel = []; if (it.otFullCount>0) otLabel.push(`${it.otFullCount}× 1Jam (${fmtRp(it.def.priceOT60*it.qty*it.otFullCount)})`); if (it.otHalfCount>0) otLabel.push(`${it.otHalfCount}× ½Jam (${fmtRp(it.def.priceOT30*it.qty*it.otHalfCount)})`);
      let overStatus = ''; if (overMin<=0) overStatus=`<span style="font-size:.72rem;color:var(--green)"><i class="bi bi-check-circle me-1"></i>Normal</span>`; else if (Math.floor(overMin)<11) overStatus=`<span style="font-size:.72rem;color:var(--text2)"><i class="bi bi-clock me-1"></i>Over ${Math.floor(overMin)}m — toleransi</span>`; else overStatus=`<span style="font-size:.72rem;color:var(--orange)"><i class="bi bi-lightning-charge-fill me-1"></i>Over ${Math.floor(overMin)}m</span>`;
      return `<div class="breakdown-item ${it.tolOn?'item-tolerated':''}">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <div class="flex-fill"><div class="bi-name">${it.code} - ${it.def.name}<span style="font-weight:400;font-size:.78rem;color:var(--text2)">×${it.qty}</span></div><div class="mb-1">${overStatus}</div><div class="ot-auto-detail ${it.tolOn?'ot-detail-striked':''}">${otLabel.length?otLabel.join(' + '):'<span style="color:var(--text2);font-size:.78rem">Tidak ada overtime</span>'}</div>${!it.tolOn?`<div class="ot-manual-row"><span class="ot-manual-lbl">Sesuaikan:</span><div class="ot-manual-ctrl"><span class="ot-manual-tag">1 Jam</span><button class="ot-count-btn" onclick="chgOTFull(${idx},-1)">−</button><span class="ot-count-val">${it.otFullCount}</span><button class="ot-count-btn" onclick="chgOTFull(${idx},1)">+</button></div><div class="ot-manual-ctrl"><span class="ot-manual-tag">½ Jam</span><button class="ot-count-btn" onclick="chgOTHalf(${idx},-1)">−</button><span class="ot-count-val">${it.otHalfCount}</span><button class="ot-count-btn" onclick="chgOTHalf(${idx},1)">+</button></div></div>`:''}<label class="tol-toggle-label mt-1"><input type="checkbox" ${it.tolOn?'checked':''} onchange="togTol(${idx},this.checked)"><span class="tol-toggle-text ${it.tolOn?'tol-on':''}">${it.tolOn?'<i class="bi bi-shield-check-fill me-1"></i>Toleransi aktif':'<i class="bi bi-slash-circle me-1"></i>Toleransi / Hapus OT'}</span></label></div>
          <div class="pt-1 text-end" style="min-width:72px;flex-shrink:0">${it.tolOn?`<div style="text-decoration:line-through;color:var(--text2);font-size:.8rem">${fmtRp(it.otCost)}</div><div class="tol-free-badge">GRATIS</div>`:`<div class="bi-price">${it.otCost>0?fmtRp(it.otCost):'<span style="color:var(--text2);font-size:.8rem">—</span>'}</div>`}</div>
        </div>
      </div>`;
    }).join('');
    const maxOverMin = Math.max(...itemsCalc.map(it => { const o=elapsedMin-it.limitMin; return Math.floor(o)>=11?o:0; }));
    const otAlertHtml = isOT ? `<div class="ot-alert"><i class="bi bi-exclamation-triangle-fill clr-orange me-1"></i>Ada item melewati batas! (${Math.floor(maxOverMin)} menit overtime)</div>` : `<div class="ot-alert" style="background:rgba(63,185,80,.1);border-color:var(--green)"><i class="bi bi-check-circle-fill clr-green me-1"></i>Durasi dalam batas normal — tidak ada biaya overtime.</div>`;
    const subtotalOT = itemsCalc.reduce((s,i)=>s+(i.tolOn?0:i.otCost),0);
    document.getElementById('modalHitungContent').innerHTML = `
      <div class="hitung-wrap">
        <div class="info-row" style="grid-template-columns:repeat(3,1fr)"><div class="info-box"><div class="lbl">Nama</div><div class="val name">${session.nama}</div></div><div class="info-box"><div class="lbl">Mulai Sewa</div><div class="val">${timeStr(session.startTime)}</div></div><div class="info-box"><div class="lbl">Sekarang</div><div class="val">${timeStr(now)}</div></div></div>
        <div class="info-row" style="grid-template-columns:1fr 1fr;margin-bottom:14px"><div class="info-box"><div class="lbl">Total Durasi</div><div class="val" style="font-family:'Montserrat',sans-serif;letter-spacing:2px">${fmtDur(elapsed)}</div></div><div class="info-box"><div class="lbl">Status</div><div class="val ${isOT?'clr-orange':'clr-green'}" style="font-size:.9rem">${isOT?'<i class="bi bi-exclamation-circle me-1"></i>Ada Overtime':'<i class="bi bi-check-circle-fill me-1"></i>Normal'}</div></div></div>
        <div class="pokok-lunas-box mb-3"><div class="d-flex align-items-center gap-2 mb-1 flex-wrap"><i class="bi bi-check-circle-fill clr-green"></i><span style="font-weight:800;font-size:.88rem;color:var(--green)">Tarif Sewa Pokok — Sudah Dibayar di Awal</span>${payIcon}<span class="ms-auto" style="font-weight:800;font-size:.9rem;color:var(--green)">${fmtRp(base)}</span></div><div class="ps-3">${pokokRows}</div></div>
        ${otAlertHtml}
        <div class="ot-section-title"><i class="bi bi-lightning-charge-fill clr-orange me-1"></i><span>Biaya Overtime</span></div>
        <div>${otItemsHtml}</div>
        ${subtotalOT>0?`<div class="ot-subtotal-row"><span>Subtotal Overtime</span><span>${fmtRp(subtotalOT)}</span></div>`:''}
        <div class="grand-total-box mt-2"><div><div class="gt-label"><i class="bi bi-cash-coin me-2"></i>Total Tagihan Overtime</div><div style="font-size:.72rem;color:var(--text2);margin-top:2px">Tarif pokok sudah dibayar di awal</div></div><span class="gt-val">${fmtRp(grand)}</span></div>
        <div class="total-all-box"><div><div class="total-all-label"><i class="bi bi-receipt-cutoff me-2" style="color:var(--yellow)"></i>Total Biaya Keseluruhan</div><div style="font-size:.72rem;color:var(--text2);margin-top:3px">Pokok <b>${fmtRp(base)}</b> + Overtime <b style="color:var(--orange)">${fmtRp(grand)}</b></div></div><span class="total-all-val">${fmtRp(base+grand)}</span></div>
        <div class="manual-adj-box"><div class="manual-adj-header"><i class="bi bi-pencil-square me-1"></i>Koreksi Nominal</div><div class="manual-adj-body"><div class="adj-input-row"><button class="adj-btn adj-minus" onclick="adjManual(-5000)">−5rb</button><div class="adj-display ${manualAdj!==0?(manualAdj>0?'adj-plus-active':'adj-minus-active'):''}">${manualAdj===0?'<span style="color:var(--text2);font-size:.85rem">0</span>':`${manualAdj>0?'+':''}${fmtRp(manualAdj)}`}</div><button class="adj-btn adj-plus" onclick="adjManual(5000)">+5rb</button>${manualAdj!==0?`<button class="adj-reset-btn" onclick="adjManual(0,true)"><i class="bi bi-arrow-counterclockwise"></i></button>`:''}</div><div class="quick-disc-row mt-2">${[500,1000,5000,10000,20000,30000,50000,60000,100000].map(v=>{const l=v>=1000?(v/1000)+'rb':v;return `<button class="adj-quick-btn ${manualAdj===-v?'adj-q-minus':''} ${manualAdj===v?'adj-q-plus':''}" onclick="adjQuick(${v})">${l}</button>`;}).join('')}</div></div></div>
        <div class="hitung-actions"><button class="btn-sec" onclick="bsHitung.hide()">Batal</button><button class="btn-start" onclick="lanjutBayar()"><i class="bi bi-credit-card-fill me-2"></i>Bayar &amp; Selesaikan</button></div>
      </div>`;
    window.chgOTFull = (idx,d)=>{ itemsCalc[idx].otFullCount=Math.max(0,itemsCalc[idx].otFullCount+d); recalcItemOT(idx); renderHitung(); }; window.chgOTHalf = (idx,d)=>{ itemsCalc[idx].otHalfCount=Math.max(0,itemsCalc[idx].otHalfCount+d); recalcItemOT(idx); renderHitung(); }; window.togTol = (idx,v)=>{ if(v){itemsCalc[idx]._bakFull=itemsCalc[idx].otFullCount;itemsCalc[idx]._bakHalf=itemsCalc[idx].otHalfCount;itemsCalc[idx]._bakCost=itemsCalc[idx].otCost;itemsCalc[idx].tolOn=true;}else{itemsCalc[idx].otFullCount=itemsCalc[idx]._bakFull||0;itemsCalc[idx].otHalfCount=itemsCalc[idx]._bakHalf||0;itemsCalc[idx].otCost=itemsCalc[idx]._bakCost||0;itemsCalc[idx].tolOn=false;}renderHitung(); }; window.adjManual = (delta,reset=false)=>{ if(reset) manualAdj=0; else manualAdj+=delta; renderHitung(); }; window.adjQuick = (v)=>{ if(manualAdj===v) manualAdj=-v; else if(manualAdj===-v) manualAdj=0; else manualAdj=v; renderHitung(); };
    window.lanjutBayar = ()=>{ const {base,ot,grand}=calcGrand(); const otStr=itemsCalc.filter(i=>!i.tolOn&&(i.otFullCount>0||i.otHalfCount>0)).map(i=>`${i.code}(${i.otFullCount>0?i.otFullCount+'×1j':''}${i.otHalfCount>0?(i.otFullCount>0?'+':'')+i.otHalfCount+'×½j':''})`).join(', '); const otDurStr=itemsCalc.filter(i=>!i.tolOn&&(i.otFullCount>0||i.otHalfCount>0)).map(i=>`${i.code}:${i.otFullCount*60+i.otHalfCount*30}m`).join(', '); currentBayarData={session,itemsCalc,base,ot,tol:manualAdj!==0?-manualAdj:0,grand,otStr:otStr||'-',otDurStr:otDurStr||'-',elapsed,endTime:now}; bsHitung.hide(); openBayarModal(); };
  }
  renderHitung(); bsHitung.show();
}

function openBayarModal() {
  const {grand,base,ot,itemsCalc,session} = currentBayarData;
  const payAwal = session.payAwal||'cash', isNoOT = grand===0;
  let payMode = isNoOT ? payAwal : 'cash', cashAmt=0, qrisAmt=0;
  const itemDetail = itemsCalc.map(i=>`${i.code}×${i.qty}(${fmtRp(i.baseCost)})`).join(' | ');
  const otDetail = itemsCalc.filter(i=>i.otCost>0).map(i=>`OT ${i.code}: ${fmtRp(i.otCost)}`).join(' | ');
  const autoPrintSelesai = localStorage.getItem('kw_printSelesai')==='true';
  function renderBayar() {
    const inputsHtml = payMode==='split' ? `<div class="row g-2 mt-1"><div class="col-6"><label class="field-label">💵 Cash (Rp)</label><input type="number" class="cfield" id="cashIn" value="${cashAmt||0}" style="padding-left:12px" oninput="onCashIn()"></div><div class="col-6"><label class="field-label">📱 QRIS (Rp)</label><input type="number" class="cfield" id="qrisIn" value="${qrisAmt||0}" style="padding-left:12px" oninput="onQrisIn()"></div></div>` : payMode==='cash' ? `<div class="mt-2"><label class="field-label">Jumlah Uang Diterima (Rp)</label><input type="number" class="cfield" id="cashIn" value="${cashAmt||grand}" style="padding-left:12px" oninput="onKembalian()"><div class="kembalian-box mt-2"><span class="kem-lbl"><i class="bi bi-arrow-return-left me-1"></i>Kembalian</span><span class="kem-val" id="kemVal">${fmtRp(0)}</span></div></div>` : `<div class="mt-2 text-center p-3" style="background:var(--bg);border-radius:10px;border:1px solid var(--border)"><div style="font-size:2rem">📱</div><div class="text-secondary mb-1">Scan QRIS untuk pembayaran</div><div style="font-family:'Montserrat',sans-serif;font-size:1.3rem;color:var(--yellow)">${fmtRp(grand)}</div></div>`;
    const cardCash = isNoOT&&payAwal!=='cash' ? `<div class="pay-card" style="opacity:.35;cursor:not-allowed"><div class="pay-icon">💵</div><div class="pay-name">Cash</div></div>` : `<div class="pay-card ${payMode==='cash'?'active':''}" onclick="setPayMode('cash')"><div class="pay-icon">💵</div><div class="pay-name">Cash</div></div>`;
    const cardQris = isNoOT&&payAwal!=='qris' ? `<div class="pay-card" style="opacity:.35;cursor:not-allowed"><div class="pay-icon">📱</div><div class="pay-name">QRIS</div></div>` : `<div class="pay-card ${payMode==='qris'?'active':''}" onclick="setPayMode('qris')"><div class="pay-icon">📱</div><div class="pay-name">QRIS</div></div>`;
    const cardSplit = isNoOT ? `<div class="pay-card" style="opacity:.35;cursor:not-allowed"><div class="pay-icon">💳</div><div class="pay-name">Split</div></div>` : `<div class="pay-card ${payMode==='split'?'active':''}" onclick="setPayMode('split')"><div class="pay-icon">💳</div><div class="pay-name">Split</div></div>`;
    document.getElementById('modalBayarContent').innerHTML = `<div class="bayar-wrap"><div class="bayar-total-box"><div class="bt-label">Total Tagihan (Overtime)</div><div class="bt-val">${fmtRp(grand)}</div><div class="bt-detail">${itemDetail}</div>${otDetail?`<div class="bt-detail clr-orange">${otDetail}</div>`:''}</div><div class="pay-methods">${cardCash}${cardQris}${cardSplit}</div>${inputsHtml}<div class="print-info-note" style="${autoPrintSelesai?'':'background:rgba(139,148,158,.08);border-color:rgba(139,148,158,.2);color:var(--text2)'}"><i class="bi bi-printer${autoPrintSelesai?'-fill':''}" ${autoPrintSelesai?'':'style="opacity:.5"'}></i>${autoPrintSelesai?'Struk akan dicetak otomatis':'Auto print tidak aktif'}</div><button class="btn-start w-100 mt-3" onclick="konfirmBayar()"><i class="bi bi-check-circle-fill me-2"></i>Konfirmasi Pembayaran</button><button class="btn-sec w-100 mt-2" onclick="closeModal(\'modalBayar\')">Batal</button></div>`;
    window.setPayMode = m=>{ if(isNoOT&&m!==payAwal) return; payMode=m; cashAmt=0; qrisAmt=0; renderBayar(); }; window.onKembalian = ()=>{ cashAmt=parseInt(document.getElementById('cashIn')?.value||0); document.getElementById('kemVal').textContent=fmtRp(Math.max(0,cashAmt-grand)); }; window.onCashIn = ()=>{ cashAmt=parseInt(document.getElementById('cashIn')?.value||0); qrisAmt=grand-cashAmt; if(document.getElementById('qrisIn')) document.getElementById('qrisIn').value=qrisAmt<0?0:qrisAmt; }; window.onQrisIn = ()=>{ qrisAmt=parseInt(document.getElementById('qrisIn')?.value||0); cashAmt=grand-qrisAmt; if(document.getElementById('cashIn')) document.getElementById('cashIn').value=cashAmt<0?0:cashAmt; };
    window.konfirmBayar = ()=>{ let fc=0,fq=0; if (payMode==='cash') fc=grand; else if (payMode==='qris') fq=grand; else { fc=parseInt(document.getElementById('cashIn')?.value||0); fq=parseInt(document.getElementById('qrisIn')?.value||0); if(fc+fq!==grand){alert(`Split (${fmtRp(fc+fq)}) ≠ tagihan (${fmtRp(grand)})`);return;} } bsBayar.hide(); finalizeTxn(fc, fq); };
  }
  renderBayar(); bsBayar.show();
}

function finalizeTxn(cash, qris) {
  const {session,itemsCalc,base,ot,tol,grand,otStr,otDurStr,elapsed,endTime} = currentBayarData;
  const itemStr = session.items.map(i=>`${i.code}×${i.qty}`).join(', ');
  const txn = { id:session.id, no:transactions.length+1, queueNo:session.queueNo||0, nama:session.nama, tanggal:todayStr(), startTime:session.startTime, endTime, items:itemStr, ot:otStr||'-', otDur:otDurStr||'-', totalBase:base, totalOT:ot, totalTol:tol, grandTotal:grand, totalAll:base+grand, payAwal:session.payAwal||'cash', cash, qris, shift:currentShiftUser||'-' };
  transactions.push(txn); activeSessions = activeSessions.filter(s => s.id!==session.id); saveStorage(); updateBadge(); renderAktif(); renderRiwayat();
  sbDeleteSession(session.id).then(() => sbInsertTxn(txn));
  
  const autoPrintSelesai = localStorage.getItem('kw_printSelesai') === 'true';
  if (autoPrintSelesai) printSelesai(txn);
  
  fbToast('Pembayaran selesai! ✓ ' + txn.nama, 'success', 3000); currentBayarData = null;
}

function printMulai(session, auto) {
  if (!auto) return;
  const items = session.items.map(i => { 
    const d = getItem(i.code); 
    if (!d) return `${i.code} x${i.qty}`;
    return `${i.code} - ${d.name} x${i.qty}  ${fmtRp(d.priceHour*i.qty)}`; 
  }).join('\n');
  const total = session.items.reduce((s,i)=>{
    const d = getItem(i.code);
    return s + (d ? d.priceHour*i.qty : 0);
  }, 0);
  const trackUrl = window.location.href.split('#')[0] + '#track/' + session.id;
  const html = `<div class="receipt-mono"><div class="rc rb" style="font-size:13px">EVREN HOUSE</div><div class="rc">Scooter &amp; Stroller</div><div class="rc">Struk Mulai Sewa</div><hr><div>Queue Number: ${session.queueNo||0}</div><div>Tgl: ${dateStr(session.startTime)} | ${timeStr(session.startTime)}</div><div>Nama: ${session.nama}</div><div>Shift: ${currentShiftUser||'-'}</div><hr><pre style="font-size:11px;margin:0">${items}</pre><hr><div class="rr rb"><span>Total Pokok:</span><span>${fmtRp(total)}</span></div><hr><div class="rc" style="margin:5px 0"><div id="printQrCode" style="display:inline-block;background:#fff;padding:5px"></div><div style="font-size:9px;margin-top:4px">Scan QR untuk Cek Sisa Waktu</div></div><hr><div class="rc" style="font-size:10px">Terima kasih!</div></div>`;
  triggerPrint(html, trackUrl);
}
function printSelesai(txn) {
  const trackUrl = window.location.href.split('#')[0] + '#track/' + txn.id;
  const durSec = Math.floor((txn.endTime - (txn.startTime || Date.now())) / 1000);
  const html = `<div class="receipt-mono"><div class="rc rb" style="font-size:13px">EVREN HOUSE</div><div class="rc">Scooter &amp; Stroller</div><div class="rc">Struk Selesai Sewa</div><hr><div>Queue Number: ${txn.queueNo||0}</div><div>No: ${txn.no} | ${dateStr(txn.endTime)}</div><div>Nama: ${txn.nama}</div><div>Shift: ${txn.shift||'-'}</div><div>Mulai: ${timeStr(txn.startTime)} | Selesai: ${timeStr(txn.endTime)}</div><div>Durasi: ${fmtDur(durSec)}</div><hr><div>Item: ${txn.items}</div>${txn.ot!=='-'?`<div>OT: ${txn.ot}</div>`:''}<hr><div class="rr"><span>Sewa Pokok:</span><span>${fmtRp(txn.totalBase)} (${txn.payAwal.toUpperCase()})</span></div>${txn.totalOT>0?`<div class="rr"><span>Overtime:</span><span>${fmtRp(txn.totalOT)}</span></div>`:''}<hr><div class="rr rb"><span>TOTAL:</span><span>${fmtRp(txn.totalAll)}</span></div>${txn.cash>0?`<div class="rr"><span>Cash:</span><span>${fmtRp(txn.cash)}</span></div>`:''}${txn.qris>0?`<div class="rr"><span>QRIS:</span><span>${fmtRp(txn.qris)}</span></div>`:''}<hr><div class="rc" style="margin:5px 0"><div id="printQrCode" style="display:inline-block;background:#fff;padding:5px"></div><div style="font-size:9px;margin-top:4px">Scan QR untuk Struk Digital</div></div><hr><div class="rc" style="font-size:10px">Terima kasih telah berkunjung!</div></div>`;
  triggerPrint(html, trackUrl);
}
function triggerPrint(html, qrText = null) { 
  const area = document.getElementById('printArea'); 
  if (!area) return;
  area.innerHTML = html; 
  area.style.display = 'block'; 
  if (qrText && typeof QRCode !== 'undefined') { 
    const qrEl = area.querySelector('#printQrCode'); 
    if (qrEl) { 
      try {
        new QRCode(qrEl, { text: qrText, width: 120, height: 120, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); 
      } catch (e) { console.error('QR Error:', e); }
    } 
  } 
  setTimeout(() => { 
    window.print(); 
    setTimeout(() => { area.style.display = 'none'; }, 100);
  }, 500); 
}
function setDefaultDate() { document.getElementById('filterTanggal').value = todayStr(); }

function renderRiwayat() {
  const date = document.getElementById('filterTanggal')?.value || todayStr();
  const data = transactions.filter(t => t.tanggal===date);
  const totalPokok=data.reduce((s,t)=>s+(t.totalBase||0),0);
  const totalPokokCash=data.reduce((s,t)=>s+((t.payAwal||'cash')==='cash'?(t.totalBase||0):0),0);
  const totalPokokQris=data.reduce((s,t)=>s+((t.payAwal||'cash')==='qris'?(t.totalBase||0):0),0);
  const totalTambahan=data.reduce((s,t)=>s+(t.totalOT||0),0);
  const totalOTCash=data.reduce((s,t)=>s+(t.cash||0),0);
  const totalOTQris=data.reduce((s,t)=>s+(t.qris||0),0);
  const totalCashAll=totalPokokCash+totalOTCash, totalQrisAll=totalPokokQris+totalOTQris;
  const totalAll=totalPokok+totalTambahan;
  document.getElementById('summaryCards').innerHTML = `
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Transaksi</div><div class="sum-val">${data.length}</div></div></div>
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Total Pokok</div><div class="sum-val" style="color:var(--text2)">${fmtRp(totalPokok)}</div><div class="sum-pokok-breakdown"><span class="sum-pokok-item cash">C: ${fmtRp(totalPokokCash)}</span><span class="sum-pokok-item qris">Q: ${fmtRp(totalPokokQris)}</span></div></div></div>
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Total Tambahan</div><div class="sum-val clr-orange">${fmtRp(totalTambahan)}</div><div class="sum-pokok-breakdown"><span class="sum-pokok-item cash">C: ${fmtRp(totalOTCash)}</span><span class="sum-pokok-item qris">Q: ${fmtRp(totalOTQris)}</span></div></div></div>
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Total Cash</div><div class="sum-val clr-green">${fmtRp(totalCashAll)}</div></div></div>
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Total QRIS</div><div class="sum-val clr-cyan">${fmtRp(totalQrisAll)}</div></div></div>
    <div class="col-6 col-sm-2"><div class="sum-card"><div class="sum-label">Grand Total</div><div class="sum-val clr-yellow">${fmtRp(totalAll)}</div></div></div>`;
  const tbody = document.getElementById('riwayatBody'); if (!data.length) { tbody.innerHTML = `<tr><td colspan="16" class="text-center text-secondary py-4">Tidak ada transaksi</td></tr>`; return; }
  tbody.innerHTML = data.map((t,i) => {
    const isCash=(t.payAwal||'cash')==='cash', isQris=(t.payAwal||'cash')==='qris', pokokCash=isCash?(t.totalBase||0):0, pokokQris=isQris?(t.totalBase||0):0;
    return `<tr><td>${i+1}</td><td><strong>${t.nama}</strong></td><td><span class="badge-shift">${shiftCode(t.shift)}</span></td><td>${dateStr(t.startTime)}</td><td style="white-space:nowrap;font-size:.78rem">${timeStr(t.startTime)} - ${timeStr(t.endTime)}</td><td style="font-size:.78rem">${t.items}</td><td style="font-size:.78rem">${t.ot||'-'}</td><td style="font-size:.75rem;color:var(--orange)">${t.otDur||'-'}</td><td>${isCash?`<span style="color:var(--green);font-weight:700">${fmtRp(t.totalBase||0)}</span>`:'—'}</td><td>${isQris?`<span style="color:var(--cyan);font-weight:700">${fmtRp(t.totalBase||0)}</span>`:'—'}</td><td>${(t.cash||0)>0?`<span style="color:var(--green);font-weight:700">${fmtRp(t.cash)}</span>`:'—'}</td><td>${(t.qris||0)>0?`<span style="color:var(--cyan);font-weight:700">${fmtRp(t.qris)}</span>`:'—'}</td><td><span style="font-weight:800;color:var(--green)">${fmtRp(pokokCash+(t.cash||0))}</span></td><td><span style="font-weight:800;color:var(--cyan)">${fmtRp(pokokQris+(t.qris||0))}</span></td><td><span style="font-weight:800;color:var(--yellow)">${fmtRp(t.totalAll||((t.totalBase||0)+(t.grandTotal||0)))}</span></td><td><button class="act-btn" onclick="editRiwayat('${t.id}')"><i class="bi bi-pencil-square"></i></button><button class="act-btn" onclick="delRiwayat('${t.id}')"><i class="bi bi-trash3-fill clr-red"></i></button></td></tr>`;
  }).join('');
}

function editRiwayat(id) { pendingAction={type:'edit',id}; openPassModal(); }
function delRiwayat(id)  { pendingAction={type:'delete',id}; openPassModal(); }
function openPassModal()  { resetPassModal(); bsPassword.show(); }
function resetPassModal() { document.getElementById('passInput').value=''; document.getElementById('passError').classList.add('d-none'); }
function verifyPassword() {
  const v = document.getElementById('passInput')?.value;
  if (v === adminPassword) { bsPassword.hide(); if (pendingAction?.type==='edit') openEditModal(pendingAction.id); else if (pendingAction?.type==='delete') { if(confirm('Hapus transaksi ini?')){ const di=pendingAction.id; transactions=transactions.filter(t=>t.id!==di); saveStorage(); renderRiwayat(); sbDeleteTxn(di); } } else if (pendingAction?.type==='editSesi') openEditSesiModal(pendingAction.id); pendingAction = null; } 
  else { document.getElementById('passError').classList.remove('d-none'); }
}

function changePassword() { const v = document.getElementById('adminPassInput').value.trim(); if (!v) return; if (confirm('Ubah password admin?')) { adminPassword = v; localStorage.setItem('kw_pass', v); sbSaveSetting('adminPassword', v); fbToast('Password diubah!', 'success'); document.getElementById('adminPassInput').value=''; } }
function loadPrintSettings() { const m = localStorage.getItem('kw_printMulai')==='true', s = localStorage.getItem('kw_printSelesai')==='true'; document.getElementById('autoPrintMulai').checked=m; document.getElementById('autoPrintSelesai').checked=s; }
function savePrintSettings() { const m = document.getElementById('autoPrintMulai').checked, s = document.getElementById('autoPrintSelesai').checked; localStorage.setItem('kw_printMulai', m); localStorage.setItem('kw_printSelesai', s); sbSaveSetting('printMulai', m); sbSaveSetting('printSelesai', s); }

function renderSettingItems() {
  const grid = document.getElementById('settingItemsGrid'); if (!grid) return;
  grid.innerHTML = ITEMS.map(item => { const img = getImg(item.code) || item.defaultImg; return `<div class="col"><div class="setting-card"><div class="setting-img-box"><img src="${img}" id="img_set_${item.code}" onerror="this.parentElement.innerHTML='<div style=font-size:2rem>${item.emoji}</div>'"></div><div class="setting-code">${item.code}</div><div class="setting-name">${item.name}</div><button class="btn-upload-img" onclick="uploadImg('${item.code}')">Ganti Gambar</button><button class="btn-reset-img" onclick="resetItemImg('${item.code}')">Reset</button></div></div>`; }).join('');
}
function uploadImg(code) { const url = prompt('Masukkan URL gambar baru:'); if (url) { setImg(code, url); renderItems(); renderSettingItems(); sbSaveImage(code, url); } }
function resetItemImg(code) { if (confirm('Reset ke gambar default?')) { resetImg(code); renderItems(); renderSettingItems(); sbDeleteImage(code); } }

function showExportModal() { bsExport.show(); }
function exportData(mode) { exportMode = mode; doExport(); }
function doExport() {
  const date = document.getElementById('filterTanggal').value;
  const data = transactions.filter(t => t.tanggal === date);
  if (!data.length) { fbToast('Tidak ada data untuk diexport', 'error'); return; }
  const ws = XLSX.utils.json_to_sheet(data.map(t => ({
    No: t.no, Nama: t.nama, Shift: t.shift, Tanggal: t.tanggal, Mulai: timeStr(t.startTime), Selesai: timeStr(t.endTime),
    Items: t.items, OT: t.ot, 'Durasi OT': t.otDur, 'Pokok': t.totalBase, 'OT Cost': t.totalOT, 'Toleransi': t.totalTol,
    'Grand Total': t.totalAll, 'Metode Pokok': t.payAwal, 'Bayar Cash': t.cash, 'Bayar QRIS': t.qris
  })));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, `EvrenHouse_${date}.xlsx`);
  bsExport.hide();
}

/* ═══════════════════════════════════
   SUPABASE HELPERS (Final cleanup)
═══════════════════════════════════ */
function sessionToSbRow(s) { return { id:s.id, nama:s.nama, items:s.items, start_time:s.startTime, pay_awal:s.payAwal||'cash' }; }
function sbRowToSession(row) { return { id:row.id, nama:row.nama, items:row.items||[], startTime:row.start_time||Date.now(), payAwal:row.pay_awal||'cash' }; }
function txnToSbRow(t) { return { id:t.id, no:t.no||0, nama:t.nama, tanggal:t.tanggal, start_time:t.startTime, end_time:t.endTime, items:t.items, ot:t.ot||'-', ot_dur:t.ot_dur||'-', total_base:t.totalBase||0, total_ot:t.totalOT||0, total_tol:t.totalTol||0, grand_total:t.grandTotal||0, total_all:t.totalAll||((t.totalBase||0)+(t.grandTotal||0)), pay_awal:t.payAwal||'cash', cash:t.cash||0, qris:t.qris||0, shift:t.shift||'-' }; }
function sbRowToTxn(row) { return { id:row.id, no:row.no||0, nama:row.nama, tanggal:row.tanggal, startTime:row.start_time||0, endTime:row.end_time||0, items:row.items, ot:row.ot||'-', otDur:row.ot_dur||'-', totalBase:row.total_base||0, totalOT:row.total_ot||0, totalTol:row.total_tol||0, grandTotal:row.grand_total||0, totalAll:row.total_all||((row.total_base||0)+(row.grand_total||0)), payAwal:row.pay_awal||'cash', cash:row.cash||0, qris:row.qris||0, shift:row.shift||'-' }; }

window.onload = () => { if (!checkHashRoute()) { checkSavedSession(); } };
