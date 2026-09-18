import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBar from '../components/StatusBar.jsx';
import TopBar from '../components/TopBar.jsx';
import BottomTabBar from '../components/BottomTabBar.jsx';
import { getUser } from '../api/client.js';
import { logout } from '../api/auth.js';
import { useResponsive } from '../hooks/useResponsive.js';

function InfoRow({ label, value, last }) {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: last ? 'none' : '1px solid var(--border-tertiary)' }}>
      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-primary)', borderRadius: 16, border: '1px solid var(--border-tertiary)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-tertiary)', background: 'var(--bg-secondary)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const user = getUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  const initials = user?.name ? user.name.slice(0, 2) : 'CB';

  const content = (
    <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Avatar card */}
      <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: '24px 20px', border: '1px solid var(--border-tertiary)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{user?.name || '사용자'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user?.email || ''}</div>
          {user?.role && (
            <div style={{ display: 'inline-block', marginTop: 6, background: '#E1F5EE', color: '#1D9E75', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
              {user.role}
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      <Section title="계정 정보">
        <InfoRow label="이름" value={user?.name || '—'} />
        <InfoRow label="이메일" value={user?.email || '—'} />
        <InfoRow label="역할" value={user?.role || '점검사'} last />
      </Section>

      {/* App info */}
      <Section title="앱 정보">
        <InfoRow label="버전" value="1.0.0" />
        <InfoRow label="탐지 모델" value="YOLOv8 CrackBot" last />
      </Section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="btn-secondary"
        style={{ opacity: loggingOut ? 0.7 : 1 }}
      >
        {loggingOut ? '로그아웃 중...' : '로그아웃'}
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        <TopBar title="내 정보" />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center', padding: '40px 24px' }}>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', minHeight: 0 }}>
      <StatusBar />
      <TopBar title="내 정보" />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {content}
      </div>
      <BottomTabBar />
    </div>
  );
}
