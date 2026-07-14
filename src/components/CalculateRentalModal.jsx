import React, { useState, useEffect } from 'react';
import { ITEMS, fmtRp, fmtDur } from '../App';

function CalculateRentalModal({ session, onClose, onProceedPayment }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - session.startTime) / 1000));
  const [elapsedMin, setElapsedMin] = useState(() => Math.floor((Date.now() - session.startTime) / 1000) / 60);
  const [itemsCalc, setItemsCalc] = useState([]);
  const [manualAdj, setManualAdj] = useState(0);

  useEffect(() => {
    const el = Math.floor((Date.now() - session.startTime) / 1000);
    const elMin = el / 60;
    setElapsed(el);
    setElapsedMin(elMin);

    const initial = session.items.map(it => {
      const def = ITEMS.find(item => item.code === it.code);
      const limitMin = def && def.isPackage ? def.packageHours * 60 : 60;
      
      let otFull = 0, otHalf = 0;
      const actualOver = elMin - limitMin;
      if (Math.floor(actualOver) >= 11) {
        const cycles = Math.floor(actualOver / 60);
        const remainder = actualOver % 60;
        otFull = cycles;
        if (remainder > 10 && remainder <= 40) otHalf = 1;
        else if (remainder > 40) otFull += 1;
      }

      const otCost = (otFull * def.priceOT60 + otHalf * def.priceOT30) * it.qty;

      return {
        ...it,
        def,
        limitMin,
        baseCost: def.priceHour * it.qty,
        otFullCount: otFull,
        otHalfCount: otHalf,
        otCost: otCost,
        tolOn: false,
        bakFull: otFull,
        bakHalf: otHalf,
        bakCost: otCost
      };
    });
    setItemsCalc(initial);
  }, [session]);

  const handleTolToggle = (idx, checked) => {
    setItemsCalc(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      if (checked) {
        return {
          ...it,
          tolOn: true,
          bakFull: it.otFullCount,
          bakHalf: it.otHalfCount,
          bakCost: it.otCost,
          otFullCount: 0,
          otHalfCount: 0,
          otCost: 0
        };
      } else {
        return {
          ...it,
          tolOn: false,
          otFullCount: it.bakFull,
          otHalfCount: it.bakHalf,
          otCost: it.bakCost
        };
      }
    }));
  };

  const adjustOTQty = (idx, field, delta) => {
    setItemsCalc(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it };
      updated[field] = Math.max(0, updated[field] + delta);
      updated.otCost = (updated.otFullCount * updated.def.priceOT60 + updated.otHalfCount * updated.def.priceOT30) * updated.qty;
      return updated;
    }));
  };

  const baseSum = itemsCalc.reduce((sum, it) => sum + it.baseCost, 0);
  const otSum = itemsCalc.reduce((sum, it) => sum + (it.tolOn ? 0 : it.otCost), 0);
  const grandOT = Math.max(0, otSum + manualAdj);

  const isOT = itemsCalc.some(it => Math.floor(elapsedMin - it.limitMin) >= 11);
  const maxOver = Math.max(...itemsCalc.map(it => {
    const o = elapsedMin - it.limitMin;
    return Math.floor(o) >= 11 ? o : 0;
  }));

  const handleProceed = () => {
    const otStr = itemsCalc
      .filter(it => !it.tolOn && (it.otFullCount > 0 || it.otHalfCount > 0))
      .map(it => `${it.code}(${it.otFullCount > 0 ? it.otFullCount + '×1j' : ''}${it.otHalfCount > 0 ? (it.otFullCount > 0 ? '+' : '') + it.otHalfCount + '×½j' : ''})`)
      .join(', ');
    
    const otDurStr = itemsCalc
      .filter(it => !it.tolOn && (it.otFullCount > 0 || it.otHalfCount > 0))
      .map(it => `${it.code}:${it.otFullCount * 60 + it.otHalfCount * 30}m`)
      .join(', ');

    const calculatedData = {
      session,
      itemsCalc,
      base: baseSum,
      ot: otSum,
      tol: manualAdj !== 0 ? -manualAdj : 0,
      grand: grandOT,
      otStr: otStr || '-',
      otDurStr: otDurStr || '-',
      elapsed,
      endTime: Date.now()
    };
    onProceedPayment(calculatedData);
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content cmodal">
          <div className="modal-header cmodal-head">
            <h5 className="modal-title"><i className="bi bi-calculator-fill me-2 clr-yellow"></i>Hitung Sewa</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            <div className="hitung-wrap" style={{ padding: '20px' }}>
              <div className="info-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                <div className="info-box"><div className="lbl">Nama</div><div className="val name">{session.nama}</div></div>
                <div className="info-box"><div className="lbl">Mulai Sewa</div><div className="val">{new Date(session.startTime).toTimeString().slice(0,5)}</div></div>
                <div className="info-box"><div className="lbl">Sekarang</div><div className="val">{new Date().toTimeString().slice(0,5)}</div></div>
              </div>
              
              <div className="pokok-lunas-box mb-3">
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <i className="bi bi-check-circle-fill clr-green"></i>
                  <span style={{ fontWeight: 800, color: 'var(--green)' }}>Tarif Sewa Pokok — Sudah Dibayar</span>
                  <span className="ms-auto" style={{ fontWeight: 800 }}>{fmtRp(baseSum)}</span>
                </div>
              </div>

              {isOT ? (
                <div className="ot-alert mb-3">
                  <i className="bi bi-exclamation-triangle-fill clr-orange me-1"></i>
                  Ada item melewati batas! ({Math.floor(maxOver)} menit overtime)
                </div>
              ) : (
                <div className="ot-alert mb-3" style={{ background: 'rgba(63,185,80,.1)', borderColor: 'var(--green)' }}>
                  <i className="bi bi-check-circle-fill clr-green me-1"></i>
                  Durasi dalam batas normal.
                </div>
              )}

              <div className="ot-section-title"><i className="bi bi-lightning-charge-fill clr-orange me-1"></i><span>Biaya Overtime</span></div>
              
              <div className="mb-3">
                {itemsCalc.map((it, idx) => {
                  const overMin = elapsedMin - it.limitMin;
                  const otLabel = [];
                  if (it.otFullCount > 0) otLabel.push(`${it.otFullCount}× 1Jam (${fmtRp(it.def.priceOT60 * it.qty * it.otFullCount)})`);
                  if (it.otHalfCount > 0) otLabel.push(`${it.otHalfCount}× ½Jam (${fmtRp(it.def.priceOT30 * it.qty * it.otHalfCount)})`);
                  
                  let overStatus = '';
                  if (overMin <= 0) overStatus = 'Normal';
                  else if (Math.floor(overMin) < 11) overStatus = `Over ${Math.floor(overMin)}m — toleransi`;
                  else overStatus = `Over ${Math.floor(overMin)}m`;

                  return (
                    <div className={`breakdown-item ${it.tolOn ? 'item-tolerated' : ''}`} key={it.code}>
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="flex-fill">
                          <div className="bi-name">{it.code} - {it.def.name} ×{it.qty}</div>
                          <div className="small text-secondary mb-1">{overStatus}</div>
                          <div className={`ot-auto-detail ${it.tolOn ? 'ot-detail-striked' : ''}`}>
                            {otLabel.length > 0 ? otLabel.join(' + ') : 'Tidak ada overtime'}
                          </div>
                          {!it.tolOn && overMin > 0 && (
                            <div className="ot-manual-row mt-2">
                              <span className="ot-manual-lbl">1 Jam: </span>
                              <button className="ot-count-btn" onClick={() => adjustOTQty(idx, 'otFullCount', -1)}>−</button>
                              <span className="mx-2">{it.otFullCount}</span>
                              <button className="ot-count-btn" onClick={() => adjustOTQty(idx, 'otFullCount', 1)}>+</button>
                              <span className="ot-manual-lbl ms-3">½ Jam: </span>
                              <button className="ot-count-btn" onClick={() => adjustOTQty(idx, 'otHalfCount', -1)}>−</button>
                              <span className="mx-2">{it.otHalfCount}</span>
                              <button className="ot-count-btn" onClick={() => adjustOTQty(idx, 'otHalfCount', 1)}>+</button>
                            </div>
                          )}
                          <label className="tol-toggle-label mt-2">
                            <input type="checkbox" checked={it.tolOn} onChange={(e) => handleTolToggle(idx, e.target.checked)} />
                            <span className="ms-2 small">Toleransi / Hapus OT</span>
                          </label>
                        </div>
                        <div className="text-end">
                          {it.tolOn ? (
                            <span className="badge bg-success">GRATIS</span>
                          ) : (
                            <span className="bi-price">{fmtRp(it.otCost)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grand-total-box mt-3">
                <div className="gt-label">Total Tagihan Overtime</div>
                <div className="gt-val">{fmtRp(grandOT)}</div>
              </div>

              <div className="total-all-box mt-2">
                <div className="total-all-label">Total Biaya Keseluruhan</div>
                <div className="total-all-val">{fmtRp(baseSum + grandOT)}</div>
              </div>

              <div className="manual-adj-box mt-3 p-2 border rounded">
                <div className="small text-secondary mb-2">Koreksi Nominal Manual</div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setManualAdj(prev => prev - 5000)}>-5rb</button>
                  <span className="flex-grow-1 text-center align-self-center font-weight-bold">{fmtRp(manualAdj)}</span>
                  <button className="btn btn-sm btn-outline-success" onClick={() => setManualAdj(prev => prev + 5000)}>+5rb</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setManualAdj(0)}>Reset</button>
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button className="btn-sec flex-fill" onClick={onClose}>Batal</button>
                <button className="btn-start flex-fill" onClick={handleProceed}>
                  <i className="bi bi-credit-card-fill me-2"></i>Lanjut ke Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalculateRentalModal;
