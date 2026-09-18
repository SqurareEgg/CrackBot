import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import Logo from '../components/Logo.jsx';
import { login } from '../api/auth.js';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetMsg, setShowResetMsg] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('이메일 또는 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const isFirstLogin = !localStorage.getItem('onboarding_done');
      navigate(isFirstLogin ? '/permissions' : '/home');
    } catch (e) {
      setError(e.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '32px 24px 40px', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <Logo size={36} />
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>CrackBot AI</span>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>로그인</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>계정에 로그인하세요</p>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            placeholder="이메일 주소 입력"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: error ? '1.5px solid var(--border-danger)' : '1.5px solid var(--border-secondary)',
              borderRadius: 12,
              fontSize: 15,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            비밀번호
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder="비밀번호 입력"
              style={{
                width: '100%',
                padding: '12px 44px 12px 14px',
                border: error ? '1.5px solid var(--border-danger)' : '1.5px solid var(--border-secondary)',
                borderRadius: 12,
                fontSize: 15,
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', fontSize: 13 }}
            >
              {showPw ? '숨김' : '표시'}
            </button>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--text-danger)', marginBottom: 12, marginTop: 4 }}>{error}</p>
        )}

        <div style={{ textAlign: 'right', marginBottom: 24 }}>
          <button
            onClick={() => { setShowResetMsg(true); setTimeout(() => setShowResetMsg(false), 4000); }}
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--primary)', cursor: 'pointer' }}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        {showResetMsg && (
          <div style={{ background: '#E1F5EE', border: '1px solid #A3D9C6', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1a6b50' }}>
            관리자(admin@crackbot.ai)에게 문의하여 비밀번호를 재설정해주세요.
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleLogin}
          disabled={loading}
          style={{ marginBottom: 20, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </div>
      </div>
    </div>
  );
}
