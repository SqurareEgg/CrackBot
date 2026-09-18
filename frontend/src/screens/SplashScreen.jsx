import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import { getToken } from '../api/client.js';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      navigate(getToken() ? '/home' : '/login');
    }, 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', gap: 16, padding: '0 40px' }}>
      <Logo size={64} />
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.5 }}>CrackBot AI</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>건축물 안전점검 자동화</p>
      </div>
      <div style={{ marginTop: 32, width: 80 }}>
        <div style={{ height: 3, background: 'var(--border-tertiary)', borderRadius: 99 }}>
          <div style={{ height: 3, width: '60%', borderRadius: 99, background: '#1D9E75' }} />
        </div>
      </div>
    </div>
  );
}
