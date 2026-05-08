import React, { useState } from 'react';
import { useLMAuth } from '../context/LMAuthContext';
import { useNavigate } from 'react-router-dom';

export default function LMLoginPage() {
  const { login } = useLMAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lm-login-page" style={{ minHeight: '100vh', display: 'flex', background: '#0d1117', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Left Panel */}
      <div className="lm-login-hero" style={{ flex: '0 0 480px', background: '#0d1117', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', borderRight: '1px solid #2d3748', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,184,166,0.06) 0%, transparent 70%)' }} />

        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{ width: '36px', height: '36px', background: '#f59e0b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Mono, monospace', fontWeight: '700', fontSize: '13px', color: '#0d1117' }}>LM</div>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#f0f4f8', letterSpacing: '-0.3px' }}>LM Hospital</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: '#f0f4f8', lineHeight: '1.2', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Patient care,<br /><span style={{ color: '#f59e0b' }}>precisely managed.</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>Integrated management across patients, appointments, medical records, and billing — all in one secure platform.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { icon: '⬡', label: 'Patient Records', desc: 'Centralized health data' },
            { icon: '◷', label: 'Appointments', desc: 'Smart scheduling' },
            { icon: '⊞', label: 'Medical Records', desc: 'Diagnosis & prescriptions' },
            { icon: '◈', label: 'Billing', desc: 'Invoice management' },
          ].map((f) => (
            <div key={f.label} style={{ background: '#161b22', border: '1px solid #2d3748', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '18px', marginBottom: '6px', color: '#f59e0b' }}>{f.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8' }}>{f.label}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="lm-login-form-shell" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div className="lm-login-form-card" style={{ width: '100%', maxWidth: '380px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#f0f4f8', marginBottom: '6px' }}>Sign in</h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '32px' }}>Access your hospital dashboard</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <input type="text" placeholder="Enter username or email" value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Password</label>
              <input type="password" placeholder="Enter password" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#ef4444', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '14px' }} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: '16px', height: '16px' }} /> Signing in...</> : 'Sign in →'}
            </button>
          </form>

          <p style={{ marginTop: '24px', color: '#64748b', fontSize: '12px', lineHeight: 1.5 }}>
            Accounts are created by the administrator from Staff Management.
          </p>
        </div>
      </div>
    </div>
  );
}
