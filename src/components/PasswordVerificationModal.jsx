import React, { useState } from 'react';

function PasswordVerificationModal({ adminPassword, onVerifySuccess, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleVerify = () => {
    if (password === adminPassword) {
      setError(false);
      onVerifySuccess();
    } else {
      setError(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-sm modal-dialog modal-dialog-centered">
        <div className="modal-content cmodal">
          <div className="modal-header cmodal-head">
            <h5 className="modal-title"><i className="bi bi-shield-lock-fill me-2"></i>Verifikasi Admin</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <input 
              type="password" 
              className="cfield w-100 mb-2" 
              placeholder="Masukkan password..." 
              style={{ paddingLeft: '12px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button className="btn-start w-100" onClick={handleVerify}>Masuk</button>
            {error && <p className="text-danger small mt-2 mb-0">❌ Password salah!</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordVerificationModal;
