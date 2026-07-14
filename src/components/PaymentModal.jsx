import React, { useState } from 'react';
import { fmtRp } from '../App';

function PaymentModal({ bayarData, onClose, onFinalize }) {
  const { grand, base, session } = bayarData;
  const isNoOT = grand === 0;

  const [payMode, setPayMode] = useState(isNoOT ? session.payAwal : 'cash');
  const [cashAmt, setCashAmt] = useState(grand);
  const [qrisAmt, setQrisAmt] = useState(0);

  const handleFinalize = () => {
    let finalCash = 0;
    let finalQris = 0;

    if (payMode === 'cash') {
      finalCash = grand;
    } else if (payMode === 'qris') {
      finalQris = grand;
    } else {
      finalCash = Number(cashAmt);
      finalQris = Number(qrisAmt);
      if (finalCash + finalQris !== grand) {
        alert(`Jumlah Split (${fmtRp(finalCash + finalQris)}) tidak sama dengan total tagihan (${fmtRp(grand)})!`);
        return;
      }
    }

    onFinalize(finalCash, finalQris);
  };

  const changeVal = Math.max(0, cashAmt - grand);

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content cmodal">
          <div className="modal-header cmodal-head">
            <h5 className="modal-title"><i className="bi bi-credit-card-fill me-2 clr-green"></i>Pembayaran</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            <div className="bayar-wrap" style={{ padding: '20px' }}>
              <div className="bayar-total-box text-center p-3 mb-3 border rounded">
                <div className="bt-label">Total Tagihan (Overtime)</div>
                <div className="bt-val font-weight-bold" style={{ fontSize: '1.8rem', color: 'var(--yellow)' }}>{fmtRp(grand)}</div>
              </div>

              <div className="pay-methods d-flex gap-2 justify-content-center mb-3">
                <button 
                  disabled={isNoOT && session.payAwal !== 'cash'}
                  className={`btn flex-fill py-2 btn-outline-primary ${payMode === 'cash' ? 'active' : ''}`}
                  onClick={() => { setPayMode('cash'); setCashAmt(grand); setQrisAmt(0); }}
                >
                  💵 Cash
                </button>
                <button 
                  disabled={isNoOT && session.payAwal !== 'qris'}
                  className={`btn flex-fill py-2 btn-outline-primary ${payMode === 'qris' ? 'active' : ''}`}
                  onClick={() => { setPayMode('qris'); setCashAmt(0); setQrisAmt(grand); }}
                >
                  📱 QRIS
                </button>
                <button 
                  disabled={isNoOT}
                  className={`btn flex-fill py-2 btn-outline-primary ${payMode === 'split' ? 'active' : ''}`}
                  onClick={() => { setPayMode('split'); setCashAmt(Math.round(grand/2)); setQrisAmt(grand - Math.round(grand/2)); }}
                >
                  💳 Split
                </button>
              </div>

              {payMode === 'cash' && (
                <div className="mb-3">
                  <label className="field-label">Jumlah Uang Cash Diterima</label>
                  <input 
                    type="number" 
                    className="cfield" 
                    style={{ paddingLeft: '12px' }}
                    value={cashAmt}
                    onChange={(e) => setCashAmt(Number(e.target.value))} 
                  />
                  <div className="kembalian-box mt-3 p-2 bg-success-subtle text-success rounded d-flex justify-content-between">
                    <span>Kembalian</span>
                    <strong>{fmtRp(changeVal)}</strong>
                  </div>
                </div>
              )}

              {payMode === 'qris' && (
                <div className="p-3 text-center border rounded mb-3">
                  <div style={{ fontSize: '2rem' }}>📱 Scan QRIS</div>
                  <div style={{ color: 'var(--yellow)', fontSize: '1.2rem' }}>{fmtRp(grand)}</div>
                </div>
              )}

              {payMode === 'split' && (
                <div className="row g-2 mb-3">
                  <div className="col-6">
                    <label className="field-label">💵 Cash</label>
                    <input 
                      type="number" 
                      className="cfield" 
                      style={{ paddingLeft: '12px' }}
                      value={cashAmt}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCashAmt(val);
                        setQrisAmt(grand - val);
                      }} 
                    />
                  </div>
                  <div className="col-6">
                    <label className="field-label">📱 QRIS</label>
                    <input 
                      type="number" 
                      className="cfield" 
                      style={{ paddingLeft: '12px' }}
                      value={qrisAmt}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQrisAmt(val);
                        setCashAmt(grand - val);
                      }}
                    />
                  </div>
                </div>
              )}

              <button className="btn-start w-100 mb-2" onClick={handleFinalize}>
                <i className="bi bi-check-circle-fill me-2"></i>Konfirmasi Pembayaran
              </button>
              <button className="btn-sec w-100" onClick={onClose}>
                Batal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
