import React, { useState, useEffect } from 'react';
import { sb } from '../supabase';
import { fmtDur, fmtRp } from '../App';
import { calcOTCost } from '../lib/ot';
import { ITEMS } from '../App';

function TrackingPage({ trackingId }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [txn, setTxn] = useState(null);
  const [error, setError] = useState('');
  
  // For live timer
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      setError('');
      try {
        // 1. Cek di active_sessions
        const { data: activeData, error: activeErr } = await sb
          .from('active_sessions')
          .select('*')
          .eq('id', trackingId)
          .single();
          
        if (activeData) {
          setSession({
            id: activeData.id,
            nama: activeData.nama,
            items: activeData.items || [],
            startTime: activeData.start_time,
            payAwal: activeData.pay_awal,
            queueNo: activeData.queue_no
          });
          setLoading(false);
          return;
        }

        // 2. Kalau tidak ada, cek di transactions (sudah selesai)
        const { data: txnData, error: txnErr } = await sb
          .from('transactions')
          .select('*')
          .eq('id', trackingId)
          .single();
          
        if (txnData) {
          setTxn(txnData);
          setLoading(false);
          return;
        }

        // 3. Kalau tidak ada di keduanya
        setError('Sesi tidak ditemukan atau sudah dihapus.');
      } catch (err) {
        console.error('Tracking fetch error:', err);
        setError('Gagal memuat status. Pastikan koneksi internet stabil.');
      }
      setLoading(false);
    };

    fetchStatus();
  }, [trackingId]);

  // Live timer tick
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <div className="spinner-border text-info" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center p-4 text-center" style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'white' }}>
        <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '3rem' }}></i>
        <h4 className="mb-2">Oops!</h4>
        <p className="text-secondary">{error}</p>
      </div>
    );
  }

  // --- Render Finished Transaction ---
  if (txn) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'white', padding: '20px' }}>
        <div className="card bg-dark border-secondary mx-auto" style={{ maxWidth: '400px' }}>
          <div className="card-header border-secondary text-center bg-success text-white py-3">
            <i className="bi bi-check-circle-fill d-block mb-2" style={{ fontSize: '2.5rem' }}></i>
            <h5 className="mb-0">Sewa Selesai</h5>
          </div>
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <h3 className="mb-1">{txn.nama}</h3>
              <span className="badge bg-secondary">Txn: #{txn.no}</span>
            </div>
            
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Tanggal</span>
              <span>{txn.tanggal}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Waktu</span>
              <span>
                {new Date(txn.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - 
                {new Date(txn.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="d-flex justify-content-between mb-3">
              <span className="text-secondary">Item</span>
              <span className="text-end" style={{ maxWidth: '60%' }}>{txn.items}</span>
            </div>
            
            <hr className="border-secondary" />
            
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Overtime</span>
              <span className={txn.ot_dur === '-' ? '' : 'text-warning'}>{txn.ot_dur}</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span className="text-secondary">Denda OT</span>
              <span>{fmtRp(txn.total_ot)}</span>
            </div>
            
            <hr className="border-secondary" />
            
            <div className="d-flex justify-content-between fw-bold fs-5">
              <span>Total Akhir</span>
              <span className="text-info">{fmtRp(txn.total_all)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Active Session ---
  const elapsedSec = Math.floor((now - session.startTime) / 1000);
  const elapsedMin = elapsedSec / 60;
  
  // Calculate OT status
  let isOvertime = false;
  let estimatedOT = 0;
  
  session.items.forEach(it => {
    const def = ITEMS.find(item => item.code === it.code);
    if (!def) return;
    const limitMin = def.isPackage ? def.packageHours * 60 : 60;
    const otCost = calcOTCost(elapsedMin, limitMin, def, it.qty);
    if (otCost > 0) {
      isOvertime = true;
      estimatedOT += otCost;
    }
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'white', padding: '20px' }}>
      <div className="card border-secondary mx-auto" style={{ maxWidth: '400px', background: '#1e1e24' }}>
        
        <div className={`card-header border-secondary text-center text-white py-3 ${isOvertime ? 'bg-danger' : 'bg-primary'}`}>
          <i className={`bi ${isOvertime ? 'bi-alarm-fill' : 'bi-stopwatch'} d-block mb-2`} style={{ fontSize: '2.5rem' }}></i>
          <h5 className="mb-0">{isOvertime ? 'Waktu Habis (Overtime)' : 'Sewa Sedang Berjalan'}</h5>
        </div>
        
        <div className="card-body p-4 text-center">
          <h2 className="mb-1 text-info">{session.nama}</h2>
          <div className="mb-4 text-secondary small">
            Mulai: {new Date(session.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="timer-display mb-4 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-secondary mb-1 small">Waktu Berjalan</div>
            <div className="display-3 fw-bold font-monospace" style={{ color: isOvertime ? 'var(--orange)' : 'var(--green)', letterSpacing: '-2px' }}>
              {fmtDur(elapsedSec)}
            </div>
          </div>
          
          <div className="text-start mb-4">
            <div className="text-secondary small mb-2 border-bottom border-secondary pb-1">Item yang Disewa</div>
            {session.items.map((it, idx) => {
              const def = ITEMS.find(item => item.code === it.code);
              return (
                <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                  <span>{def ? def.emoji : ''} {def ? def.name : it.code}</span>
                  <span className="badge bg-secondary rounded-pill">x{it.qty}</span>
                </div>
              );
            })}
          </div>
          
          {isOvertime && (
            <div className="alert alert-danger text-start py-2 px-3 mb-0">
              <div className="d-flex justify-content-between align-items-center fw-bold">
                <span><i className="bi bi-exclamation-triangle-fill me-2"></i>Estimasi Denda:</span>
                <span>{fmtRp(estimatedOT)}</span>
              </div>
            </div>
          )}
          
        </div>
      </div>
      
      <div className="text-center mt-4 text-secondary small">
        &copy; {new Date().getFullYear()} Evren House
      </div>
    </div>
  );
}

export default TrackingPage;
